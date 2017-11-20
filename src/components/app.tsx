import * as React from "react"
import * as firebase from "firebase"
import * as queryString from "query-string"
import { FirebaseDocument, Document, FirebaseDocumentInfo } from "../lib/document"
import { FirebaseWindow } from "../lib/window"
import { DocumentCrudComponent } from "./document-crud"
import { WorkspaceComponent } from "./workspace"
import { FirebaseConfig } from "../lib/firebase-config"

export interface AppComponentProps {}

export interface AppComponentState {
  authUser: firebase.User|null
  authError: string|null
  documentError: string|null
  documentId: string|null
  document: Document|null
}

export interface AppParams {
  document: string|null
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
      document: null
    }
    this.startingTitle = document.title
    this.setTitle = this.setTitle.bind(this)
  }

  componentWillMount() {
    firebase.initializeApp(FirebaseConfig)

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

  setTitle(documentName?:string|null) {
    const suffix = documentName ? `: ${documentName}` : ""
    document.title = this.startingTitle + suffix
  }

  parseHash() {
    const params:AppParams = queryString.parse(window.location.hash)

    if (this.state.document) {
      this.state.document.destroy()
    }

    this.setState({
      documentId: params.document || null,
      documentError: null,
      document: null
    })

    this.setTitle()

    if (params.document) {
      const parsedParam = Document.ParseHashParam(params.document)
      if (parsedParam) {
        Document.LoadFromFirebase(parsedParam.ownerId, parsedParam.documentId)
          .then((document) => this.setState({document}))
          .catch((documentError) => this.setState({documentError}))
      }
      else {
        this.setState({documentError: "Invalid collaborative space document in url!"})
      }
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
        if (this.state.document) {
          return <WorkspaceComponent
                    authUser={this.state.authUser}
                    document={this.state.document}
                    setTitle={this.setTitle}
                 />
        }
        return this.renderProgress("Loading collaborative space document...")
      }
      return <DocumentCrudComponent authUser={this.state.authUser} />
    }

    return this.renderProgress("Authenticating...")
  }
}