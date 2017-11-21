import * as React from "react"
import * as firebase from "firebase"
import { FirebaseDocumentInfo, Document } from "../lib/document"
import { Window, FirebaseWindowAttrs, FirebaseWindowAttrsMap } from "../lib/window"
import { WindowComponent } from "./window"
import { MinimizedWindowComponent } from "./minimized-window"
import { InlineEditorComponent } from "./inline-editor"
import { WindowManager, WindowManagerState, DragType } from "../lib/window-manager"
import { v4 as uuidV4} from "uuid"

export interface WorkspaceComponentProps {
  authUser: firebase.User
  document: Document
  setTitle: (documentName?:string|null) => void
}
export interface WorkspaceComponentState extends WindowManagerState {
  documentInfo: FirebaseDocumentInfo|null
  isTemplate: boolean
}

export class WorkspaceComponent extends React.Component<WorkspaceComponentProps, WorkspaceComponentState> {
  infoRef: firebase.database.Reference
  windowManager: WindowManager

  constructor (props:WorkspaceComponentProps) {
    super(props)
    this.state = {
      documentInfo: null,
      isTemplate: false,
      allOrderedWindows: [],
      minimizedWindows: [],
      topWindow: null
    }

    this.changeDocumentName = this.changeDocumentName.bind(this)

    this.handleDrop = this.handleDrop.bind(this)
    this.handleDragOver = this.handleDragOver.bind(this)
    this.handleAddDrawingButton = this.handleAddDrawingButton.bind(this)
    this.handleCreateDemoButton = this.handleCreateDemoButton.bind(this)
    this.handleInfoChange = this.handleInfoChange.bind(this)
    this.handleWindowMouseDown = this.handleWindowMouseDown.bind(this)
    this.handleWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.handleWindowMouseUp = this.handleWindowMouseUp.bind(this)

    this.windowManager = new WindowManager(this.props.document, (newState) => {
      this.setState(newState)
    })
  }

  componentWillMount() {
    this.infoRef = this.props.document.ref.child("info")

    this.infoRef.on("value", this.handleInfoChange)

    window.addEventListener("mousedown", this.handleWindowMouseDown)
    window.addEventListener("mousemove", this.handleWindowMouseMove, true)
    window.addEventListener("mouseup", this.handleWindowMouseUp, true)
  }

  componentWillUnmount() {
    this.infoRef.off("value", this.handleInfoChange)

    window.removeEventListener("mousedown", this.handleWindowMouseDown)
    window.removeEventListener("mousemove", this.handleWindowMouseMove, true)
    window.removeEventListener("mouseup", this.handleWindowMouseUp, true)
  }

