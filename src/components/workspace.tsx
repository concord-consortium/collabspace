import * as React from "react"
import * as firebase from "firebase"
import { DocumentInfo, WindowProps, WindowPropsMap, WindowState } from "./app"
import { WindowComponent } from "./window"
import { MinimizedWindowComponent } from "./minimized-window"

export interface WorkspaceComponentProps {
  authUser: firebase.User
  documentRef: firebase.database.Reference
}
export interface WorkspaceComponentState {
  readonly: boolean
  documentInfo: DocumentInfo|null
  windowProps: WindowPropsMap
  windowOrder: string[]
}

export enum DragType { GrowRight, GrowDown, GrowBoth, Position, None }
export interface DragInfo {
  windowId: string|null
  windowRef: firebase.database.Reference|null
  start?: {
    x: number
    y: number
    top: number
    left: number
    width: number
    height: number
  }
  type: DragType
}

export class WorkspaceComponent extends React.Component<WorkspaceComponentProps, WorkspaceComponentState> {
  infoRef: firebase.database.Reference
  propsRef: firebase.database.Reference
  orderRef: firebase.database.Reference
  dragInfo: DragInfo

  constructor (props:WorkspaceComponentProps) {
    super(props)
    this.state = {
      readonly: false,
      documentInfo: null,
      windowProps: {},
      windowOrder: []
    }

    this.dragInfo = {windowId: null, windowRef: null, type: DragType.None}

    this.moveWindowToTop = this.moveWindowToTop.bind(this)
    this.closeWindow = this.closeWindow.bind(this)
    this.restoreMinimizedWindow = this.restoreMinimizedWindow.bind(this)
    this.setWindowState = this.setWindowState.bind(this)

    this.handleDrop = this.handleDrop.bind(this)
    this.handleDragOver = this.handleDragOver.bind(this)
    this.handleAddDrawingButton = this.handleAddDrawingButton.bind(this)
    this.handleInfoChange = this.handleInfoChange.bind(this)
    this.handlePropsChange = this.handlePropsChange.bind(this)
    this.handleOrderChange = this.handleOrderChange.bind(this)
    this.registerDragWindow = this.registerDragWindow.bind(this)
    this.handleWindowMouseDown = this.handleWindowMouseDown.bind(this)
    this.handleWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.handleWindowMouseUp = this.handleWindowMouseUp.bind(this)
  }

  componentWillMount() {
    this.infoRef = this.props.documentRef.child("info")
    this.propsRef = this.props.documentRef.child("data/windows/props")
    this.orderRef = this.props.documentRef.child("data/windows/order")

    this.infoRef.on("value", this.handleInfoChange)
    this.propsRef.on("value", this.handlePropsChange)
    this.orderRef.on("value", this.handleOrderChange)

    window.addEventListener("mousedown", this.handleWindowMouseDown)
    window.addEventListener("mousemove", this.handleWindowMouseMove, true)
    window.addEventListener("mouseup", this.handleWindowMouseUp, true)
  }

  componentWillUnmount() {
    this.infoRef.off("value", this.handleInfoChange)
    this.propsRef.off("value", this.handlePropsChange)
    this.orderRef.off("value", this.handleOrderChange)

    window.removeEventListener("mousedown", this.handleWindowMouseDown)
    window.removeEventListener("mousemove", this.handleWindowMouseMove, true)
    window.removeEventListener("mouseup", this.handleWindowMouseUp, true)
  }

