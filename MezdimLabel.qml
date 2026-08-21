import QtQuick

Item {
  id: root

  property string text: ""
  property color color: "white"
  property string fontFamily: ""
  property int fontSize: 12
  property bool fontBold: false
  property int elideWidth: -1
  property bool wrap: false
  property bool fit: false

  width: elideWidth > 0 ? elideWidth : (fit ? parent.width : label.implicitWidth)
  implicitWidth: label.implicitWidth
  implicitHeight: Math.max(label.implicitHeight, Math.ceil(fontSize * 1.3))
  height: implicitHeight

  signal mezdimEntered()
  signal mezdimExited()

  readonly property bool mezdimHot: String(text).indexOf("Mezdim") !== -1

  Text {
    id: label
    anchors.left: parent.left
    anchors.verticalCenter: parent.verticalCenter
    width: root.width
    text: root.text
    color: root.color
    font.family: root.fontFamily
    font.pixelSize: root.fontSize
    font.bold: root.fontBold
    font.underline: hover.containsMouse && root.mezdimHot
    wrapMode: root.wrap ? Text.Wrap : Text.NoWrap
    fontSizeMode: root.fit && !root.wrap ? Text.HorizontalFit : Text.FixedSize
    minimumPixelSize: Math.max(11, Math.round(root.fontSize * 0.68))
    elide: (!root.fit && !root.wrap && root.elideWidth > 0) ? Text.ElideRight : Text.ElideNone
    maximumLineCount: root.wrap ? 3 : 1
  }

  MouseArea {
    id: hover
    anchors.fill: label
    enabled: root.mezdimHot
    hoverEnabled: root.mezdimHot
    cursorShape: root.mezdimHot ? Qt.PointingHandCursor : Qt.ArrowCursor
    onEntered: if (root.mezdimHot) root.mezdimEntered()
    onExited: if (root.mezdimHot) root.mezdimExited()
  }
}
