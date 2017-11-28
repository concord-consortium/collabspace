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

export interface WindowManagerSettings {
  document: Document
  onStateChanged: WindowManagerStateChangeFn
  syncChanges: boolean
}

export class WindowManager {
  windows: WindowMap
  document: Document
  onStateChanged: WindowManagerStateChangeFn
  state: WindowManagerState
  attrsRef: firebase.database.Reference
  orderRef: firebase.database.Reference
  minimizedOrderRef: firebase.database.Reference
  dragInfo: DragInfo
  syncChanges: boolean
  windowOrder: string[]
  minimizedWindowOrder: string[]

  constructor (settings: WindowManagerSettings) {
    this.document = settings.document
    this.onStateChanged = settings.onStateChanged
    this.syncChanges = settings.syncChanges

    this.windows = {}
    this.windowOrder = []
    this.minimizedWindowOrder = []

    this.dragInfo = {window: null, type: DragType.None}
    this.state = {
      allOrderedWindows: [],
      minimizedWindows: [],
      topWindow: null
    }

    this.handleAttrsRef = this.handleAttrsRef.bind(this)
    this.handleOrderRef = this.handleOrderRef.bind(this)
    this.handleOrderChange = this.handleOrderChange.bind(this)
    this.handleMinimizedOrderRef = this.handleMinimizedOrderRef.bind(this)
    this.handleMinimizedOrderChange = this.handleMinimizedOrderChange.bind(this)

    this.attrsRef = this.document.getWindowsDataRef("attrs")
    this.orderRef = this.document.getWindowsDataRef("order")
    this.minimizedOrderRef = this.document.getWindowsDataRef("minimizedOrder")

    // make sure the windows map is populated before checking the ordering
    this.attrsRef.once("value", (snapshot) => {
      this.handleAttrsRef(snapshot)

      if (this.syncChanges) {
        this.attrsRef.on("value", this.handleAttrsRef)
        this.orderRef.on("value", this.handleOrderRef)
        this.minimizedOrderRef.on("value", this.handleMinimizedOrderRef)
      }
      else {
        this.orderRef.once("value", this.handleOrderRef)
        this.minimizedOrderRef.once("value", this.handleMinimizedOrderRef)
      }
    })
  }

  destroy() {
    if (this.syncChanges) {
      this.attrsRef.off("value", this.handleAttrsRef)
      this.orderRef.off("value", this.handleOrderRef)
      this.minimizedOrderRef.off("value", this.handleMinimizedOrderRef)
    }
  }

  notifyStateChange() {
    this.onStateChanged(this.state)
  }

  handleAttrsRef(snapshot:firebase.database.DataSnapshot) {
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
    // the window id is added to the ordered lists as is done in add() below.
    // The window component will trigger a re-render when its setAttrs() method is called
    // which is much more performant since only that window needs to re-render
  }

  // You may ask yourself "Why not just maintain the list of windows in the state
  // as a plain array?".  The reason it is not done is that React will move the
  // iframe element in the DOM on a re-render which causes the iframe to reload.
  // By keeping the render ordering always the same and using a separate order field
  // to set the zIndex of the window we avoid iframe reloads.
  handleOrderRef(snapshot:firebase.database.DataSnapshot) {
    const windowOrder:string[]|null = snapshot.val()
    if (windowOrder !== null) {
      this.handleOrderChange(windowOrder)
    }
  }

  handleOrderChange(windowOrder:string[]) {
    this.windowOrder = windowOrder
    this.state.allOrderedWindows = []
    this.state.topWindow = null

    let topOrder = 0
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

    this.notifyStateChange()
  }

  handleMinimizedOrderRef(snapshot:firebase.database.DataSnapshot) {
    const minimizedWindowOrder:string[]|null = snapshot.val()
    if (minimizedWindowOrder !== null) {
      this.handleMinimizedOrderChange(minimizedWindowOrder)
    }
  }

  handleMinimizedOrderChange(minimizedWindowOrder:string[]) {
    this.minimizedWindowOrder = minimizedWindowOrder
    this.state.minimizedWindows = []

    minimizedWindowOrder.forEach((id) => {
      const window = this.windows[id]
      if (window) {
        this.state.minimizedWindows.push(window)
      }
    })

    this.notifyStateChange()
  }

  registerDragWindow(window:Window|null, type:DragType=DragType.None) {
    this.dragInfo.window = window
    this.dragInfo.type = type
  }

  updateDragWindow(attrs: FirebaseWindowAttrs) {
    const {window} = this.dragInfo
    if (window) {
      window.setAttrs(attrs, this.syncChanges)
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
        this.moveToTop(window, true)
      })
      .catch((err) => {})
  }

  moveToTop(window:Window, forceSync:boolean = false) {
    const moveToTopInOrder = (order:string[]) => {
      const index = order.indexOf(window.id)
      if (index !== -1) {
        order.splice(index, 1)
      }
      order.push(window.id)
    }

    if (this.syncChanges || forceSync) {
      this.orderRef.once("value", (snapshot) => {
        const order:string[] = snapshot.val() || []
        moveToTopInOrder(order)
        this.orderRef.set(order)
      })
    }
    else {
      moveToTopInOrder(this.windowOrder)
      this.handleOrderChange(this.windowOrder)
    }
  }

  close(window:Window) {
    const removeFromOrder = (order:string[]) => {
      const index = order.indexOf(window.id)
      if (index !== -1) {
        order.splice(index, 1)
      }
    }

    const afterRemoving = () => {
      window.close()
      delete this.windows[window.id]
    }

    if (this.syncChanges) {
      this.orderRef.once("value", (snapshot) => {
        const order:string[] = snapshot.val() || []
        removeFromOrder(order)
        this.orderRef.set(order, afterRemoving)
      })
    }
    else {
      removeFromOrder(this.windowOrder)
      this.handleOrderChange(this.windowOrder)
      afterRemoving()
    }
  }

  restoreMinimized(window:Window) {
    this.setState(window, false, window.attrs.maximized)
    this.moveToTop(window)
  }

  setState(window:Window, minimized: boolean, maximized: boolean) {
    const {attrs} = window
    attrs.maximized = maximized
    attrs.minimized = minimized
    window.setAttrs(attrs, this.syncChanges)

    const toggleMinimized = (minimizedOrder:string[]) => {
      const index = minimizedOrder.indexOf(window.id)
      if (!minimized && (index !== -1)) {
        minimizedOrder.splice(index, 1)
      }
      else if (minimized && (index === -1)) {
        minimizedOrder.push(window.id)
      }
    }

    if (this.syncChanges) {
      this.minimizedOrderRef.once("value", (snapshot) => {
        const minimizedOrder:string[] = snapshot.val() || []
        toggleMinimized(minimizedOrder)
        this.minimizedOrderRef.set(minimizedOrder)
      })
    }
    else {
      toggleMinimized(this.minimizedWindowOrder)
      this.handleMinimizedOrderChange(this.minimizedWindowOrder)
    }
  }

  changeTitle(window:Window, newTitle:string) {
    const {attrs} = window
    attrs.title = newTitle
    window.setAttrs(attrs, this.syncChanges)
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
          readonly: this.document.isReadonly,
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