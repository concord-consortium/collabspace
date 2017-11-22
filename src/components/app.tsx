import * as React from "react"
import * as firebase from "firebase"
import * as queryString from "query-string"
import { FirebaseDocument, Document, FirebaseDocumentInfo } from "../lib/document"
import { FirebaseWindow } from "../lib/window"
import { DocumentCrudComponent } from "./document-crud"
import { WorkspaceComponent } from "./workspace"
import { FirebaseConfig } from "../lib/firebase-config"
import { DemoComponent } from "./demo"
import { PortalUser, PortalInfo, portalAuth, firebaseAuth } from "../lib/auth"

export interface AppComponentProps {}

export interface AppComponentState {
  firebaseUser: firebase.User|null
  authError: string|null
  documentError: string|null
  documentId: string|null
  document: Document|null
  demoId: string|null
  portalInfo: PortalInfo|null
}

export interface AppHashParams {
  document: string|null
  demo?: string
}


export class AppComponent extends React.Component<AppComponentProps, AppComponentState> {
  startingTitle: string
  documentInfoRef: firebase.database.Reference|null

  constructor (props:AppComponentProps) {
    super(props)
    this.state = {
      authError: null,
      documentError: null,
      firebaseUser: null,
      documentId: null,
      document: null,
      demoId: null,
      portalInfo: null
    }
    this.startingTitle = document.title
    this.setTitle = this.setTitle.bind(this)
  }

  componentWillMount() {
    firebase.initializeApp(FirebaseConfig)

    portalAuth().then((portalInfo) => {
      this.setState({portalInfo})

      return firebaseAuth().then((firebaseUser) => {
        this.setState({firebaseUser})

        this.parseHash()
        window.addEventListener("hashchange", this.parseHash.bind(this))
      })
    })
    .catch((error) => {
      this.setState({authError: error.toString()})
    })
  }

  setTitle(documentName?:string|null) {
    const suffix = documentName ? `: ${documentName}` : ""
    document.title = this.startingTitle + suffix
  }

  parseHash() {
    const params:AppHashParams = queryString.parse(window.location.hash)

    if (this.state.document) {
      this.state.document.destroy()
    }

    this.setState({
      documentId: params.document || null,
      documentError: null,
      document: null,
      demoId: params.demo || null
    })

    this.setTitle()

    if (params.document) {
      const parsedParam = Document.ParseHashParam(params.document)
      if (parsedParam) {
        Document.LoadFromFirebase(parsedParam.ownerId, parsedParam.documentId)
          .then((document) => {
            const {firebaseUser} = this.state
            document.isReadonly = !!(firebaseUser && (firebaseUser.uid !== document.ownerId))
            this.setState({document})
          })
          .catch((documentError) => this.setState({documentError}))
      }
      else {
        this.setState({documentError: "Invalid collaborative space document in url!"})
      }
    }
  }

  renderFatalError(message:string, errorType:string) {
    return <div className="error">{errorType} Error: {message}</div>
  }

  renderProgress(message:string) {
    return <div className="progress">{message}</div>
  }

  render() {
    const error = this.state.authError || this.state.documentError
    if (error) {
      return this.renderFatalError(error, error === this.state.authError ? "Authorization" : "Document")
    }

    if (this.state.firebaseUser) {
      if (this.state.documentId) {
        if (this.state.document) {
          if (this.state.demoId) {
            return <DemoComponent
                     firebaseUser={this.state.firebaseUser}
                     document={this.state.document}
                     demoId={this.state.demoId}
                   />
          }
          return <WorkspaceComponent
                    portalInfo={this.state.portalInfo}
                    firebaseUser={this.state.firebaseUser}
                    document={this.state.document}
                    setTitle={this.setTitle}
                 />
        }
        return this.renderProgress("Loading collaborative space document...")
      }
      return <DocumentCrudComponent firebaseUser={this.state.firebaseUser} />
    }

    return this.renderProgress("Authenticating...")
  }
}