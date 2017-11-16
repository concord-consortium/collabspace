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
  documentExists: boolean
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
  // two booleans are used instead of a single state so that we remember if the window should
  // restore to maximized after being minimized
  minimized: boolean
  maximized: boolean
}

export interface WindowPropsMap {
  [key: string]: WindowProps|null
}

export interface WindowDataMap {
  [key: string]: any|null
}

export interface DocumentData {
  windows: {
    props: WindowPropsMap
    order: string[]
    minimizedOrder: string[]
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
  documentInfoRef: firebase.database.Reference|null

  constructor (props:AppComponentProps) {
    super(props)
    this.state = {
      authError: null,
      documentError: null,
      authUser: null,
      documentId: null,
      documentRef: null,
      documentExists: false
    }
    this.startingTitle = document.title
    this.documentInfoRef = null

    this.handleDocumentInfoChange = this.handleDocumentInfoChange.bind(this)
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

  setTitle(info:DocumentInfo|null) {
    const suffix = info ? `: ${info.name}` : ""
    document.title = this.startingTitle + suffix
  }

  parseHash() {
    const params:AppParams = queryString.parse(window.location.hash)
    this.setState({
      documentId: params.document || null,
      documentRef: null,
      documentExists: false,
      documentError: null
    })

    if (this.documentInfoRef) {
      this.documentInfoRef.off("value", this.handleDocumentInfoChange)
    }

    if (params.document) {
      const documentRef = getDocumentRef(params.document)
      if (documentRef) {
        this.setState({documentRef})
        this.documentInfoRef = documentRef.child("info")
        this.documentInfoRef.on("value", this.handleDocumentInfoChange)
      }
      else {
        this.setState({documentError: "Invalid collaborative space document in url!"})
      }
    }
  }

  handleDocumentInfoChange(snapshot:firebase.database.DataSnapshot|null) {
    const documentInfo = (snapshot && snapshot.val()) || null
    const documentExists = !!documentInfo && documentInfo.version
    this.setState({documentExists})
    if (!documentExists) {
      this.setState({documentError: "Unable to load collaborative space document!"})
    }
    this.setTitle(documentInfo)
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
        if (this.state.documentRef && this.state.documentExists) {
          return <WorkspaceComponent
                    authUser={this.state.authUser}
                    documentRef={this.state.documentRef}
                 />
        }
        return this.renderProgress("Loading collaborative space document...")
      }
      return <DocumentCrudComponent authUser={this.state.authUser} />
    }

    return this.renderProgress("Authenticating...")
  }
}