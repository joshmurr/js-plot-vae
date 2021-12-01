import { mat4, vec3 } from 'gl-matrix'
import Geometry from './geometry'

interface DrawParams {
  clearColor: [number, number, number, number]
  clearDepth: [number]
  clear: [string, string]
  viewport: [number, number, number, number]
  enable: [string, string]
}

interface UniformDesc {
  type: string
  location: WebGLUniformLocation
  value: any
}

interface ProgramDesc {
  shader: WebGLProgram
  mode: string
  geometry: Array<Geometry>
  uniformNeedsUpdate: boolean
  globalUniforms: { [key: string]: UniformDesc }
  geometryUniforms: { [key: string]: UniformDesc }
  uniformBuffers: { [key: string]: WebGLBuffer }
  drawParams: DrawParams
}

export default class Renderer {
  gl: WebGL2RenderingContext
  _canvas: HTMLCanvasElement
  _HEIGHT: number
  _WIDTH: number

  _programs: { [key: string]: ProgramDesc } = {}
  _textures = {}
  _framebuffers = {}
  _time = 0.0
  _oldTimestamp = 0.0
  _deltaTime = 0.0
  _mouse: [number, number] = [0, 0]
  _click = 0

  _fieldOfView = (45 * Math.PI) / 180
  _aspect = 1 // Default, to be changed on init
  _zNear = 0.1
  _zFar = 100.0
  _projectionMat = mat4.create()

  _viewMat = mat4.create()
  _position = vec3.fromValues(0, 0, 2)
  _target = vec3.fromValues(0, 0, 0)
  _up = vec3.fromValues(0, 1, 0)

  init(width: number, height: number, _premultAlpha = false) {
    this._canvas = document.createElement('canvas')
    this._canvas.width = this._WIDTH = width
    this._canvas.height = this._HEIGHT = height
    document.body.appendChild(this._canvas)
    this.gl = this._canvas.getContext('webgl2', {
      premultipliedAlpha: _premultAlpha,
    })
    this._aspect = this.gl.canvas.clientWidth / this.gl.canvas.clientHeight
    if (!this.gl) {
      console.warn("You're browser does not support WebGL 2.0. Soz.")
      return
    }
  }

