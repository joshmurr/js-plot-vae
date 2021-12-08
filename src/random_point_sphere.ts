import Geometry from './geometry'

export default class RandomPointSphere extends Geometry {
  _numPoints: number
  constructor(gl: WebGL2RenderingContext, _numPoints: number) {
    super(gl)
    this._numPoints = _numPoints
    this._verts = []
    // Generate random vertices on the unit sphere
    for (let i = 0; i < _numPoints; i++) {
      const u = Math.random() * Math.PI * 2
      const v = Math.random() * Math.PI * 2
      this._verts.push(
        Math.sin(u) * Math.cos(v),
        Math.sin(u) * Math.sin(v),
        Math.cos(u)
      )
    }
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
        size: 4,
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
}
