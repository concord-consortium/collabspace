import { IFramePhoneLib,
         IFramePhoneParent,
         MessageContent,
         MessageType,
         Listener,
         CollabSpaceClientInitRequestMessage,
         CollabSpaceClientInitResponseMessage,
         CollabSpaceClientInitRequest,
         CollabSpaceClientInitResponse
        } from "./collabspace-client"
import { FirebaseConfig } from "./firebase-config"
import * as firebase from "firebase"

const IFramePhoneFactory:IFramePhoneLib = require("iframe-phone")

export interface IFrame {
  windowId: string
  element: HTMLIFrameElement
  connected: boolean
  phone: IFramePhoneParent
  dataRef: firebase.database.Reference
}

export interface IFrameMap {
  [key: string]: IFrame|null
}

export class IFrameManager {
  iframes: IFrameMap
  documentRef:firebase.database.Reference

  constructor (documentRef:firebase.database.Reference) {
    this.documentRef = documentRef
    this.iframes = {}
  }

  add(windowId: string, readonly: boolean, element:HTMLIFrameElement) {
    const iframe:IFrame = {
      windowId,
      element,
      connected: false,
      dataRef: this.documentRef.child(`data/iframes/${windowId}`),
      phone: IFramePhoneFactory.ParentEndpoint(element, () => {
        iframe.connected = true
        const initRequest:CollabSpaceClientInitRequest = {
          version: "1.0.0",
          id: windowId,
          readonly: readonly,
          firebase: {
            config: FirebaseConfig,
            dataPath: iframe.dataRef.toString().substring(iframe.dataRef.root.toString().length)
          }
        }
        iframe.phone.addListener(CollabSpaceClientInitResponseMessage, (resp:CollabSpaceClientInitResponse) => {
          // TODO
        })
        iframe.phone.post(CollabSpaceClientInitRequestMessage, initRequest)
      })
    }
    this.iframes[windowId] = iframe
  }

  remove(windowId:string) {
    const iframe = this.iframes[windowId]
    if (iframe) {
      iframe.dataRef.set(null)
    }
    delete this.iframes[windowId]
  }
}