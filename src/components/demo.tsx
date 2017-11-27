import * as React from "react"
import { Document } from "../lib/document"
import * as firebase from "firebase"
import { AppQueryParams, AppHashParams } from "./app"
import * as queryString from "query-string"

const demoInfo = require("../../functions/demo-info").demoInfo;

export interface DemoComponentProps {
  firebaseUser: firebase.User
  template: Document
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
    const templateParam = this.props.template.getTemplateHashParam()
    for (let i=0; i < demoInfo.numStudents; i++) {
      const userId = i + 1;
      const queryParams:AppQueryParams = {
        demo: this.props.demoId,
        token: userId,
        domain: demoInfo.rootUrl,
        domain_uid: userId
      }
      const hashParams:AppHashParams = {
        template: templateParam
      }
      const url = `?${queryString.stringify(queryParams)}#${queryString.stringify(hashParams)}`
      links.push(<div key={i}><a href={url} target="_blank">Student {userId}</a></div>)
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
