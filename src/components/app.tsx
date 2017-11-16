import * as React from "react"
import * as firebase from "firebase"
import * as queryString from "query-string"
import { DocumentCrudComponent } from "./document-crud"
import { WorkspaceComponent } from "./workspace"

export interface AppComponentProps {}

export interface AppComponentState {
  authUser: firebase.User|null
  authError: string|null
  documentError: string|null
  documentId: string|null
  documentRef: firebase.database.Reference|null
  document: Document|null
}

export interface AppParams {
  document: string|null
}

export interface WindowProps {
  top: number
  left: number
  width: number
  height: number
  url: string
  title: string
}

export interface WindowPropsMap {
  [key: string]: WindowProps
}

export interface WindowDataMap {
  [key: string]: any
}

export interface DocumentData {
  windows: {
    props: WindowPropsMap
    order: string[]
    data: WindowDataMap
  }
}

export interface DocumentInfo {
  version: "1.0.0",
  ownerId: string
  createdAt: number
  name: string
}

export interface Document {
  info: DocumentInfo
  data?: DocumentData
}

export function getDocumentRef(fullDocumentId:string) {
  const [ownerId, documentId, ...rest] = fullDocumentId.split(":")
  if (!ownerId && !documentId) {
    return null
  }
  if (ownerId === "instance") {
    return firebase.database().ref(`instances/${documentId}`)
  }
  return firebase.database().ref(`templates/${ownerId}/${documentId}`)
}

export class AppComponent extends React.Component<AppComponentProps, AppComponentState> {
  startingTitle: string

  constructor (props:AppComponentProps) {
    super(props)
    this.state = {
      authError: null,
      documentError: null,
      authUser: null,
      documentId: null,
      documentRef: null,
      document: null
    }
    this.startingTitle = document.title

    this.handleDocumentChange = this.handleDocumentChange.bind(this)
  }

  componentWillMount() {
    firebase.initializeApp({
      apiKey: "AIzaSyCW8vg-bKrcQTaNiDHZvVd_CoGMsgztQ60",
      authDomain: "collabspace-920f6.firebaseapp.com",
      databaseURL: "https://collabspace-920f6.firebaseio.com",
      projectId: "collabspace-920f6",
      storageBucket: "collabspace-920f6.appspot.com",
      messagingSenderId: "987825465426"
    })

    let authed = false
    firebase.auth().onAuthStateChanged((authUser) => {
      this.setState({authUser})

      // parse the hash after authenticating the first time
      if (!authed) {
        authed = true
        this.parseHash()
        window.addEventListener("hashchange", this.parseHash.bind(this))
      }
    })

    firebase.auth().signInAnonymously().catch((authError) => {
      this.setState({authError: authError.toString()})
    })
  }

  componentWillUpdate(nextProps:AppComponentProps, nextState:AppComponentState) {
    const suffix = nextState.document ? `: ${nextState.document.info.name}` : ""
    document.title = this.startingTitle + suffix
  }

  parseHash() {
    const params:AppParams = queryString.parse(window.location.hash)
    this.setState({documentId: params.document || null, document: null, documentError: null})

    if (this.state.documentRef) {
      this.state.documentRef.off("value", this.handleDocumentChange)
    }
    if (params.document) {
      const documentRef = getDocumentRef(params.document)
      if (documentRef) {
        documentRef.on("value", this.handleDocumentChange)
        this.setState({documentRef})
      }
      else {
        this.setState({documentError: "Invalid collaborative space document in url!"})
      }
    }
  }

  handleDocumentChange(snapshot:firebase.database.DataSnapshot|null) {
    const document = (snapshot && snapshot.val()) || null
    this.setState({document})
    if (!document) {
      this.setState({documentError: "Unable to load collaborative space document!"})
    }
  }

  renderFatalError(message:string) {
    return <div className="error">{message}</div>
  }

  renderProgress(message:string) {
    return <div className="progress">{message}</div>
  }

  render() {
    const error = this.state.authError || this.state.documentError
    if (error) {
      return this.renderFatalError(error)
    }

    if (this.state.authUser) {
      if (this.state.documentId) {
        if (this.state.documentRef && this.state.document) {
          return <WorkspaceComponent
                    authUser={this.state.authUser}
                    document={this.state.document}
                    documentRef={this.state.documentRef}
                    readonly={this.state.authUser.uid !== this.state.document.info.ownerId}
                 />
        }
        return this.renderProgress("Loading collaborative space document...")
      }
      return <DocumentCrudComponent authUser={this.state.authUser} />
    }

    return this.renderProgress("Authenticating...")
  }
}