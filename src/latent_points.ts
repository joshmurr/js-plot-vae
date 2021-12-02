import Geometry from './geometry'

interface DTypeDesc {
  data:
    | Uint8Array
    | Uint8Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Float32Array
    | Float64Array
  //| BigUint64Array
  //| BigInt64Array
  dtype: string
  shape: Array<number>
}

export default class LatentPoints extends Geometry {
  _data: DTypeDesc
  constructor(gl: WebGL2RenderingContext, _data: DTypeDesc) {
    super(gl)
    this._data = _data
    this._verts = Array.from(_data.data)

    this.centreVerts()
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
