import { Window, WindowMap, IFrame, FirebaseWindowAttrs } from "./window"
import { Document } from "./document"
import { FirebaseWindowAttrsMap } from "./window"
import { FirebaseConfig } from "./firebase-config"
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

 const IFramePhoneFactory:IFramePhoneLib = require("iframe-phone")

import * as firebase from "firebase"

export enum DragType { GrowLeft, GrowRight, GrowUp, GrowDown, GrowDownRight, GrowDownLeft, Position, None }
export interface DragInfo {
  window: Window|null
  starting?: {
    x: number
    y: number
    top: number
    left: number
    width: number
    height: number
  }
  type: DragType
}

export interface OrderedWindow {
  order: number
  window: Window
}

export interface WindowManagerState {
  allOrderedWindows: OrderedWindow[]
  minimizedWindows: Window[]
  topWindow: Window|null
}

export type WindowManagerStateChangeFn = (state:WindowManagerState) => void

export class WindowManager {
  windows: WindowMap
  document: Document
  onStateChanged: WindowManagerStateChangeFn
  state: WindowManagerState
  attrsRef: firebase.database.Reference
  orderRef: firebase.database.Reference
  minimizedOrderRef: firebase.database.Reference
  dragInfo: DragInfo

  constructor (document:Document, onStateChanged: WindowManagerStateChangeFn) {
    this.document = document
    this.onStateChanged = onStateChanged

    this.windows = {}
    this.dragInfo = {window: null, type: DragType.None}
    this.state = {
      allOrderedWindows: [],
      minimizedWindows: [],
      topWindow: null
    }

    this.handleAttrsChange = this.handleAttrsChange.bind(this)
    this.handleOrderChange = this.handleOrderChange.bind(this)
    this.handleMinimizedOrderChange = this.handleMinimizedOrderChange.bind(this)

    this.attrsRef = document.getWindowsDataRef("attrs")
    this.orderRef = document.getWindowsDataRef("order")
    this.minimizedOrderRef = document.getWindowsDataRef("minimizedOrder")

    // make sure the windows map is populated before checking the ordering
    this.attrsRef.once("value", (snapshot) => {
      this.handleAttrsChange(snapshot)

      this.attrsRef.on("value", this.handleAttrsChange)
      this.orderRef.on("value", this.handleOrderChange)
      this.minimizedOrderRef.on("value", this.handleMinimizedOrderChange)
    })
  }

  destroy() {
    this.attrsRef.off("value", this.handleAttrsChange)
    this.orderRef.off("value", this.handleOrderChange)
    this.minimizedOrderRef.off("value", this.handleMinimizedOrderChange)
  }

  notifyStateChange() {
    this.onStateChanged(this.state)
  }

  handleAttrsChange(snapshot:firebase.database.DataSnapshot) {
    const attrsMap:FirebaseWindowAttrsMap|null = snapshot.val()
    const updatedWindows:WindowMap = {}

    if (attrsMap) {
      Object.keys(attrsMap).forEach((id) => {
        const window = this.windows[id]
        const attrs = attrsMap[id]
        if (attrs) {
          if (window) {
            window.setAttrs(attrs, false)
            updatedWindows[id] = window
          }
          else {
            updatedWindows[id] = new Window(id, {
              document: this.document,
              attrs
            })
          }
        }
      })
    }

    this.windows = updatedWindows

    // NOTE: there is no state change notification here on purpose as
    // the window manager state is only concerned with the order of the windows.
    // This does mean that the attrs map needs to be set for a window id before
    // the window id is added to the ordered lists as is done in add() below
  }

  handleOrderChange(snapshot:firebase.database.DataSnapshot) {
    this.state.allOrderedWindows = []
    this.state.topWindow = null

    let topOrder = 0
    const windowOrder:string[]|null = snapshot.val()
    if (windowOrder !== null) {
      Object.keys(this.windows).forEach((id) => {
        const window = this.windows[id]
        const order = windowOrder.indexOf(id)
        if (window && (order !== -1)) {
          this.state.allOrderedWindows.push({order, window})
          if (!window.attrs.minimized) {
            if (!this.state.topWindow || (order > topOrder)) {
              this.state.topWindow = window
              topOrder = order
            }
          }
        }
      })
    }

    this.notifyStateChange()
  }

