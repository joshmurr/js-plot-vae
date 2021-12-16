import Geometry from './geometry'

export default class Curve extends Geometry {
  constructor(gl: WebGL2RenderingContext) {
    super(gl)
    this._verts = [
      -1.0,
      1.0,
      1.0, // 0
      1.0,
      1.0,
      1.0, // 1
      1.0,
      -1.0,
      1.0, // 2
      -1.0,
      -1.0,
      1.0, // 3
      -1.0,
      -1.0,
      -1.0, // 4
      -1.0,
      1.0,
      -1.0, // 5
      1.0,
      1.0,
      -1.0, // 6
      1.0,
      -1.0,
      -1.0, // 7
    ]
    this.normalizeVerts()
    // gl.LINES
    this._indices = [
      0, 1, 1, 2, 2, 3, 3, 0, 0, 5, 1, 6, 2, 7, 3, 4, 5, 6, 6, 7, 7, 4, 4, 5,
    ]

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
}