  initShaderProgram(
    name: string,
    vsSource: string,
    fsSource: string,
    _mode: string
  ): void {
    const shaderProgram = this.gl.createProgram()
    const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource)
    const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource)
    this.gl.attachShader(shaderProgram, vertexShader)
    this.gl.attachShader(shaderProgram, fragmentShader)

    this.gl.linkProgram(shaderProgram)

    if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
      alert(
        'Unable to initialize the shader program: ' +
          this.gl.getProgramInfoLog(shaderProgram)
      )
      return null
    }

    this._programs[name] = {
      shader: shaderProgram,
      mode: _mode,
      geometry: [],
      uniformNeedsUpdate: false,
      globalUniforms: {},
      geometryUniforms: {},
      uniformBuffers: {},
      drawParams: {
        clearColor: [0.95, 0.95, 0.95, 1.0],
        clearDepth: [1.0],
        clear: ['COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT'],
        viewport: [0, 0, this.gl.canvas.width, this.gl.canvas.height],
        enable: ['CULL_FACE', 'DEPTH_TEST'],
      },
    }
  }

  loadShader(type: number, source: string) {
    const shader = this.gl.createShader(type)
    this.gl.shaderSource(shader, source)
    this.gl.compileShader(shader)

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      alert(
        'An error occurred compiling the shaders: ' +
          this.gl.getShaderInfoLog(shader)
      )
      this.gl.deleteShader(shader)
      return null
    }
    return shader
  }

  initProgramUniforms(_program: string, _uniforms: Array<string>) {
    const program = this.getProgram(_program)
    const globalUniforms = program.globalUniforms
    const shaderProgram = program.shader
    for (const uniform of _uniforms) {
      switch (uniform) {
        case 'u_TimeDelta': {
          this._programs[_program].uniformNeedsUpdate = true
          globalUniforms['u_TimeDelta'] = {
            type: 'uniform1fv',
            value: [this._deltaTime / 1000.0],
            location: this.gl.getUniformLocation(shaderProgram, 'u_TimeDelta'),
          }
          break
        }
        case 'u_TotalTime': {
          this._programs[_program].uniformNeedsUpdate = true
          globalUniforms['u_TotalTime'] = {
            type: 'uniform1fv',
            value: [this._time / 1000.0],
            location: this.gl.getUniformLocation(shaderProgram, 'u_TotalTime'),
          }
          break
        }
        case 'u_Resolution': {
          globalUniforms['u_Resolution'] = {
            type: 'uniform2fv',
            value: [this.gl.canvas.width, this.gl.canvas.height],
            location: this.gl.getUniformLocation(shaderProgram, 'u_Resolution'),
          }
          break
        }
        case 'u_Mouse': {
          this._programs[_program].uniformNeedsUpdate = true
          globalUniforms['u_Mouse'] = {
            type: 'uniform2fv',
            value: this._mouse,
            location: this.gl.getUniformLocation(shaderProgram, 'u_Mouse'),
          }
          this.initMouseMove()
          break
        }
        case 'u_Click': {
          this._programs[_program].uniformNeedsUpdate = true
          globalUniforms['u_Click'] = {
            type: 'uniform1i',
            value: this._click,
            location: this.gl.getUniformLocation(shaderProgram, 'u_Click'),
          }
          this.initMouseClick()
          break
        }
        case 'u_ProjectionMatrix': {
          globalUniforms['u_ProjectionMatrix'] = {
            type: 'uniformMatrix4fv',
            value: this._projectionMat,
            location: this.gl.getUniformLocation(
              shaderProgram,
              'u_ProjectionMatrix'
            ),
          }
          break
        }
        case 'u_ViewMatrix': {
          globalUniforms['u_ViewMatrix'] = {
            type: 'uniformMatrix4fv',
            value: this._viewMat,
            location: this.gl.getUniformLocation(shaderProgram, 'u_ViewMatrix'),
          }
          break
        }
      }
    }
    this.updateGlobalUniforms(globalUniforms)
  }

  initGeometryUniforms(_program: string, _uniforms: Array<string>): void {
    const program = this.getProgram(_program)
    const shaderProgram = program.shader
    const geometryUniforms = program.geometryUniforms

    for (const uniform of _uniforms) {
      switch (uniform) {
        case 'u_ModelMatrix': {
          geometryUniforms['u_ModelMatrix'] = {
            type: 'uniformMatrix4fv',
            value: mat4.create(),
            location: this.gl.getUniformLocation(
              shaderProgram,
              'u_ModelMatrix'
            ),
          }
          break
        }
      }
    }
  }

  updateGlobalUniforms(_uniforms: { [key: string]: UniformDesc }): void {
    for (const uniform in _uniforms) {
      if (_uniforms.hasOwnProperty(uniform)) {
        switch (uniform) {
          case 'u_TimeDelta': {
            _uniforms[uniform].value = [this._deltaTime / 1000.0]
            break
          }
          case 'u_TotalTime': {
            _uniforms[uniform].value = [this._time / 1000.0]
            break
          }
          case 'u_Resolution': {
            _uniforms[uniform].value = [
              this.gl.canvas.width,
              this.gl.canvas.height,
            ]
            break
          }
          case 'u_Mouse': {
            _uniforms[uniform].value = this._mouse
            break
          }
          case 'u_Click': {
            _uniforms[uniform].value = this._click
            break
          }
          case 'u_ProjectionMatrix': {
            mat4.perspective(
              _uniforms[uniform].value,
              this._fieldOfView,
              this._aspect,
              this._zNear,
              this._zFar
            )
            break
          }
          case 'u_ViewMatrix': {
            mat4.lookAt(
              _uniforms[uniform].value,
              this._position,
              this._target,
              this._up
            )
            break
          }
        }
      }
    }
  }

  updateGeometryUniforms(
    _geometry: Geometry,
    _uniforms: { [key: string]: UniformDesc }
  ): void {
    for (const uniform in _uniforms) {
      if (_uniforms.hasOwnProperty(uniform)) {
        switch (uniform) {
          case 'u_ModelMatrix': {
            _uniforms[uniform].value = _geometry.updateModelMatrix(this._time)
            break
          }
        }
      }
    }
  }

  getProgram(_program: string): ProgramDesc {
    try {
      const program = this._programs[_program]
      if (!program) throw new TypeError()
      else return program
    } catch (err) {
      if (err instanceof TypeError) {
        console.error(
          `Shader Program '${_program}' is not found, did you mean: '${Object.keys(
            this._programs
          )}'?`
        )
      }
    }
  }

  initMouseMove(): void {
    this._canvas.addEventListener('mousemove', (e) => {
      this._mouse[0] = (2.0 * e.clientX) / this._WIDTH - 1.0
      this._mouse[1] = -((2.0 * e.clientY) / this._HEIGHT - 1.0)
    })
  }

  initMouseClick(): void {
    this._canvas.addEventListener('mousedown', (event) => {
      // https://stackoverflow.com/questions/9500743/js-detect-right-click-without-jquery-inline
      const e = <any>event || window.event
      e.preventDefault()
      if (!e.which && e.button !== undefined) {
        e.which = e.button & 1 ? 1 : e.button & 2 ? 3 : e.button & 4 ? 2 : 0
      }
      switch (e.which) {
        case 1: {
          // Left
          if (this._shiftKeyDown) this._click = 2
          else this._click = 1
          break
        }
        case 2:
          this._click = 2
          break // Middle
        case 3:
          this._click = 3
          break // Right
      }
    })
    this._canvas.addEventListener('mouseup', (e) => {
      this._click = 0
    })
  }
}
