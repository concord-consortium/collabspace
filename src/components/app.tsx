import * as React from "react"
import * as firebase from "firebase"

export interface AppProps {}
export interface AppState {
  authUser: firebase.User|null
  authError: firebase.auth.Error|null
}

export class App extends React.Component<AppProps, AppState> {
  constructor (props:AppProps) {
    super(props)
    this.state = {
      authUser: null,
      authError: null
    }
  }

  componentWillMount() {
    firebase.initializeApp({
      apiKey: "AIzaSyCW8vg-bKrcQTaNiDHZvVd_CoGMsgztQ60",
      authDomain: "collabspace-920f6.firebaseapp.com",
      databaseURL: "https://collabspace-920f6.firebaseio.com",
      projectId: "collabspace-920f6",
      storageBucket: "collabspace-920f6.appspot.com",
      messagingSenderId: "987825465426"
    })

    firebase.auth().onAuthStateChanged((authUser) => {
      this.setState({authUser})
    })

    firebase.auth().signInAnonymously().catch((authError) => {
      this.setState({authError})
    })
  }

  renderFirebaseInfo() {
    const {authError, authUser} = this.state
    if (authError) {
      return <div className="firebase-error">{authError.message}</div>
    }
    if (authUser) {
      if (authUser.isAnonymous) {
        return <div>You are logged in as an anonymous user in Firebase</div>
      }
      return <div>{authUser.displayName} ({authUser.email})</div>
    }
    return <div>Not logged into Firebase...</div>
  }

  render() {
    return <div>
      <div className="hello">Hello, world from Travis!</div>
      <div className="firebase-info">
        {this.renderFirebaseInfo()}
      </div>
      </div>
  }
}