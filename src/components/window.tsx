import * as React from "react"
import * as firebase from "firebase"
import { WindowProps } from "./app"
import { DragType } from "./workspace"

export interface WindowIframeComponentProps {
  src: string | undefined
}

export interface WindowIframeComponentState {
}

export class WindowIframeComponent extends React.Component<WindowIframeComponentProps, WindowIframeComponentState> {

  constructor (props:WindowIframeComponentProps) {
    super(props);
    this.loaded = this.loaded.bind(this)
    this.state = {}
  }

  refs: {
    iframe: HTMLIFrameElement
  }

  loaded() {
  }

  shouldComponentUpdate() {
    return false
  }

  render() {
    return <iframe ref='iframe' src={this.props.src} onLoad={this.loaded}></iframe>
  }
}

export interface WindowComponentProps {
  id: string
  window: WindowProps
  top: boolean
  moveWindowToTop: (key:string) => void
  registerDragWindow: (windowId:string|null, type:DragType) => void
  propsRef: firebase.database.Reference
}
export interface WindowComponentState {
}

export class WindowComponent extends React.Component<WindowComponentProps, WindowComponentState> {
  windowRef: firebase.database.Reference

  constructor (props:WindowComponentProps) {
    super(props)
    this.state = {
    }

    this.windowRef = this.props.propsRef.child(this.props.id)

    this.handleMoveWindowToTop = this.handleMoveWindowToTop.bind(this)
    this.handleDragWindow = this.handleDragWindow.bind(this)
    this.handleDragRight = this.handleDragRight.bind(this)
    this.handleDragBottom = this.handleDragBottom.bind(this)
    this.handleDragBoth = this.handleDragBoth.bind(this)
  }

  refs: {
    window: HTMLDivElement
  }

  getDragContainer() {
    let container = this.refs.window.parentElement
    while (container && (container.className.indexOf("non-minimized") !== -1 )) {
      container = container.parentElement
    }
    return container
  }

  handleMoveWindowToTop() {
    this.props.moveWindowToTop(this.props.id)
  }

  handleDragWindow(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.Position)
  }

  handleDragRight(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowRight)
  }

  handleDragBottom(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowDown)
  }

  handleDragBoth(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowBoth)
  }

  renderIframeOverlay() {
    if (this.props.top) {
      return null
    }
    return <div className="iframe-overlay" onClick={this.handleMoveWindowToTop}></div>
  }

  render() {
    const {window, top, id} = this.props
    const windowStyle = {
      top: window.top,
      width: window.width,
      left: window.left,
      height: window.height
    }
    const titlebarClass = `titlebar${top ? " top" : ""}`

    return (
      <div className="window" ref="window" key={id} style={windowStyle}>
        <div
          className={titlebarClass}
          onMouseDown={(e) => top ? this.handleDragWindow(e) : null}
          onClick={(e) => top ? null : this.handleMoveWindowToTop()}
        >
          <div className="title">{window.title}</div>
        </div>
        <div className="iframe">
          <WindowIframeComponent key={id} src={window.url} />
        </div>
        {this.renderIframeOverlay()}
        <div className="right-drag" onMouseDown={this.handleDragRight} />
        <div className="bottom-drag" onMouseDown={this.handleDragBottom} />
        <div className="both-drag" onMouseDown={this.handleDragBoth} />
      </div>
    )
  }
}