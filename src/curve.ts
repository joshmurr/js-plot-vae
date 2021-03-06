import Geometry from './geometry'
import { clamp } from './utils'

export default class Curve extends Geometry {
  private _t_step: number

  constructor(
    gl: WebGL2RenderingContext,
    _points: Array<number[]> | string,
    _t_step = 0.2
  ) {
    super(gl)
    this._t_step = _t_step
    if (typeof _points === 'string') {
      switch (_points) {
        case 'circle':
          this._verts = this.generateCircleVerts(64)
          break
        default:
          this._verts = [-1, -1, -1, 1, 1, 1]
      }
    } else {
      this._verts = this.computeNVertexCurve3D(_points)
      this._verts = this.normalizeVerts(this._verts)
    }
    this._indices = this.calcIndices()
    this._indexedGeometry = true
  }

  public linkProgram(_program: WebGLProgram) {
    /*
     * Finds all the relevant uniforms and attributes in the specified
     * program and links.
     */
    this._buffers.push(this.gl.createBuffer())

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffers[0])
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(this._verts),
      this.gl.STATIC_DRAW
    )

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)

    const positionAttrib = {
      i_Position: {
        location: this.gl.getAttribLocation(_program, 'i_Position'),
        num_components: 3,
        type: this.gl.FLOAT,
        size: 0,
      },
    }

    this._VAOs.push(this.gl.createVertexArray())
    const VAO_desc = [
      {
        vao: this._VAOs[0],
        buffers: [
          {
            buffer_object: this._buffers[0],
            stride: 0,
            attributes: positionAttrib,
          },
        ],
      },
    ]
    VAO_desc.forEach((VAO) => this.setupVAO(VAO.buffers, VAO.vao))
  }

  public updateVerts(_program: WebGLProgram, _verts: number[]) {
    this._verts = _verts
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffers[0])
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(this.normalizeVerts(_verts)),
      this.gl.STATIC_DRAW
    )
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    this._indices = this.calcIndices()
  }

  public generateCurveFromControlPoints(
    _program: WebGLProgram,
    _beziers: Array<Array<number[]>>
  ) {
    const curve = this.computeSeriesOfBeziers(_beziers)
    this.updateVerts(_program, curve)
  }

  public generateCurveFromRegression(
    _program: WebGLProgram,
    _func: (x: number) => number[]
  ) {
    const verts = []
    for (let t = 0; t <= 1; t += this._t_step) {
      verts.push(t, ..._func(t))
    }
    this.updateVerts(_program, verts)
  }

  private computeBinomial(n: number, k: number) {
    let value = 1
    for (let i = 1; i <= k; i++) {
      value = (value * (n + 1 - i)) / i
    }
    if (n == k) value = 1

    return value
  }

  private computeSeriesOfBeziers(_beziers: Array<Array<number[]>>) {
    const curveVerts: number[] = []

    const totalSteps = 1 / this._t_step
    const t_step = 1 / (totalSteps / _beziers.length)
    for (let i = 0; i < _beziers.length; i++) {
      const curve = this.computeNVertexCurve3D(_beziers[i], t_step)
      curveVerts.push(...curve)
    }

    return curveVerts
  }

  private computeNVertexCurve3D(
    points: Array<number[] | Float32Array>,
    t_step = 0
  ) {
    const curveVerts = []

    for (let t = 0; t <= 1; t += t_step || this._t_step) {
      let curveX = 0
      let curveY = 0
      let curveZ = 0

      for (let i = 0, n = points.length - 1; i <= n; i++) {
        const binomial =
          this.computeBinomial(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i)
        curveX += binomial * points[i][0]
        curveY += binomial * points[i][1]
        curveZ += binomial * points[i][2]
      }

      curveVerts.push(curveX, curveY, curveZ)
    }

    return curveVerts
  }

  private generateCircleVerts(n_segs: number) {
    const verts = []
    for (let i = 0; i < n_segs; i++) {
      const theta = ((Math.PI * 2) / n_segs) * i
      const x = Math.cos(theta) * 0.7
      const y = Math.sin(theta) * 0.7
      const z = 0

      verts.push(x, y, z)
    }
    return verts
  }

  public set t(val: number) {
    this._t_step = clamp(val, 0, 1)
  }
}
