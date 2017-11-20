export interface FirebaseWindowProps {
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

export interface FirebaseWindowPropsMap {
  [key: string]: FirebaseWindowProps|null
}

export interface FirebaseWindowDataMap {
  [key: string]: any|null
}

export interface FirebaseWindow {
  props: FirebaseWindowPropsMap
  order: string[]
  minimizedOrder: string[]
  data: FirebaseWindowDataMap
}

export interface FirebaseWindowMap {
  [key: string]: FirebaseWindow
}