  handleMinimizedOrderChange(snapshot:firebase.database.DataSnapshot) {
    this.state.minimizedWindows = []

    const minimizedWindowOrder:string[]|null = snapshot.val()
    if (minimizedWindowOrder !== null) {
      minimizedWindowOrder.forEach((id) => {
        const window = this.windows[id]
        if (window) {
          this.state.minimizedWindows.push(window)
        }
      })
    }

    this.notifyStateChange()
  }

  registerDragWindow(window:Window|null, type:DragType=DragType.None) {
    this.dragInfo.window = window
    this.dragInfo.type = type
  }

  updateDragWindow(attrs: FirebaseWindowAttrs) {
    const {window} = this.dragInfo
    if (window) {
      window.setAttrs(attrs)
    }
  }

  randInRange(min:number, max:number) {
    return Math.round(min + (Math.random() * (max - min)))
  }

  add(url: string, title:string) {
    const attrs = {
      top: this.randInRange(50, 200),
      left: this.randInRange(50, 200),
      width: 400,
      height: 400,
      minimized: false,
      maximized: false,
      url,
      title,
    }
    Window.CreateInFirebase({document: this.document, attrs})
      .then((window) => {
        this.moveToTop(window)
      })
      .catch((err) => {})
  }

  moveToTop(window:Window) {
    this.orderRef.once("value", (snapshot) => {
      const order:string[] = snapshot.val() || []
      const index = order.indexOf(window.id)
      if (index !== -1) {
        order.splice(index, 1)
      }
      order.push(window.id)
      this.orderRef.set(order)
    })
  }

  close(window:Window) {
    this.orderRef.once("value", (snapshot) => {
      const order:string[] = snapshot.val() || []
      const index = order.indexOf(window.id)
      if (index !== -1) {
        order.splice(index, 1)
      }
      this.orderRef.set(order, () => {
        window.close()
        delete this.windows[window.id]
      })
    })
  }

  restoreMinimized(window:Window) {
    this.setState(window, false, window.attrs.maximized)
    this.moveToTop(window)
  }

  setState(window:Window, minimized: boolean, maximized: boolean) {
    const {attrs} = window
    attrs.maximized = maximized
    attrs.minimized = minimized
    window.setAttrs(attrs)

    this.minimizedOrderRef.once("value", (snapshot) => {
      const minimizedOrder:string[] = snapshot.val() || []
      const index = minimizedOrder.indexOf(window.id)
      if (!minimized && (index !== -1)) {
        minimizedOrder.splice(index, 1)
      }
      else if (minimized && (index === -1)) {
        minimizedOrder.push(window.id)
      }
      this.minimizedOrderRef.set(minimizedOrder)
    })
  }

  changeTitle(window:Window, newTitle:string) {
    const {attrs} = window
    attrs.title = newTitle
    window.setAttrs(attrs)
  }

  windowLoaded(window:Window, element:HTMLIFrameElement) {
    window.iframe = {
      window: window,
      element,
      connected: false,
      dataRef: this.document.getWindowsDataRef("iframeData").child(window.id),
      phone: IFramePhoneFactory.ParentEndpoint(element, () => {
        window.iframe.connected = true
        const initRequest:CollabSpaceClientInitRequest = {
          version: "1.0.0",
          id: window.id,
          readonly: this.document.readonly,
          firebase: {
            config: FirebaseConfig,
            dataPath: window.iframe.dataRef.toString().substring(window.iframe.dataRef.root.toString().length)
          }
        }
        window.iframe.phone.addListener(CollabSpaceClientInitResponseMessage, (resp:CollabSpaceClientInitResponse) => {
          // TODO
        })
        window.iframe.phone.post(CollabSpaceClientInitRequestMessage, initRequest)
      })
    }
  }
}