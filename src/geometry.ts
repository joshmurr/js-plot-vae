import { vec3, mat4 } from 'gl-matrix'

/* INTERFACES */

interface AttribDesc {
  location: number // Attrib loc
  num_components: number
  type: number // GLENUM
  size: number
  divisor?: number
}

interface AllAttribDesc {
  i_Position?: AttribDesc
  i_Color?: AttribDesc
}

interface BufferDesc {
  buffer_object: WebGLBuffer
  stride: number
  attributes: AllAttribDesc
}

//interface VAODesc {
//vao: WebGLVertexArrayObject
//buffers: Array<BufferDesc>
//}

interface UniformDesc<T> {
  type: string
  location: WebGLUniformLocation
  value: T
}

interface RotationDesc {
  speed: number
  axis: [number, number, number]
}

/* GEOMETRY CLASS */

export default abstract class Geometry {
  gl: WebGL2RenderingContext

  _indexedGeometry = false
  _uniformsNeedsUpdate = false
  _translate: [number, number, number] = [0.0, 0.0, 0.0]
  _rotation: RotationDesc = { speed: 0, axis: [0, 0, 0] }
  _oscillate = false

  _verts: Array<number> = []
  _indices: Array<number> = []
  _normals: Array<number> = []
  _colors: Array<number> = []
  _buffers: Array<WebGLBuffer> = []
  _VAOs: Array<WebGLVertexArrayObject> = []

  _modelMatrix = mat4.create()

  _uniforms: { [key: string]: UniformDesc<Float32Array | number | mat4> } = {}
  _textures = {}

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
  }

  abstract linkProgram(_program: WebGLProgram): void

  setupVAO(_buffers: Array<BufferDesc>, _VAO: WebGLVertexArrayObject) {
    this.gl.bindVertexArray(_VAO)

    //for (const buffer of _buffers) {
    _buffers.map((buffer) => {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer.buffer_object)
      let offset = 0

      let attrib: keyof AllAttribDesc
      for (attrib in buffer.attributes) {
        //buffer.attributes.forEach((attrib_dec) => {
        const attrib_desc = buffer.attributes[attrib]
        this.gl.enableVertexAttribArray(attrib_desc.location)
        this.gl.vertexAttribPointer(
          attrib_desc.location,
          attrib_desc.num_components,
          attrib_desc.type,
          false, //attrib_desc.normalize,
          buffer.stride,
          offset
        )
        offset += attrib_desc.num_components * attrib_desc.size
        if (attrib_desc['divisor']) {
          this.gl.vertexAttribDivisor(attrib_desc.location, attrib_desc.divisor)
        }
      }
    })
    if (this._indexedGeometry) {
      const indexBuffer = this.gl.createBuffer()
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
      this.gl.bufferData(
        this.gl.ELEMENT_ARRAY_BUFFER,
        new Uint16Array(this._indices),
        this.gl.STATIC_DRAW
      )
    }
    // Empty Buffers:
    // !Important to unbind the VAO first.
    this.gl.bindVertexArray(null)
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null)
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null)
  }

  updateUniform(_uniform: string, _val: number) {
    if (_uniform in this._uniforms) {
      this._uniforms[_uniform].value = _val
    }
  }

  get VAO() {
    return this._VAOs[0]
  }

  get uniforms() {
    return this._uniforms
  }

  get numVertices() {
    return this._verts.length / 3
  }

  get numIndices() {
    return this._indices.length
  }

  get buffers() {
    return this._buffers
  }
  get translate() {
    return this._translate
  }
  set translate(loc) {
    this._uniformsNeedsUpdate = true
    this._translate[0] = loc[0]
    this._translate[1] = loc[1]
    this._translate[2] = loc[2]
  }
  set rotate(speedAxis: RotationDesc) {
    this._uniformsNeedsUpdate = true
    const [s, r] = Object.values(speedAxis)
    this._rotation.speed = s
    this._rotation.axis[0] = r[0]
    this._rotation.axis[1] = r[1]
    this._rotation.axis[2] = r[2]
  }

  set oscillate(val: boolean) {
    if (typeof val === 'boolean') this._oscillate = val
  }

  get needsUpdate() {
    return this._uniformsNeedsUpdate
  }

  updateModelMatrix(_time: number) {
    mat4.identity(this._modelMatrix)
    const translation = vec3.fromValues(...this._translate)
    mat4.translate(this._modelMatrix, this._modelMatrix, translation)
    mat4.rotate(
      this._modelMatrix,
      this._modelMatrix,
      (this._oscillate ? Math.sin(_time * 0.001) * 90 : _time) *
        this._rotation.speed,
      this._rotation.axis
    )

    return this._modelMatrix
  }

  updateInverseModelMatrix() {
    mat4.invert(
      this._uniforms['u_InverseModelMatrix'].value as mat4,
      this._uniforms['u_ModelMatrix'].value as mat4
    )
  }

  normalizeVerts() {
    for (let i = 0; i < this._verts.length; i += 3) {
      const norm = this.normalize(
        this._verts[i],
        this._verts[i + 1],
        this._verts[i + 2]
      )
      this._verts[i] = norm[0]
      this._verts[i + 1] = norm[1]
      this._verts[i + 2] = norm[2]
    }
  }

  normalize(a: number, b: number, c: number) {
    const len = Math.sqrt(a * a + b * b + c * c)
    return [a / len, b / len, c / len]
  }
}
