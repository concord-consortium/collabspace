import * as React from "react"
import * as firebase from "firebase"

export interface MinimizedWindowComponentProps {
  id: string
  title: string
  restoreMinimizedWindow: (id:string) => void
}
export interface MinimizedWindowComponentState {
}

export class MinimizedWindowComponent extends React.Component<MinimizedWindowComponentProps, MinimizedWindowComponentState> {
  windowRef: firebase.database.Reference

  constructor (props:MinimizedWindowComponentProps) {
    super(props)
    this.state = {}
  }

  render() {
    return (
      <div className="minimized-window" onClick={(e) => this.props.restoreMinimizedWindow(this.props.id)}>
        <div className="mini-window">
          <div className="titlebar"></div>
          <div className="iframe"></div>
        </div>
        <div className="title">{this.props.title}</div>
      </div>
    )
  }
}