import * as React from "react"
import * as firebase from "firebase"
import * as queryString from "query-string"

import { FirebaseDocumentInfo, Document } from "../lib/document"
import { Window, FirebaseWindowAttrs, FirebaseWindowAttrsMap } from "../lib/window"
import { WindowComponent } from "./window"
import { MinimizedWindowComponent } from "./minimized-window"
import { InlineEditorComponent } from "./inline-editor"
import { WindowManager, WindowManagerState, DragType } from "../lib/window-manager"
import { v4 as uuidV4} from "uuid"
import { PortalUser, PortalUserMap, PortalActivity, PortalUserConnectionStatusMap, PortalUserConnected, PortalUserDisconnected } from "../lib/auth"
import { AppHashParams } from "./app"
import escapeFirebaseKey from "../lib/escape-firebase-key"

const timeago = require("timeago.js")
const timeagoInstance = timeago()

export interface WorkspaceComponentProps {
  portalUser: PortalUser|null
  firebaseUser: firebase.User
  portalActivity: PortalActivity|null
  document: Document
  setTitle: ((documentName?:string|null) => void)|null
  isTemplate: boolean
  groupRef: firebase.database.Reference|null
  group: number|null
}
export interface WorkspaceComponentState extends WindowManagerState {
  documentInfo: FirebaseDocumentInfo|null
  workspaceName: string
  debugInfo: string
  groupUsers: PortalUserConnectionStatusMap|null
  classUserLookup: PortalUserMap
}

export class WorkspaceComponent extends React.Component<WorkspaceComponentProps, WorkspaceComponentState> {
  infoRef: firebase.database.Reference
  connectedRef: firebase.database.Reference|null
  userRef: firebase.database.Reference|null
  groupUsersRef: firebase.database.Reference|null
  windowManager: WindowManager

  constructor (props:WorkspaceComponentProps) {
    super(props)

    const {portalActivity} = props

    const classUserLookup:PortalUserMap = {}
    if (portalActivity) {
      portalActivity.classInfo.students.forEach((student) => {
        classUserLookup[escapeFirebaseKey(student.email)] = student
      })
    }

    this.state = {
      documentInfo: null,
      allOrderedWindows: [],
      minimizedWindows: [],
      topWindow: null,
      workspaceName: this.getWorkspaceName(portalActivity),
      debugInfo: portalActivity ? `Class ID: ${portalActivity.classInfo.classHash}` : "",
      groupUsers: null,
      classUserLookup: classUserLookup
    }

    this.changeDocumentName = this.changeDocumentName.bind(this)

    this.handleDrop = this.handleDrop.bind(this)
    this.handleDragOver = this.handleDragOver.bind(this)
    this.handleAddDrawingButton = this.handleAddDrawingButton.bind(this)
    this.handleCreateDemoButton = this.handleCreateDemoButton.bind(this)
    this.handleInfoChange = this.handleInfoChange.bind(this)
    this.handleConnected = this.handleConnected.bind(this)
    this.handleGroupUsersChange = this.handleGroupUsersChange.bind(this)
    this.handleWindowMouseDown = this.handleWindowMouseDown.bind(this)
    this.handleWindowMouseMove = this.handleWindowMouseMove.bind(this)
    this.handleWindowMouseUp = this.handleWindowMouseUp.bind(this)
  }

  getWorkspaceName(portalActivity:PortalActivity|null) {
    if (!portalActivity) {
      return "Template"
    }
    const {classInfo, isDemo} = portalActivity
    const teacherNames = classInfo.teachers.map((teacher) => isDemo ? teacher.fullName : teacher.lastName)
    const domain = isDemo ? "" : `: ${portalActivity.domain}`
    return `${classInfo.name}: ${teacherNames.join(" & ")}${domain}`
  }

