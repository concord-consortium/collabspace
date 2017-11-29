import { FirebaseConfig } from "./firebase-config"
import { FirebaseArtifact, FirebasePublication } from "./document"
import * as firebase from "firebase"
import { v4 as uuidV4 } from "uuid"
import { PortalActivity, PortalUser } from "./auth";

const IFramePhoneFactory:IFramePhoneLib = require("iframe-phone")

export interface IFramePhoneLib {
  ParentEndpoint(iframe:HTMLIFrameElement, afterConnectedCallback?: (args:any) => void):  IFramePhoneParent
  getIFrameEndpoint: () => IFramePhoneChild
}

export type MessageContent = any
export type MessageType = string
export type Listener = (args:any)=>void

export interface IFramePhoneChild {
  post(type:MessageType, content:MessageContent): void
  addListener(messageName:string, listener:Listener): void
  disconnect(): void
  connected: boolean
  initialize():void
  getListenerNames(): Listener[]
  removeAllListeners(): void
}

export interface IFramePhoneParent {
  post(type:MessageType, content:MessageContent): void
  addListener(messageName:string, listener:Listener): void
  removeListener(messageName:string): void
  disconnect(): void
  connected: boolean
  getTargetWindow(): Window
  targetOrigin: string
}


export const CollabSpaceClientInitRequestMessage = "CollabSpaceClientInitRequest"
export const CollabSpaceClientInitResponseMessage = "CollabSpaceClientInitResponse"

export const CollabSpaceClientPublishRequestMessage = "CollabSpaceClientPublishRequest"
export const CollabSpaceClientPublishResponseMessage = "CollabSpaceClientPublishResponse"

export interface CollabSpaceClientInitRequest {
  version: string
  id: string
  readonly: boolean
  firebase: {
    config: any,
    dataPath: string
  }
}
export interface CollabSpaceClientInitResponse {
}

export interface CollabSpaceClientPublishRequest {
  publicationsPath: string
  artifactStoragePath: string
}

export interface CollabSpaceClientPublishResponse {
}

export interface CollabSpaceClientConfig {
  init(req: CollabSpaceClientInitRequest): CollabSpaceClientInitResponse|Promise<CollabSpaceClientInitResponse>
  publish(publication: CollabSpaceClientPublication): CollabSpaceClientPublishResponse|Promise<CollabSpaceClientPublishResponse>
}

export class CollabSpaceClient {
  windowId: string
  config: CollabSpaceClientConfig
  phone: IFramePhoneChild
  dataRef: firebase.database.Reference

  constructor (config:CollabSpaceClientConfig) {
    this.config = config
    this.phone = IFramePhoneFactory.getIFrameEndpoint()
    this.phone.addListener(CollabSpaceClientInitRequestMessage, this.clientInit.bind(this))
    this.phone.addListener(CollabSpaceClientPublishRequestMessage, this.clientPublish.bind(this))
    this.phone.initialize()
  }

  clientInit(req:CollabSpaceClientInitRequest) {
    this.windowId = req.id
    firebase.initializeApp(req.firebase.config)
    this.dataRef = firebase.database().ref(req.firebase.dataPath)

    const resp = this.config.init(req)
    Promise.resolve(resp).then((resp) => {
      this.phone.post(CollabSpaceClientInitResponseMessage, resp)
    })
  }

  clientPublish(req:CollabSpaceClientPublishRequest) {
    const publication = new CollabSpaceClientPublication(this, req)
    const resp = this.config.publish(publication)
    Promise.resolve(resp).then((resp) => {
      this.phone.post(CollabSpaceClientPublishResponseMessage, resp)
    })
  }
}

export class CollabSpaceClientPublication {
  publicationsRef: firebase.database.Reference
  artifactsRef: firebase.database.Reference
  artifactsStoragePath: string

  constructor (client: CollabSpaceClient, req:CollabSpaceClientPublishRequest) {
    this.publicationsRef = firebase.database().ref(req.publicationsPath)
    this.artifactsRef = this.publicationsRef.child("windows").child(client.windowId).child("artifacts")
    this.artifactsStoragePath = req.artifactStoragePath
  }

  saveArtifactBlob(title: string, blob:Blob, mimeType:string, extension?:string) {
    return new Promise<FirebaseArtifact>((resolve, reject) => {
      if (!extension) {
        const parts = mimeType.split("/")
        extension = parts[parts.length - 1]
      }
      const storagePath:string = `${this.artifactsStoragePath}/${uuidV4()}.${extension}`
      const storageRef = firebase.storage().ref(storagePath)
      storageRef
        .put(blob, {contentType: mimeType})
        .then((snapshot) => storageRef.getDownloadURL())
        .then((url) => {
          const artifact:FirebaseArtifact = {title, mimeType, url}
          const artifactRef = this.artifactsRef.push(artifact)
          resolve(artifact)
        })
        .catch(reject)
    })
  }
}