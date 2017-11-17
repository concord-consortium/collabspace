import * as React from "react"

declare const DrawingTool:any

export interface DrawingToolComponentProps {
}

export interface DrawingToolComponentState {
}

export class DrawingToolComponent extends React.Component<DrawingToolComponentProps, DrawingToolComponentState> {
  drawingTool: any|null
  resizeTimeout: number|null

  constructor (props:DrawingToolComponentProps) {
    super(props)
    this.state = {
    }
    this.debounceResize = this.debounceResize.bind(this)
    this.resize = this.resize.bind(this)
  }

  refs: {
    container: HTMLDivElement
  }

  componentDidMount() {
    this.drawingTool = new DrawingTool("#drawing-tool-container", {
      firebaseKey: 'codraw',
      stamps: {
        'coins': ['vendor/drawing-tool/pouch-30px.png','vendor/drawing-tool/coin-25px.png', 'vendor/drawing-tool/equals-30px.png']
      },
      parseSVG: true
    })
    this.resize()
    window.addEventListener("resize", this.debounceResize, false)
  }

  componentWillUnmount() {
    window.removeEventListener("resize", this.debounceResize, false)
  }

  shouldComponentUpdate() {
    return false
  }

  debounceResize() {
    if (!this.resizeTimeout) {
      this.resizeTimeout = window.setTimeout(() => {
        this.resizeTimeout = null
        this.resize()
      }, 300)
    }
  }

  resize() {
    if (this.drawingTool) {
      const {container} = this.refs
      this.drawingTool.setDimensions(container.clientWidth - 65, container.clientHeight)
      this.drawingTool.canvas.renderAll()
    }
  }

  render() {
    return (
      <div className="drawing-tool-wrapper">
        <div ref="container" id="drawing-tool-container" />
      </div>
    )
  }
}
