import * as React from "react"
import * as firebase from "firebase"
import {v4 as uuidV4} from "uuid"
import {Document, getDocumentRef} from "./app"

export interface DocumentCrudComponentProps {
  authUser: firebase.User
}
export interface DocumentCrudComponentState {
  error: string|null
}

export class DocumentCrudComponent extends React.Component<DocumentCrudComponentProps, DocumentCrudComponentState> {
  constructor (props:DocumentCrudComponentProps) {
    super(props)
    this.state = {
      error: null
    }

    this.handleCreateDocument = this.handleCreateDocument.bind(this)
  }

  componentWillMount() {
  }

  handleCreateDocument() {
    const ownerId = this.props.authUser.uid
    const documentId = uuidV4()
    const document:Document = {
      info: {
        version: "1.0.0",
        ownerId,
        createdAt: Date.now(),
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

  render() {
    return <div><button onClick={this.handleCreateDocument}>Create Document</button></div>
  }
}