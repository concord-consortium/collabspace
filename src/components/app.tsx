import * as React from "react"

export interface AppProps {}
export interface AppState {}

export class App extends React.Component<AppProps, AppState> {
  constructor (props:AppProps) {
    super(props)
    this.state = {}
  }

  render() {
    return <div className="hello">Hello, world!</div>
  }
}