  componentWillMount() {
    this.windowManager = new WindowManager(this.props.document, (newState) => {
      this.setState(newState)
    })

    this.infoRef = this.props.document.ref.child("info")
    this.infoRef.on("value", this.handleInfoChange)

    const {groupRef, portalUser} = this.props
    if (groupRef) {
      this.groupUsersRef = groupRef.child("users")
      this.groupUsersRef.on("value", this.handleGroupUsersChange)

      if (portalUser && portalUser.type === "student") {
        this.userRef = this.groupUsersRef.child(escapeFirebaseKey(portalUser.email))
        this.connectedRef = firebase.database().ref(".info/connected")
        this.connectedRef.on("value", this.handleConnected)
      }
    }

    window.addEventListener("mousedown", this.handleWindowMouseDown)
    window.addEventListener("mousemove", this.handleWindowMouseMove, true)
    window.addEventListener("mouseup", this.handleWindowMouseUp, true)
  }

  componentWillUnmount() {
    this.windowManager.destroy()

    this.infoRef.off("value", this.handleInfoChange)
    this.connectedRef && this.connectedRef.off("value", this.handleConnected)
    this.groupUsersRef && this.groupUsersRef.off("value", this.handleGroupUsersChange)

    window.removeEventListener("mousedown", this.handleWindowMouseDown)
    window.removeEventListener("mousemove", this.handleWindowMouseMove, true)
    window.removeEventListener("mouseup", this.handleWindowMouseUp, true)
  }

  handleConnected(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot && snapshot.val() && this.userRef) {
      const connected:PortalUserConnected = {
        connected: true,
        connectedAt: firebase.database.ServerValue.TIMESTAMP
      }
      const disconnected:PortalUserDisconnected = {
        connected: false,
        disconnectedAt: firebase.database.ServerValue.TIMESTAMP
      }
      this.userRef.onDisconnect().set(disconnected)
      this.userRef.set(connected)
    }
  }

  handleGroupUsersChange(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot && this.groupUsersRef) {
      const groupUsers:PortalUserConnectionStatusMap|null = snapshot.val()
      this.setState({groupUsers})
    }
  }

  handleInfoChange(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot) {
      const documentInfo:FirebaseDocumentInfo|null = snapshot.val()
      this.setState({documentInfo})
      if (this.props.setTitle) {
        this.props.setTitle(documentInfo ? documentInfo.name : null)
      }
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
    const hashParams:AppHashParams = {
      template: this.props.document.getTemplateHashParam(),
      demo: uuidV4()
    }
    window.open(`${window.location.origin}/#${queryString.stringify(hashParams)}`)
  }

  renderDocumentInfo() {
    const {documentInfo} = this.state
    if (!documentInfo) {
      return null
    }
    return (
      <div className="document-info">
        <div className="document-name">
          {this.props.setTitle ? <InlineEditorComponent text={documentInfo.name} changeText={this.changeDocumentName} /> : documentInfo.name}
        </div>
        <div className="instance-info" title={this.state.debugInfo}>{this.state.workspaceName}</div>
      </div>
    )
  }

  renderGroupInfo() {
    const {portalActivity} = this.props
    const {groupUsers} = this.state
    if (!groupUsers || !portalActivity) {
      return null
    }
    const users:JSX.Element[] = []
    Object.keys(groupUsers).forEach((email) => {
      const groupUser = groupUsers[email]
      const portalUser = this.state.classUserLookup[escapeFirebaseKey(email)]
      if (portalUser) {
        const {connected} = groupUser
        const className = `group-user ${groupUser.connected ? "connected" : "disconnected"}`
        const titleSuffix = groupUser.connected ? `connected ${timeagoInstance.format(groupUser.connectedAt)}` : `disconnected ${timeagoInstance.format(groupUser.disconnectedAt)}`
        users.push(<div key={email} className={className} title={`${portalUser.fullName}: ${titleSuffix}`}>{portalUser.initials}</div>)
      }
    })
    return (
      <div className="group-info"><div className="group-name">Group {this.props.group}</div>{users}</div>
    )
  }

  renderHeader() {
    const {firebaseUser, portalUser} = this.props
    const className = `header${this.props.isTemplate ? " template" : ""}`
    const userName = portalUser ? portalUser.fullName : (firebaseUser.isAnonymous ? "Anonymous User" : firebaseUser.displayName)
    return (
      <div className={className}>
        {this.renderDocumentInfo()}
        <div className="user-info">
          <div className="user-name">{userName}</div>
        </div>
        {this.renderGroupInfo()}
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
    const showDemoButton = this.props.isTemplate && !document.isReadonly
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
               isTemplate={this.props.isTemplate}
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