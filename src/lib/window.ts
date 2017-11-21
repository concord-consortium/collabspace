import { Document } from "./document"
import { IFramePhoneParent } from "./collabspace-client"
import * as firebase from "firebase"

export interface FirebaseWindowAttrs {
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

export interface FirebaseWindowAttrsMap {
  [key: string]: FirebaseWindowAttrs|null
}

export interface FirebaseIFrameDataMap {
  [key: string]: any|null
}

export interface FirebaseWindow {
  attrs: FirebaseWindowAttrsMap
  order: string[]
  minimizedOrder: string[]
  iframeData: FirebaseIFrameDataMap
}

export interface FirebaseWindowMap {
  [key: string]: FirebaseWindow
}

export interface WindowMap {
  [key: string]: Window|null
}

export interface IFrame {
  window: Window
  element: HTMLIFrameElement
  connected: boolean
  phone: IFramePhoneParent
  dataRef: firebase.database.Reference
}

export interface IFrameMap {
  [key: string]: IFrame|null
}

export interface WindowOptions {
  document: Document
  attrs: FirebaseWindowAttrs
}

export class Window {
  document: Document
  attrs: FirebaseWindowAttrs
  onAttrsChanged: ((newAttrs:FirebaseWindowAttrs) => void)|null

  id: string
  iframe: IFrame
  attrsRef: firebase.database.Reference

  constructor(id: string, options:WindowOptions) {
    this.id = id
    this.document = options.document
    this.attrs = options.attrs

    this.attrsRef = this.document.getWindowsDataRef("attrs").child(id)
    this.onAttrsChanged = null
  }

  destroy() {
  }

  static CreateInFirebase(options: WindowOptions): Promise<Window> {
    return new Promise<Window>((resolve, reject) => {
      const propsRef = options.document.getWindowsDataRef("attrs")
      const ref = propsRef.push(options.attrs)
      if (ref.key) {
        resolve(new Window(ref.key, options))
      }
    })
  }

  close() {
    this.destroy()
    if (!this.document.isReadonly) {
      this.iframe.dataRef.set(null)
      this.attrsRef.set(null)
    }
  }

  setAttrs(attrs:FirebaseWindowAttrs, updateFirebase:boolean = true) {
    this.attrs = attrs
    if (updateFirebase && !this.document.isReadonly) {
      this.attrsRef.set(attrs)
    }
    if (this.onAttrsChanged) {
      this.onAttrsChanged(attrs)
    }
  }


}
