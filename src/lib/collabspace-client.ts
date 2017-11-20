import { FirebaseConfig } from "./firebase-config"
import * as firebase from "firebase";

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

export interface CollabSpaceClientConfig {
  init(req: CollabSpaceClientInitRequest): CollabSpaceClientInitResponse|Promise<CollabSpaceClientInitResponse>
}

export class CollabSpaceClient {
  config: CollabSpaceClientConfig
  phone: IFramePhoneChild
  dataRef: firebase.database.Reference

  constructor (config:CollabSpaceClientConfig) {
    this.config = config
    this.phone = IFramePhoneFactory.getIFrameEndpoint()
    this.phone.addListener(CollabSpaceClientInitRequestMessage, this.clientInit.bind(this))
    this.phone.initialize()
  }

  clientInit(req:CollabSpaceClientInitRequest) {
    firebase.initializeApp(req.firebase.config)
    this.dataRef = firebase.database().ref(req.firebase.dataPath)

    const resp = this.config.init(req)
    Promise.resolve(resp).then((resp) => {
      this.phone.post(CollabSpaceClientInitResponseMessage, resp)
    })
  }
}