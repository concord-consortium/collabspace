import * as React from "react"
import * as ReactDOM from "react-dom";
import { App } from "./components/app"

const styles = require('./styles/app.scss')

ReactDOM.render(
    <App />,
    document.getElementById("app")
);