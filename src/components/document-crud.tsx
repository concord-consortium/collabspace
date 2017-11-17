import * as React from "react"
import * as firebase from "firebase"
import {v4 as uuidV4} from "uuid"
import {Document, getDocumentRef, getDocumentListRef, DocumentInfo} from "./app"
const timeago = require("timeago.js")

const timeagoInstance = timeago()

export interface DocumentInfoItem {
  id: string
  checked: boolean
  info: DocumentInfo
}

export interface DocumentInfoItemMap {
  [key: string]: DocumentInfoItem
}

export interface DocumentMap {
  [key: string]: Document
}

export interface DocumentCrudItemComponentProps {
  authUser: firebase.User
  item: DocumentInfoItem
  checkItem: (id: string, checked:boolean) => void
}
export interface DocumentCrudItemComponentState {
}

export class DocumentCrudItemComponent extends React.Component<DocumentCrudItemComponentProps, DocumentCrudItemComponentState> {
  listRef: firebase.database.Reference

  constructor (props:DocumentCrudItemComponentProps) {
    super(props)
    this.state = {
    }
    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(e:React.ChangeEvent<HTMLInputElement>) {
    this.props.checkItem(this.props.item.id, e.target.checked)
  }

  render() {
    const {item} = this.props
    const {info} = item
    const href = `#document=${this.props.authUser.uid}:${item.id}`

    return (
      <tr>
        <td className="checkbox"><input type="checkbox" checked={item.checked} onChange={this.handleChange} /></td>
        <td><a href={href}>{info.name}</a></td>
        <td>{timeagoInstance.format(info.createdAt)}</td>
      </tr>
    )
  }
}

export interface DocumentCrudComponentProps {
  authUser: firebase.User
}
export interface DocumentCrudComponentState {
  error: string|null
  items: DocumentInfoItemMap
  haveItems: boolean
  loadedItems: boolean
}

export class DocumentCrudComponent extends React.Component<DocumentCrudComponentProps, DocumentCrudComponentState> {
  listRef: firebase.database.Reference

  constructor (props:DocumentCrudComponentProps) {
    super(props)
    this.state = {
      error: null,
      items: {},
      haveItems: false,
      loadedItems: false
    }

    this.handleDocumentList = this.handleDocumentList.bind(this)
    this.handleCreateDocument = this.handleCreateDocument.bind(this)
    this.handleDeleteDocuments = this.handleDeleteDocuments.bind(this)
    this.handleToggleAllListItems = this.handleToggleAllListItems.bind(this)
    this.handleCheckListItem = this.handleCheckListItem.bind(this)
  }

  componentWillMount() {
    this.listRef = getDocumentListRef(this.props.authUser.uid)
    this.listRef.on("value", this.handleDocumentList)
  }

  componentWillUnmount() {
    this.listRef.off("value", this.handleDocumentList)
  }

  handleDocumentList(snapshot:firebase.database.DataSnapshot|null) {
    if (snapshot) {
      const items:DocumentInfoItemMap = {}
      const allDocuments:DocumentMap|null = snapshot.val()
      let haveItems = false
      if (allDocuments) {
        Object.keys(allDocuments).forEach((documentId) => {
          items[documentId] = {
            id: documentId,
            checked: !!(this.state.items[documentId] || {}).checked,
            info: allDocuments[documentId].info
          }
          haveItems = true
        })
      }
      this.setState({items, haveItems, loadedItems: true})
    }
  }

  handleCreateDocument() {
    const ownerId = this.props.authUser.uid
    const documentId = uuidV4()
    const document:Document = {
      info: {
        version: "1.0.0",
        ownerId,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        name: "Untitled"
      }
    }
    const documentRef = getDocumentRef(`${ownerId}:${documentId}`)
    if (!documentRef) {
      this.setState({error: "Unable to create collaborative space document!"})
    }
    else {
      documentRef.set(document, (err) => {
        if (err) {
          this.setState({error: "Unable to create collaborative space document!"})
        }
        else {
          window.location.hash = `document=${ownerId}:${documentId}`
        }
      })
    }
  }

  handleDeleteDocuments(e:React.MouseEvent<HTMLButtonElement>) {
    const {items} = this.state
    const updates:any = {}
    let haveUpdates = false
    Object.keys(items).forEach((id) => {
      if (items[id].checked) {
        updates[id] = null
        haveUpdates = true
      }
    })
    if (haveUpdates && (e.ctrlKey || confirm("Are you sure you want to delete the selected documents?"))) {
      this.listRef.update(updates)
    }
  }

  handleToggleAllListItems(e:React.ChangeEvent<HTMLInputElement>) {
    const {checked} = e.target
    const {items} = this.state
    Object.keys(items).forEach((key) => {
      items[key].checked = checked
    })
    this.setState({items: items})
  }

  handleCheckListItem(id:string, checked:boolean) {
    const item = this.state.items[id]
    if (item) {
      item.checked = checked
      this.setState({items: this.state.items})
    }
  }

  renderHeader() {
    const {authUser} = this.props
    return (
      <div className="header">
        <div className="logo">Collaboration Space</div>
        <div className="user-info">
          <div className="user-name">{authUser.isAnonymous ? "Anonymous User" : authUser.displayName }</div>
        </div>
      </div>
    )
  }

  renderToolbar() {
    return (
      <div className="toolbar">
        <div className="buttons">
          <button type="button" onClick={this.handleCreateDocument}>Create Document</button>
          <button type="button" onClick={this.handleDeleteDocuments}>Delete Selected Documents</button>
        </div>
      </div>
    )
  }

  renderDebug() {
    return (
      <div className="debug">
        {JSON.stringify(this.state.items, null, 2)}
      </div>
    )
  }

  renderEmptyListArea() {
    return (
      <div className="list-area">
        <div className="empty-message">
          <div>No Collaboration Space documents were found for your Firebase user.  Use the "Create Document" button to create a new document.</div>
          <div>NOTE: Currently the Firebase authentication is using anonymous auth which means your user is tied to your local PC.  This will change in the near future to use the Learn Portal auth system.</div>
        </div>
      </div>
    )
  }

  renderListArea() {
    const {items} = this.state

    return (
      <div className="list-area">
        <table>
          <thead>
            <tr>
              <th className="checkbox"><input type="checkbox" defaultChecked={false} onChange={this.handleToggleAllListItems} /></th>
              <th>Document</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(items).map((id) => <DocumentCrudItemComponent key={id} item={items[id]} authUser={this.props.authUser} checkItem={this.handleCheckListItem} />)}
          </tbody>
        </table>
      </div>
    )
  }

  renderLoadingItems() {
    return <div className="progress">Getting your list of documents...</div>
  }

  render() {
    return (
      <div className="document-crud">
        {this.renderHeader()}
        {this.renderToolbar()}
        {this.state.loadedItems ? (this.state.haveItems ? this.renderListArea() : this.renderEmptyListArea()) : this.renderLoadingItems()}
      </div>
    )
  }
}