  handleInfoChange(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot) {
      const documentInfo:FirebaseDocumentInfo|null = snapshot.val()
      this.setState({documentInfo})
      this.props.setTitle(documentInfo ? documentInfo.name : null)
    }
  }

  handleWindowMouseDown(e:MouseEvent) {
    const {dragInfo} = this.windowManager
    const windowProps = dragInfo.window && dragInfo.window.attrs
    if (windowProps) {
      dragInfo.starting = {
        x: e.clientX,
        y: e.clientY,
        top: windowProps.top,
        left: windowProps.left,
        width: windowProps.width,
        height: windowProps.height
      }
    }
  }

  handleWindowMouseMove(e:MouseEvent) {
    const {dragInfo} = this.windowManager
    if (dragInfo.type !== DragType.None) {
      e.preventDefault()
      e.stopPropagation()
      const {starting} = dragInfo
      const newWindowProps = dragInfo.window && dragInfo.window.attrs
      if (newWindowProps && starting) {
        const [dx, dy] = [e.clientX - starting.x, e.clientY - starting.y]
        switch (dragInfo.type) {
          case DragType.Position:
            newWindowProps.top = Math.max(0, starting.top + dy)
            newWindowProps.left = Math.max(0, starting.left + dx)
            break
          case DragType.GrowLeft:
            newWindowProps.left = Math.max(0, starting.left + dx)
            newWindowProps.width = starting.width - dx
            break
          case DragType.GrowUp:
            newWindowProps.top = Math.max(0, starting.top + dy)
            newWindowProps.height = starting.height - dy
            break
          case DragType.GrowRight:
            newWindowProps.width = starting.width + dx
            break
          case DragType.GrowDown:
            newWindowProps.height = starting.height + dy
            break
          case DragType.GrowDownLeft:
            newWindowProps.left = Math.max(0, starting.left + dx)
            newWindowProps.width = starting.width - dx
            newWindowProps.height = starting.height + dy
            break
          case DragType.GrowDownRight:
            newWindowProps.width = starting.width + dx
            newWindowProps.height = starting.height + dy
            break
        }
        this.windowManager.updateDragWindow(newWindowProps)
      }
    }
  }

  handleWindowMouseUp(e:MouseEvent) {
    const {dragInfo} = this.windowManager
    if (dragInfo.type !== DragType.None) {
      e.preventDefault()
      e.stopPropagation()
      this.windowManager.registerDragWindow(null, DragType.None)
    }
  }

  changeDocumentName(newName: string) {
    if (this.state.documentInfo) {
      this.state.documentInfo.name = newName
      this.infoRef.set(this.state.documentInfo)
    }
  }

  handleDragOver(e:React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  handleDrop(e:React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const [url, ...rest] = e.dataTransfer.getData("text/uri-list").split("\n")
    if (url) {
      this.windowManager.add(url, "Untitled")
    }
  }

  handleAddDrawingButton() {
    this.windowManager.add(`${window.location.origin}/drawing-tool.html`, "Untitled Drawing")
  }

  handleCreateDemoButton() {
    window.open(`${window.location.origin}/#document=${this.props.document.getHashParam()}&demo=${uuidV4()}`)
  }

  renderDocumentInfo() {
    const {documentInfo} = this.state
    if (!documentInfo) {
      return null
    }
    return (
      <div className="document-info">
        <div className="document-name">
          <InlineEditorComponent text={documentInfo.name} changeText={this.changeDocumentName} />
        </div>
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
    const {document} = this.props
    const showDemoButton = document.isTemplate && !document.isReadonly
    return (
      <div className="buttons">
        <div className="left-buttons">
          <button type="button" onClick={this.handleAddDrawingButton}>Add Drawing</button>
        </div>
        <div className="right-buttons">
          {showDemoButton ? <button type="button" onClick={this.handleCreateDemoButton}>Create Demo</button> : null}
        </div>
      </div>
    )
  }

  renderToolbar() {
    return (
      <div className="toolbar">
        {this.props.document.isReadonly ? this.renderReadonlyToolbar() : this.renderToolbarButtons()}
      </div>
    )
  }

  renderAllWindows() {
    const {allOrderedWindows, topWindow} = this.state
    return allOrderedWindows.map((orderedWindow) => {
      const {window} = orderedWindow
      return <WindowComponent
               key={window.id}
               window={window}
               isTopWindow={window === topWindow}
               zIndex={orderedWindow.order}
               windowManager={this.windowManager}
             />
    })
  }

  renderMinimizedWindows() {
    const windows = this.state.minimizedWindows.map((window) => {
      return <MinimizedWindowComponent
               key={window.id}
               window={window}
               windowManager={this.windowManager}
             />
    })
    return (
      <div className="minimized">{windows}</div>
    )
  }

  renderWindowArea() {
    const hasMinmizedWindows = this.state.minimizedWindows.length > 0
    const nonMinimizedClassName = `non-minimized${hasMinmizedWindows ? " with-minimized" : ""}`

    return (
      <div className="window-area">
        <div className={nonMinimizedClassName}>
          {this.renderAllWindows()}
        </div>
        {hasMinmizedWindows ? this.renderMinimizedWindows() : null}
      </div>
    )
  }

  renderReadonlyBlocker() {
    if (this.props.document.isReadonly) {
      return <div className="readonly-blocker" />
    }
    return null
  }

  render() {
    return (
      <div className="workspace" onDrop={this.handleDrop} onDragOver={this.handleDragOver}>
        {this.renderHeader()}
        {this.renderToolbar()}
        {this.renderWindowArea()}
        {this.renderReadonlyBlocker()}
      </div>
    )
  }
}