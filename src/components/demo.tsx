import * as React from "react"
import { Document } from "../lib/document"
import * as firebase from "firebase"

const demoInfo = require("../../functions/demo-info").demoInfo;

export interface DemoComponentProps {
  firebaseUser: firebase.User
  document: Document
  demoId: string
}

export interface DemoComponentState {
}

export class DemoComponent extends React.Component<DemoComponentProps, DemoComponentState> {

  constructor (props:DemoComponentProps) {
    super(props);
    this.state = {
    }
  }

  renderStudentLinks() {
    const links = []
    const hash = window.location.hash
    for (let i=0; i < demoInfo.numStudents; i++) {
      const userId = i + 1;
      links.push(<div key={i}><a href={`?demo=${this.props.demoId}&token=${userId}&domain=${demoInfo.rootUrl}&domain_uid=${userId}#document=${this.props.document.getHashParam()}`}>Student {userId}</a></div>)
    }
    return links
  }

  render() {
    return (
      <div className="demo">
        <h1>Demo Links</h1>
        {this.renderStudentLinks()}
      </div>
    )
  }
}
