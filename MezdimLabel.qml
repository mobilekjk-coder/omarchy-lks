import QtQuick

Row {
  id: root
  spacing: 0

  property string text: ""
  property color color: "white"
  property string fontFamily: ""
  property int fontSize: 12
  property bool fontBold: false
  property int elideWidth: -1
  property bool wrap: false

  width: elideWidth > 0 ? elideWidth : implicitWidth
  clip: false

  signal mezdimEntered()
  signal mezdimExited()

  function partsOf(value) {
    var s = String(value || "")
    var needle = "Mezdim"
    var out = []
    var start = 0
    var i = s.indexOf(needle)
    while (i !== -1) {
      if (i > start)
        out.push({ text: s.substring(start, i), hot: false })
      out.push({ text: needle, hot: true })
      start = i + needle.length
      i = s.indexOf(needle, start)
    }
    if (start < s.length)
      out.push({ text: s.substring(start), hot: false })
    if (!out.length)
      out.push({ text: s, hot: false })
    return out
  }

  readonly property var segments: root.partsOf(root.text)

  Repeater {
    model: root.segments

    Text {
      required property var modelData
      text: modelData.text
      color: root.color
      font.family: root.fontFamily
      font.pixelSize: root.fontSize
      font.bold: root.fontBold
      font.underline: hover.containsMouse && modelData.hot
      width: {
        if (root.wrap && root.segments.length === 1) return root.width
        if (!root.wrap && root.elideWidth > 0 && root.segments.length === 1) return root.width
        return implicitWidth
      }
      wrapMode: root.wrap ? Text.Wrap : Text.NoWrap
      elide: (!root.wrap && root.elideWidth > 0 && root.segments.length === 1) ? Text.ElideRight : Text.ElideNone

      MouseArea {
        id: hover
        anchors.fill: parent
        enabled: modelData.hot
        hoverEnabled: modelData.hot
        cursorShape: modelData.hot ? Qt.PointingHandCursor : Qt.ArrowCursor
        onEntered: root.mezdimEntered()
        onExited: root.mezdimExited()
      }
    }
  }
}
