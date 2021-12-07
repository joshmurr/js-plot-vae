import Geometry from './geometry'
import { generateColourPalette } from './utils'

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
  _labels: DTypeDesc
  _unique_labels: Set<number>
  constructor(
    gl: WebGL2RenderingContext,
    _data: DTypeDesc,
    _labels: DTypeDesc = null
  ) {
    super(gl)
    this._data = _data
    this._verts = Array.from(_data.data)
    this._labels = _labels
    this._unique_labels = new Set(_labels.data)

    const pallette = generateColourPalette(this._unique_labels.size)

    for (let i = 0; i < this._labels.data.length; i++) {
      this._colors.push(...pallette[this._labels.data[i]])
    }

    this.centreVerts()
  }
  linkProgram(_program: WebGLProgram) {
    /*
     * Finds all the relevant uniforms and attributes in the specified
     * program and links.
     */
    this._buffers.push(this.gl.createBuffer(), this.gl.createBuffer())

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffers[0])
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(this._verts),
      this.gl.STATIC_DRAW
    )
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffers[1])
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(this._colors),
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

    const colorAttrib = {
      i_Color: {
        location: this.gl.getAttribLocation(_program, 'i_Color'),
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
          {
            buffer_object: this._buffers[1],
            stride: 0,
            attributes: colorAttrib,
          },
        ],
      },
    ]
    VAO_desc.forEach((VAO) => this.setupVAO(VAO.buffers, VAO.vao))
  }
}
