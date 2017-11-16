import * as React from "react"
import * as firebase from "firebase"
import { Document, WindowProps } from "./app"

export interface WorkspaceComponentProps {
  authUser: firebase.User
  document: Document
  documentRef: firebase.database.Reference
  readonly: boolean
}
export interface WorkspaceComponentState {
}

export class WorkspaceComponent extends React.Component<WorkspaceComponentProps, WorkspaceComponentState> {
  propsRef: firebase.database.Reference
  orderRef: firebase.database.Reference

  constructor (props:WorkspaceComponentProps) {
    super(props)
    this.state = {
    }

    this.propsRef = this.props.documentRef.child("data/windows/props")
    this.orderRef = this.props.documentRef.child("data/windows/order")

    this.handleDrop = this.handleDrop.bind(this)
    this.handleDragOver = this.handleDragOver.bind(this)
    this.handleAddDrawingButton = this.handleAddDrawingButton.bind(this)
  }

  componentWillMount() {
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
      url,
      title
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

  renderHeader() {
    const {authUser, document} = this.props
    const {info} = document
    return (
      <div className="header">
        <div className="document-info">
          <div className="document-name">{info.name}</div>
          <div className="instance-info">Template</div>
        </div>
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
        {this.props.readonly ? this.renderReadonlyToolbar() : this.renderToolbarButtons()}
      </div>
    )
  }

  renderDocument() {
    return (
      <div className="document">
        <div className="debug">{JSON.stringify(this.props.document, null, 2)}</div>
      </div>
    )
  }

  render() {
    return (
      <div
        className="workspace"
        onDrop={this.handleDrop}
        onDragOver={this.handleDragOver}
      >
        {this.renderHeader()}
        {this.renderToolbar()}
        {this.renderDocument()}
      </div>
    )
  }
}