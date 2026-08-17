import QtQuick
import Quickshell
import Quickshell.Io
import qs.Commons
import qs.Ui
import "Model.js" as Model

Panel {
  id: root
  moduleName: "kjk.lks"
  ipcTarget: "kjk.lks"
  manageIpc: false

  property var anchorItem: null
  property var hostWidget: null
  readonly property var barIdentity: hostWidget || root

  property var snapshot: Model.emptySnapshot()
  property bool loading: false
  property string fetchError: ""

  readonly property bool vertical: bar ? bar.vertical : false
  readonly property string pluginDir: {
    var url = String(Qt.resolvedUrl("."))
    return url.replace(/^file:\/\//, "").replace(/\/$/, "")
  }
  readonly property string cachePath: Quickshell.env("HOME") + "/.local/state/omarchy/kjk.lks/cache.json"
  readonly property string sourcePref: String(setting("source", "auto") || "auto")
  readonly property string sectionId: String(setting("section", "football-men") || "football-men")
  readonly property bool includeFriendlies: setting("includeFriendlies", false) === true
  readonly property int refreshMinutes: Math.max(5, parseInt(setting("refreshMinutes", 15), 10) || 15)
  readonly property var nowMs: clock.date.getTime()

  readonly property var nextEvent: Model.pickNext(snapshot.events, nowMs, includeFriendlies)
  readonly property var lastEvent: Model.pickLast(snapshot.events, nowMs, includeFriendlies)
  readonly property var upcoming: Model.upcomingEvents(snapshot.events, nowMs, includeFriendlies, 5)
  readonly property var laterEvents: upcoming.slice(1)
  readonly property var tableRows: Model.tableWindow(snapshot.table, 2)
  readonly property var usRow: Model.ourStanding(snapshot.table)

  readonly property string label: root.vertical
    ? Model.barLabelVertical(snapshot, nowMs, includeFriendlies)
    : Model.barLabel(snapshot, nowMs, includeFriendlies)

  readonly property color contentForeground: bar ? bar.foreground : Color.foreground
  readonly property string contentFontFamily: bar ? bar.fontFamily : Style.font.family

  function open() {
    openedFromHotkey = false
    setCenterHoverRevealSuppressed(false)
    root.controller.show()
    root.refresh()
  }

  function openFromHotkey() {
    openedFromHotkey = true
    root.controller.show()
    root.refresh()
    Qt.callLater(function() {
      if (root.opened) setCenterHoverRevealSuppressed(true)
    })
  }

  property bool openedFromHotkey: false

  function close() {
    setCenterHoverRevealSuppressed(false)
    root.controller.hide()
  }

  function toggle() {
    if (root.opened) root.close()
    else root.openFromHotkey()
  }

  function switchPanel(direction) {
    if (root.bar && typeof root.bar.switchPanelFrom === "function")
      return root.bar.switchPanelFrom(root.barIdentity, direction)
    return false
  }

  function setCenterHoverRevealSuppressed(value) {
    if (root.bar && "centerHoverRevealSuppressed" in root.bar)
      root.bar.centerHoverRevealSuppressed = value
  }

  function applyBundle(raw) {
    var parsed = Model.parseBundle(JSON.parse(String(raw || "{}")), Date.now())
    if (parsed.ok) {
      root.snapshot = parsed
      root.fetchError = ""
      cacheFile.setText(JSON.stringify(parsed) + "\n")
    } else {
      root.fetchError = parsed.error || "fetch failed"
      if (!root.snapshot.ok) root.snapshot = parsed
    }
  }

  function refresh() {
    if (fetchProc.running) return
    root.loading = true
    fetchProc.command = ["python3", root.pluginDir + "/fetch.py", "--section", root.sectionId, "--source", root.sourcePref]
    fetchProc.running = true
  }

  function notifyNext() {
    var event = root.nextEvent || root.lastEvent
    if (!root.bar) return
    var summary = Model.notifySummary(event)
    var body = Model.notifyBody(event, root.snapshot.table)
    root.bar.run("omarchy-notification-send " + shellQuote(summary) + " " + shellQuote(body))
  }

  function shellQuote(value) {
    return "'" + String(value || "").replace(/'/g, "'\\''") + "'"
  }

  function scoreColor(event) {
    var result = Model.resultForUs(event)
    if (result === "W") return Color.accent
    if (result === "L") return Qt.darker(root.contentForeground, 1.4)
    return root.contentForeground
  }

  SystemClock {
    id: clock
    precision: SystemClock.Minutes
  }

  FileView {
    id: cacheFile
    path: root.cachePath
    watchChanges: true
    printErrors: false
    onFileChanged: reload()
    onLoaded: {
      var cached = Model.parseCache(text(), Date.now())
      if (cached.ok) root.snapshot = cached
    }
  }

  Process {
    id: mkdirProc
    command: ["mkdir", "-p", Quickshell.env("HOME") + "/.local/state/omarchy/kjk.lks"]
  }

  Process {
    id: fetchProc
    stdout: StdioCollector {
      waitForEnd: true
      onStreamFinished: {
        root.loading = false
        var raw = String(text || "").trim()
        if (!raw) {
          root.fetchError = "empty response"
          return
        }
        try {
          root.applyBundle(raw)
        } catch (e) {
          root.fetchError = "parse failed"
        }
      }
    }
    onExited: function(exitCode) {
      if (exitCode !== 0 && root.loading) root.loading = false
    }
  }

  Timer {
    interval: root.refreshMinutes * 60 * 1000
    running: true
    repeat: true
    triggeredOnStart: true
    onTriggered: root.refresh()
  }

  Component.onCompleted: {
    mkdirProc.running = true
    Qt.callLater(function() { cacheFile.reload() })
  }

  IpcHandler {
    target: root.ipcTarget

    function open(): void { root.openFromHotkey() }
    function close(): void { root.close() }
    function show(): void { root.openFromHotkey() }
    function hide(): void { root.close() }
    function toggle(): void { root.toggle() }
    function refresh(): void { root.refresh() }
  }

  KeyboardPanel {
    id: panel
    anchorItem: root.anchorItem
    owner: root.barIdentity
    bar: root.bar
    open: root.opened
    centerOnBar: true
    focusTarget: keyCatcher
    contentWidth: panel.fittedContentWidth(Style.space(480))
    contentHeight: panel.fittedContentHeight(bodyColumn.implicitHeight)

    PanelKeyCatcher {
      id: keyCatcher
      anchors.fill: parent
      onCloseRequested: root.close()
      onTabRequested: function(direction) { root.switchPanel(direction) }
      onActivateRequested: root.refresh()

      Flickable {
        id: bodyScroll
        anchors.fill: parent
        contentWidth: width
        contentHeight: bodyColumn.implicitHeight
        clip: true
        boundsBehavior: Flickable.StopAtBounds
        interactive: contentHeight > height

        Column {
          id: bodyColumn
          width: bodyScroll.width
          spacing: Style.space(14)

          Item {
            width: parent.width
            height: Math.max(heroLeft.height, heroRight.height)

            Column {
              id: heroLeft
              anchors.left: parent.left
              anchors.leftMargin: Style.space(16)
              anchors.verticalCenter: parent.verticalCenter
              spacing: Style.space(4)

              Text {
                text: root.nextEvent && root.nextEvent.status === "live" ? "NA ŻYWO" : "NASTĘPNY MECZ"
                color: Qt.darker(root.contentForeground, 1.5)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.bodySmall
                font.letterSpacing: 1
              }

              Text {
                text: root.nextEvent ? ("vs " + root.nextEvent.opponent) : "Brak terminu"
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: 26
                font.bold: true
                width: Style.space(280)
                wrapMode: Text.WordWrap
              }

              Text {
                visible: !!root.nextEvent
                text: root.nextEvent ? Model.formatWhenLong(root.nextEvent.kickoffMs) : ""
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.title
              }
            }

            Column {
              id: heroRight
              anchors.right: parent.right
              anchors.rightMargin: Style.space(20)
              anchors.verticalCenter: parent.verticalCenter
              spacing: Style.space(6)

              Text {
                anchors.right: parent.right
                text: root.nextEvent && root.nextEvent.status === "live" ? Model.scoreline(root.nextEvent) : (root.usRow ? (root.usRow.position + ".") : "")
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: 36
                font.bold: true
              }

              Text {
                anchors.right: parent.right
                text: root.nextEvent && root.nextEvent.status === "live" ? "live" : (root.usRow ? (root.usRow.points + " pkt") : "")
                color: Qt.darker(root.contentForeground, 1.4)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.body
              }
            }
          }

          Text {
            visible: !!root.nextEvent
            text: root.nextEvent ? Model.competitionLine(root.nextEvent) : ""
            color: Qt.darker(root.contentForeground, 1.4)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.bodySmall
            leftPadding: Style.space(16)
          }

          Rectangle {
            visible: !!root.lastEvent
            width: parent.width
            height: Style.spacing.hairline
            color: root.contentForeground
            opacity: 0.12
          }

          Column {
            visible: !!root.lastEvent
            width: parent.width
            spacing: Style.space(4)
            leftPadding: Style.space(16)
            rightPadding: Style.space(16)

            PanelSectionHeader {
              text: "OSTATNI WYNIK"
              foreground: root.contentForeground
              fontFamily: root.contentFontFamily
            }

            Row {
              width: parent.width - Style.space(32)
              spacing: Style.space(10)

              Text {
                text: root.lastEvent ? Model.scoreline(root.lastEvent) : ""
                color: root.scoreColor(root.lastEvent)
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.title
                font.bold: true
              }

              Text {
                text: root.lastEvent ? ((root.lastEvent.isHome ? "" : "@ ") + root.lastEvent.opponent) : ""
                color: root.contentForeground
                font.family: root.contentFontFamily
                font.pixelSize: Style.font.body
                anchors.verticalCenter: parent.verticalCenter
                width: parent.width - Style.space(80)
                elide: Text.ElideRight
              }
            }
          }

          Rectangle {
            visible: root.laterEvents.length > 0
            width: parent.width
            height: Style.spacing.hairline
            color: root.contentForeground
            opacity: 0.12
          }

          Column {
            visible: root.laterEvents.length > 0
            width: parent.width
            spacing: Style.space(2)
            leftPadding: Style.space(16)
            rightPadding: Style.space(16)

            PanelSectionHeader {
              text: "NADCHODZĄCE"
              foreground: root.contentForeground
              fontFamily: root.contentFontFamily
            }

            Repeater {
              model: root.laterEvents

              Row {
                required property var modelData
                width: bodyColumn.width - Style.space(32)
                spacing: Style.space(10)
                height: Style.space(28)

                Text {
                  width: Style.space(72)
                  text: Model.formatWhen(modelData.kickoffMs, root.nowMs)
                  color: Qt.darker(root.contentForeground, 1.4)
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.bodySmall
                  anchors.verticalCenter: parent.verticalCenter
                }

                Text {
                  width: parent.width - Style.space(110)
                  text: (modelData.isHome ? "" : "@ ") + modelData.opponent
                  color: root.contentForeground
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.body
                  elide: Text.ElideRight
                  anchors.verticalCenter: parent.verticalCenter
                }

                Text {
                  text: modelData.isHome ? "H" : "A"
                  color: Qt.darker(root.contentForeground, 1.5)
                  font.family: root.contentFontFamily
                  font.pixelSize: Style.font.caption
                  anchors.verticalCenter: parent.verticalCenter
                }
              }
            }
          }

          Rectangle {
            visible: root.tableRows.length > 0
            width: parent.width
            height: Style.spacing.hairline
            color: root.contentForeground
            opacity: 0.12
          }

          Column {
            visible: root.tableRows.length > 0
            width: parent.width
            spacing: Style.space(2)
            leftPadding: Style.space(16)
            rightPadding: Style.space(16)

            PanelSectionHeader {
              text: "TABELA"
              foreground: root.contentForeground
              fontFamily: root.contentFontFamily
            }

            Repeater {
              model: root.tableRows

              Rectangle {
                required property var modelData
                width: bodyColumn.width - Style.space(32)
                height: Style.space(26)
                radius: Math.min(4, Style.cornerRadius)
                color: modelData.isUs ? Style.hoverFillFor(root.contentForeground, Color.accent) : "transparent"

                Row {
                  anchors.fill: parent
                  anchors.leftMargin: Style.space(4)
                  anchors.rightMargin: Style.space(4)
                  spacing: Style.space(8)

                  Text {
                    width: Style.space(24)
                    text: String(modelData.position)
                    color: root.contentForeground
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: modelData.isUs
                    anchors.verticalCenter: parent.verticalCenter
                  }

                  Text {
                    width: parent.width - Style.space(80)
                    text: modelData.isUs ? "ŁKS Łódź" : modelData.name
                    color: root.contentForeground
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: modelData.isUs
                    elide: Text.ElideRight
                    anchors.verticalCenter: parent.verticalCenter
                  }

                  Text {
                    text: String(modelData.points)
                    color: root.contentForeground
                    font.family: root.contentFontFamily
                    font.pixelSize: Style.font.bodySmall
                    font.bold: modelData.isUs
                    anchors.verticalCenter: parent.verticalCenter
                  }
                }
              }
            }
          }

          Text {
            visible: root.loading && !root.snapshot.ok
            text: "Pobieranie terminów…"
            color: Qt.darker(root.contentForeground, 1.5)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.bodySmall
            font.italic: true
            leftPadding: Style.space(16)
          }

          Text {
            visible: root.fetchError !== "" && !root.snapshot.ok
            text: root.fetchError
            color: Qt.darker(root.contentForeground, 1.5)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.bodySmall
            font.italic: true
            leftPadding: Style.space(16)
          }

          Text {
            visible: Model.sourceCaption(root.snapshot) !== ""
            text: Model.sourceCaption(root.snapshot)
            color: Qt.darker(root.contentForeground, 1.6)
            font.family: root.contentFontFamily
            font.pixelSize: Style.font.caption
            leftPadding: Style.space(16)
          }
        }
      }
    }
  }
}
