import Geometry from './geometry'
import { generateColourPalette, generateColourUids } from './utils'

interface DTypeDesc {
  data:
    | Uint8Array
    | Uint8Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Float32Array
    | Float64Array
  dtype: string
  shape: Array<number>
}

export default class LatentPoints extends Geometry {
  private _num_color_components: number
  private _num_uid_components: number
  private _uids: Array<number>
  private _data: DTypeDesc
  private _labels: DTypeDesc
  private _unique_labels: Set<number>
  private _pallette: Array<number[]>
  private _selected_class_label: number

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

    this.initColourPalette()

    /* Generate UID colour */
    this._num_uid_components = 3
    this._uids = generateColourUids(
      this._verts.length,
      this._num_uid_components
    )
  }

  private initColourPalette(selected_id = -1) {
    /* Generate Point colour from label */
    this._num_color_components = 3
    this._pallette = generateColourPalette(
      this._unique_labels.size,
      selected_id
    )
    this._colors = []
    for (let i = 0; i < this._labels.data.length; i++) {
      this._colors.push(...this._pallette[this._labels.data[i]])
    }
  }

  public selectClassLabel(selected: number) {
    this._selected_class_label =
      this._selected_class_label === selected ? -1 : selected

    this.initColourPalette(this._selected_class_label)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffers[1])
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(this._colors),
      this.gl.STATIC_DRAW
    )
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
  }

  public linkProgram(_program: WebGLProgram) {
    /*
     * Finds all the relevant uniforms and attributes in the specified
     * program and links.
     */
    this._buffers.push(
      this.gl.createBuffer(),
      this.gl.createBuffer(),
      this.gl.createBuffer()
    )

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
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this._buffers[2])
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array(this._uids),
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
        num_components: this._num_color_components,
        type: this.gl.FLOAT,
        size: 4,
      },
    }

    const uidAttrib = {
      i_Uid: {
        location: this.gl.getAttribLocation(_program, 'i_Uid'),
        num_components: this._num_uid_components,
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
          {
            buffer_object: this._buffers[2],
            stride: 0,
            attributes: uidAttrib,
          },
        ],
      },
    ]
    VAO_desc.forEach((VAO) => this.setupVAO(VAO.buffers, VAO.vao))
  }

  public get uids() {
    return this._uids
  }

  public get pallette() {
    return this._pallette
  }
}