  handleInfoChange(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot) {
      const documentInfo:DocumentInfo|null = snapshot.val()
      const readonly = documentInfo ? documentInfo.ownerId !== this.props.authUser.uid : false
      this.setState({documentInfo, readonly})
    }
  }

  handlePropsChange(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot) {
      this.setState({windowProps: snapshot.val() || {}})
    }
  }

  handleOrderChange(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot) {
      this.setState({windowOrder: snapshot.val() || []})
    }
  }

  registerDragWindow(windowId:string|null, type:DragType=DragType.None) {
    this.dragInfo.windowId = windowId
    this.dragInfo.windowRef = windowId ? this.propsRef.child(windowId) : null
    this.dragInfo.type = type
  }

  handleWindowMouseDown(e:MouseEvent) {
    const {dragInfo} = this
    const win = dragInfo.windowId ? this.state.windowProps[dragInfo.windowId] : null
    if (win) {
      dragInfo.start = {
        x: e.clientX,
        y: e.clientY,
        top: win.top,
        left: win.left,
        width: win.width,
        height: win.height
      }
    }
  }

  handleWindowMouseMove(e:MouseEvent) {
    const {dragInfo} = this
    if (dragInfo.type !== DragType.None) {
      e.preventDefault()
      e.stopPropagation()
      const win = dragInfo.windowId ? this.state.windowProps[dragInfo.windowId] : null
      if (win && dragInfo.windowRef && dragInfo.start) {
        const [dx, dy] = [e.clientX - dragInfo.start.x, e.clientY - dragInfo.start.y]
        switch (dragInfo.type) {
          case DragType.Position:
            win.top = Math.max(0, dragInfo.start.top + dy)
            win.left = Math.max(0, dragInfo.start.left + dx)
            break;
          case DragType.GrowRight:
            win.width = dragInfo.start.width + dx
            break;
          case DragType.GrowDown:
            win.height = dragInfo.start.height + dy
            break;
          case DragType.GrowBoth:
            win.width = dragInfo.start.width + dx
            win.height = dragInfo.start.height + dy
            break;
        }
        dragInfo.windowRef.set(win)
      }
    }
  }

  handleWindowMouseUp(e:MouseEvent) {
    if (this.dragInfo.type !== DragType.None) {
      e.preventDefault()
      e.stopPropagation()
      this.registerDragWindow(null, DragType.None)
    }
  }

  addWindow(url: string, title:string) {
    const randInRange = (min:number, max:number) => {
      return Math.round(min + (Math.random() * (max - min)))
    }

    const win:WindowProps = {
      top: randInRange(50, 200),
      left: randInRange(50, 200),
      width: 400,
      height: 400,
      state: "normal",
      url,
      title,
    }
    const ref = this.propsRef.push(win)
    if (ref.key) {
      this.moveWindowToTop(ref.key)
    }
  }

  moveWindowToTop(key:string) {
    this.orderRef.once("value", (snapshot) => {
      const order:string[] = snapshot.val() || []
      const index = order.indexOf(key)
      if (index !== -1) {
        order.splice(index, 1)
      }
      order.push(key)
      this.orderRef.set(order)
    })
  }

  closeWindow(key:string) {
    this.orderRef.once("value", (snapshot) => {
      const order:string[] = snapshot.val() || []
      const index = order.indexOf(key)
      if (index !== -1) {
        order.splice(index, 1)
      }
      this.orderRef.set(order)
    })
    this.propsRef.child(key).set(null)
  }

  setWindowState(key:string, state:WindowState) {
    const win = this.state.windowProps[key]
    if (win) {
      win.state = state
      this.propsRef.child(key).set(win)
    }
  }

  restoreMinimizedWindow(id:string) {
    const win = this.state.windowProps[id]
    if (win) {
      win.state = "normal"
      this.propsRef.child(id).set(win)
      this.moveWindowToTop(id)
    }
  }

  handleDragOver(e:React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  handleDrop(e:React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const [url, ...rest] = e.dataTransfer.getData("text/uri-list").split("\n")
    if (url) {
      this.addWindow(url, "Untitled")
    }
  }

  handleAddDrawingButton() {
    this.addWindow(`${window.location.origin}/drawing.html`, "Untitled Drawing")
  }

  renderDocumentInfo() {
    const {documentInfo} = this.state
    if (!documentInfo) {
      return null
    }
    return (
      <div className="document-info">
        <div className="document-name">{documentInfo.name}</div>
        <div className="instance-info">Template</div>
      </div>
    )
  }

  renderHeader() {
    const {authUser} = this.props
    return (
      <div className="header">
        {this.renderDocumentInfo()}
        <div className="user-info">
          <div className="user-name">{authUser.isAnonymous ? "Anonymous User" : authUser.displayName }</div>
        </div>
      </div>
    )
  }

  renderReadonlyToolbar() {
    return (
      <div className="readonly-message">
        View only.  You do not have edit access to this template.
      </div>
    )
  }

  renderToolbarButtons() {
    return (
      <div className="buttons">
        <button type="button" onClick={this.handleAddDrawingButton}>Add Drawing</button>
      </div>
    )
  }

  renderToolbar() {
    return (
      <div className="toolbar">
        {this.state.readonly ? this.renderReadonlyToolbar() : this.renderToolbarButtons()}
      </div>
    )
  }

  renderNonMinimizedWindows(ids:string[]) {
    const {windowProps} = this.state
    const windows:JSX.Element[] = []
    ids.forEach((id, index) => {
      const window = windowProps[id]
      const top = index === ids.length - 1
      if (window) {
        windows.push(
          <WindowComponent
            key={id}
            id={id}
            window={window}
            top={top}
            moveWindowToTop={this.moveWindowToTop}
            closeWindow={this.closeWindow}
            registerDragWindow={this.registerDragWindow}
            setWindowState={this.setWindowState}
          />)
      }
    })
    return windows
  }

  renderMinimizedWindows(ids:string[]) {
    if (ids.length === 0) {
      return null
    }
    const {windowProps} = this.state
    const windows:JSX.Element[] = []
    ids.forEach((id, index) => {
      const window = windowProps[id]
      if (window) {
        windows.push(
          <MinimizedWindowComponent
            id={id}
            key={id}
            title={window.title}
            restoreMinimizedWindow={this.restoreMinimizedWindow}
          />)
      }
    })
    return (
      <div className="minimized">{windows}</div>
    )
  }

  renderWindowArea() {
    const {windowOrder, windowProps} = this.state
    const minimizedWindowIds:string[] = []
    const nonMinimizedWindowIds:string[] = []

    windowOrder.forEach((id) => {
      const win = windowProps[id]
      if (win) {
        if (win.state === "minimized") {
          minimizedWindowIds.push(id)
        }
        else {
          nonMinimizedWindowIds.push(id)
        }
      }
    })

    const nonMinimizedClassName = `non-minimized${minimizedWindowIds.length > 0 ? " with-minimized" : ""}`

    return (
      <div className="window-area">
        <div className={nonMinimizedClassName}>
          <div className="debug">
            {JSON.stringify({
              order: this.state.windowOrder,
              props: this.state.windowProps
            }, null, 2)}
          </div>
          {this.renderNonMinimizedWindows(nonMinimizedWindowIds)}
        </div>
        {this.renderMinimizedWindows(minimizedWindowIds)}
      </div>
    )
  }

  render() {
    return (
      <div className="workspace" onDrop={this.handleDrop} onDragOver={this.handleDragOver}>
        {this.renderHeader()}
        {this.renderToolbar()}
        {this.renderWindowArea()}
      </div>
    )
  }
}