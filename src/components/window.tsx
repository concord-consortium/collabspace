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
  zIndex: number
  moveWindowToTop: (key:string) => void
  closeWindow: (key:string) => void
  setWindowState: (key:string, minimized: boolean, maximized: boolean) => void
  registerDragWindow: (windowId:string|null, type:DragType) => void
}
export interface WindowComponentState {
}

export class WindowComponent extends React.Component<WindowComponentProps, WindowComponentState> {
  constructor (props:WindowComponentProps) {
    super(props)
    this.state = {
    }

    this.handleMoveWindowToTop = this.handleMoveWindowToTop.bind(this)
    this.handleDragWindow = this.handleDragWindow.bind(this)
    this.handleDragLeft = this.handleDragLeft.bind(this)
    this.handleDragRight = this.handleDragRight.bind(this)
    this.handleDragTop = this.handleDragTop.bind(this)
    this.handleDragBottom = this.handleDragBottom.bind(this)
    this.handleDragBottomLeft = this.handleDragBottomLeft.bind(this)
    this.handleDragBottomRight = this.handleDragBottomRight.bind(this)
    this.handleMinimize = this.handleMinimize.bind(this)
    this.handleMaximize = this.handleMaximize.bind(this)
    this.handleClose = this.handleClose.bind(this)
  }

  refs: {
    buttons: HTMLDivElement
  }

  handleMoveWindowToTop() {
    this.props.moveWindowToTop(this.props.id)
  }

  handleDragWindow(e:React.MouseEvent<HTMLDivElement>) {
    if (this.props.window.maximized) {
      return
    }

    // ignore button clicks (this down handler gets called before the button click handler)
    const parentElement = (e.target as any).parentElement
    if (parentElement && (parentElement === this.refs.buttons)) {
      return
    }

    if (!this.props.top) {
      this.props.moveWindowToTop(this.props.id)
    }
    this.props.registerDragWindow(this.props.id, DragType.Position)
  }

  handleDragLeft(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowLeft)
  }

  handleDragRight(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowRight)
  }

  handleDragTop(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowUp)
  }

  handleDragBottom(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowDown)
  }

  handleDragBottomLeft(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowDownLeft)
  }

  handleDragBottomRight(e:React.MouseEvent<HTMLDivElement>) {
    this.props.registerDragWindow(this.props.id, DragType.GrowDownRight)
  }

  handleMinimize(e:React.MouseEvent<HTMLSpanElement>) {
    this.props.setWindowState(this.props.id, true, !!this.props.window.maximized)
  }

  handleMaximize(e:React.MouseEvent<HTMLSpanElement>) {
    this.props.setWindowState(this.props.id, false, !this.props.window.maximized)
  }

  handleClose(e:React.MouseEvent<HTMLSpanElement>) {
    if (e.ctrlKey || confirm("Are you sure you want to close the window?")) {
      this.props.closeWindow(this.props.id)
    }
  }

  renderIframeOverlay() {
    if (this.props.top) {
      return null
    }
    return <div className="iframe-overlay" onClick={this.handleMoveWindowToTop}></div>
  }

  renderButtons() {
    return (
      <div className="buttons" ref="buttons">
        <span onClick={this.handleMinimize} title="Minimize Window">-</span>
        <span onClick={this.handleMaximize} title="Maximize Window">+</span>
        <span onClick={this.handleClose} title="Close Window">x</span>
      </div>
    )
  }

  render() {
    const {window, top, id} = this.props
    const {maximized, minimized} = window
    const titlebarClass = `titlebar${top ? " top" : ""}`
    let windowStyle:any = maximized
      ? {top: 0, right: 0, bottom: 0, left: 0, zIndex: this.props.zIndex}
      : {top: window.top, width: window.width, left: window.left, height: window.height, zIndex: this.props.zIndex}

    if (minimized) {
      windowStyle.display = "none"
    }

    return (
      <div className="window" ref="window" key={id} style={windowStyle}>
        <div className={titlebarClass} onMouseDown={this.handleDragWindow}>
          <div className="title">{window.title}</div>
          {this.renderButtons()}
        </div>
        <div className="iframe">
          <WindowIframeComponent key={id} src={window.url} />
        </div>
        {this.renderIframeOverlay()}
        {!maximized ? <div className="left-drag" onMouseDown={this.handleDragLeft} /> : null}
        {!maximized ? <div className="right-drag" onMouseDown={this.handleDragRight} /> : null}
        {!maximized ? <div className="top-drag" onMouseDown={this.handleDragTop} /> : null}
        {!maximized ? <div className="bottom-drag" onMouseDown={this.handleDragBottom} /> : null}
        {!maximized ? <div className="bottom-left-drag" onMouseDown={this.handleDragBottomLeft} /> : null}
        {!maximized ? <div className="bottom-right-drag" onMouseDown={this.handleDragBottomRight} /> : null}
      </div>
    )
  }
}