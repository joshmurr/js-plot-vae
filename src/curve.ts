import Geometry from './geometry'

export default class Curve extends Geometry {
  constructor(gl: WebGL2RenderingContext, _points: Array<number[]> | string) {
    super(gl)
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
      this.normalizeVerts()
    }
    this._indices = this.calcIndices()
    this._indexedGeometry = true
  }

  linkProgram(_program: WebGLProgram) {
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

  private computeBinomial(n: number, k: number) {
    let value = 1
    for (let i = 1; i <= k; i++) {
      value = (value * (n + 1 - i)) / i
    }
    if (n == k) value = 1

    return value
  }

  private computeNVertexCurve3D(points: Array<number[]>) {
    const curveVerts = []

    for (let t = 0; t <= 1; t += 0.01) {
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
}
