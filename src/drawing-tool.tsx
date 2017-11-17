import * as React from "react"
import * as ReactDOM from "react-dom";
import { DrawingToolComponent } from "./components/drawing-tool"

const styles = require('./styles/drawing-tool.scss')

ReactDOM.render(
    <DrawingToolComponent />,
    document.getElementById("drawing-tool")
)