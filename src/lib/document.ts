import * as firebase from "firebase"
import { FirebaseWindowMap } from "./window"

export interface FirebaseDocumentData {
  windows: FirebaseWindowMap
}

export interface FirebaseDocumentInfo {
  version: "1.0.0",
  ownerId: string
  createdAt: number|Object
  name: string
}

export interface FirebaseDocument {
  info: FirebaseDocumentInfo
  data?: FirebaseDocumentData
}

export class Document {

  id: string
  ownerId: string
  firebaseDocument: FirebaseDocument
  ref: firebase.database.Reference
  dataRef: firebase.database.Reference
  infoRef: firebase.database.Reference
  readonly: boolean

  constructor (id: string, firebaseDocument:FirebaseDocument) {
    this.id = id
    this.ownerId = firebaseDocument.info.ownerId
    this.firebaseDocument = firebaseDocument
    this.ref = Document.GetFirebaseRef(this.ownerId, this.id)
    this.dataRef = this.ref.child("data")
    this.infoRef = this.ref.child("info")
    this.readonly = true
  }

  destroy() {
  }

  static CreateInFirebase(ownerId:string, documentId:string): Promise<Document> {
    return new Promise<Document>((resolve, reject) => {
      const firebaseDocument:FirebaseDocument = {
        info: {
          version: "1.0.0",
          ownerId,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          name: "Untitled"
        }
      }
      const documentRef = Document.GetFirebaseRef(ownerId, documentId)
      documentRef.set(firebaseDocument, (err) => {
        if (err) {
          reject("Unable to create collaborative space document!")
        }
        else {
          resolve(new Document(documentId, firebaseDocument))
        }
      })
    })
  }

  static LoadFromFirebase(ownerId:string, documentId:string): Promise<Document> {
    return new Promise<Document>((resolve, reject) => {
      const documentRef = Document.GetFirebaseRef(ownerId, documentId)
      documentRef.once("value", (snapshot) => {
        const firebaseDocument:FirebaseDocument = snapshot.val()
        if (!firebaseDocument) {
          reject("Unable to load collaborative space document!")
        }
        else {
          resolve(new Document(documentId, firebaseDocument))
        }
      })
    })
  }

  static GetFirebaseRef(ownerId:string, documentId:string) {
    return firebase.database().ref(`templates/${ownerId}/${documentId}`)
  }

  static GetFirebaseListRef(ownerId:string) {
    return firebase.database().ref(`templates/${ownerId}`)
  }

  static GetFirebaseRefFromHashParam(param:string) {
    const parsedParam = Document.ParseHashParam(param)
    if (parsedParam) {
      return Document.GetFirebaseRef(parsedParam.ownerId, parsedParam.documentId)
    }
    return null
  }

  static ParseHashParam(param:string) {
    const [ownerId, documentId, ...rest] = param.split(":")
    if (ownerId && documentId) {
      return {ownerId, documentId}
    }
    return null
  }

  static StringifyHashParam(ownerId:string, documentId:string) {
    return `${ownerId}:${documentId}`
  }

  // NOTE: the child should be a key in FirebaseWindow
  // TODO: figure out how to type check the child param in FirebaseWindow
  getWindowsDataRef(child:"attrs"|"order"|"minimizedOrder"|"iframeData") {
    return this.dataRef.child(`windows/${child}`)
  }


}