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

  componentDidMount() {
    this.drawingTool = new DrawingTool("#drawing-tool-container", {
      firebaseKey: 'codraw',
      stamps: {
        'coins': ['vendor/drawing-tool/pouch-30px.png','vendor/drawing-tool/coin-25px.png', 'vendor/drawing-tool/equals-30px.png']
      },
      parseSVG: true
    })
    this.resize()
  }

  componentWillUnmount() {
    window.addEventListener("resize", this.debounceResize, false)
  }

  shouldComponentUpdate() {
    return false
  }

  debounceResize() {
    if (!this.resizeTimeout ) {
      this.resizeTimeout = window.setTimeout(() => {
        this.resizeTimeout = null
        this.resize()
      }, 300)
    }
  }

  resize() {
    if (this.drawingTool) {
      this.drawingTool.setDimensions(window.innerWidth - 55, Math.max(window.innerHeight - 10,600))
      this.drawingTool.canvas.renderAll()
    }
  }

  render() {
    return <div id="drawing-tool-container" />
  }
}
