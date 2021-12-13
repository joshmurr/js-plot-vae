import { vec3, mat4 } from 'gl-matrix'

type UniformDescs = {
  [key: string]: number | number[] | mat4 | vec3
}

interface TypeInfo {
  constant: string
  setterFn?: any
}

interface UniformSetter extends TypeInfo {
  location: WebGLUniformLocation
  setter: any
}

type UniformSetters = {
  [key: string]: UniformSetter
}

type TypeMap = { [key: number]: TypeInfo }

interface Camera {
  pos?: vec3
  up?: vec3
  target?: vec3
}

export default class GL_Handler {
  private _gl: WebGL2RenderingContext

  public canvas(width: number, height: number, _premultAlpha = false) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    document.body.appendChild(canvas)
    this._gl = canvas.getContext('webgl2', {
      premultipliedAlpha: _premultAlpha,
    })

    if (!this._gl) {
      console.warn("You're browser does not support WebGL 2.0. Soz.")
      return
    }
    return canvas
  }

  public shaderProgram(
    vsSource: string,
    fsSource: string
  ): WebGLProgram | null {
    const shaderProgram = this._gl.createProgram()
    const vertexShader = this.loadShader(this._gl.VERTEX_SHADER, vsSource)
    const fragmentShader = this.loadShader(this._gl.FRAGMENT_SHADER, fsSource)
    this._gl.attachShader(shaderProgram, vertexShader)
    this._gl.attachShader(shaderProgram, fragmentShader)

    this._gl.linkProgram(shaderProgram)

    if (!this._gl.getProgramParameter(shaderProgram, this._gl.LINK_STATUS)) {
      alert(
        'Unable to initialize the shader program: ' +
          this._gl.getProgramInfoLog(shaderProgram)
      )
      return null
    }

    return shaderProgram
  }

  private loadShader(type: number, source: string): WebGLShader {
    const shader = this._gl.createShader(type)
    this._gl.shaderSource(shader, source)
    this._gl.compileShader(shader)

    if (!this._gl.getShaderParameter(shader, this._gl.COMPILE_STATUS)) {
      alert(
        'An error occurred compiling the shaders: ' +
          this._gl.getShaderInfoLog(shader)
      )
      this._gl.deleteShader(shader)
      return null
    }
    return shader
  }

  public getUniformSetters(program: WebGLProgram): UniformSetters {
    const numUniforms = this._gl.getProgramParameter(
      program,
      this._gl.ACTIVE_UNIFORMS
    )

    const uniformSetters: UniformSetters = {}

    for (let ii = 0; ii < numUniforms; ++ii) {
      const uniformInfo = this._gl.getActiveUniform(program, ii)

      let name = uniformInfo.name
      // remove the array suffix.
      if (name.endsWith('[0]')) {
        name = name.substr(0, name.length - 3)
      }
      const location = this._gl.getUniformLocation(program, uniformInfo.name)
      // the uniform will have no location if it's in a uniform block

      const { constant, setterFn } = this.typeMap[uniformInfo.type]

      const setter = setterFn(this._gl)

      uniformSetters[name] = {
        location,
        constant,
        setter: setter,
      }
    }

    return uniformSetters
  }

  public setUniforms(setters: UniformSetters, uniforms: UniformDescs): void {
    for (const name in uniforms) {
      const values = uniforms[name]
      const { location, setter } = setters[name]
      setter(location, values)
    }
  }

  public createTexture(
    w: number,
    h: number,
    data: Uint8Array | Float32Array = null
  ): WebGLTexture {
    const texture = this._gl.createTexture()
    this._gl.bindTexture(this._gl.TEXTURE_2D, texture)
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RGBA,
      w,
      h,
      0,
      this._gl.RGBA,
      this._gl.UNSIGNED_BYTE,
      data
    )
    //this._gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    //this._gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_MIN_FILTER,
      this._gl.LINEAR
    )
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_WRAP_S,
      this._gl.CLAMP_TO_EDGE
    )
    this._gl.texParameteri(
      this._gl.TEXTURE_2D,
      this._gl.TEXTURE_WRAP_T,
      this._gl.CLAMP_TO_EDGE
    )

    return texture
  }

  public createFramebuffer(tex: WebGLTexture): WebGLFramebuffer {
    const fb = this._gl.createFramebuffer()
    this._gl.bindFramebuffer(this._gl.FRAMEBUFFER, fb)
    this._gl.framebufferTexture2D(
      this._gl.FRAMEBUFFER,
      this._gl.COLOR_ATTACHMENT0,
      this._gl.TEXTURE_2D,
      tex,
      0
    )
    return fb
  }

  public setFramebufferAttachmentSizes(
    width: number,
    height: number,
    targetTex: WebGLTexture,
    depthBuffer: WebGLRenderbuffer
  ) {
    this._gl.bindTexture(this._gl.TEXTURE_2D, targetTex)
    this._gl.texImage2D(
      this._gl.TEXTURE_2D,
      0,
      this._gl.RGBA,
      width,
      height,
      0,
      this._gl.RGBA,
      this._gl.UNSIGNED_BYTE,
      null
    )

    this._gl.bindRenderbuffer(this._gl.RENDERBUFFER, depthBuffer)
    this._gl.renderbufferStorage(
      this._gl.RENDERBUFFER,
      this._gl.DEPTH_COMPONENT16,
      width,
      height
    )
  }

  public viewMat(opts?: Camera): mat4 {
    const defaultOpts: Camera = {
      pos: vec3.fromValues(0, 0, 1),
      up: vec3.fromValues(0, 1, 0),
      target: vec3.fromValues(0, 0, 0),
    }

    if (opts) {
      Object.assign(defaultOpts, opts)
    }

    return mat4.lookAt(
      mat4.create(),
      defaultOpts.pos,
      defaultOpts.target,
      defaultOpts.up
    )
  }

  public defaultProjMat(): mat4 {
    const fieldOfView = (45 * Math.PI) / 180
    const aspect = this.aspect
    const zNear = 0.1
    const zFar = 100.0

    return mat4.perspective(mat4.create(), fieldOfView, aspect, zNear, zFar)
  }

  //public

  public get gl(): WebGL2RenderingContext {
    return this._gl
  }

  public set gl(gl: WebGL2RenderingContext) {
    this._gl = gl
  }

  public get aspect(): number {
    return this._gl.canvas.clientWidth / this._gl.canvas.clientHeight
  }

  //prettier-ignore
  private typeMap: TypeMap = {
    0x84c0: { constant: 'TEXTURE0'                                   , setterFn: null},
    0x88e8: { constant: 'DYNAMIC_DRAW'                               , setterFn: null},
    0x8892: { constant: 'ARRAY_BUFFER'                               , setterFn: null},
    0x8893: { constant: 'ELEMENT_ARRAY_BUFFER'                       , setterFn: null},
    0x8a11: { constant: 'UNIFORM_BUFFER'                             , setterFn: null},
    0x8c8e: { constant: 'TRANSFORM_FEEDBACK_BUFFER'                  , setterFn: null},
    0x8e22: { constant: 'TRANSFORM_FEEDBACK'                         , setterFn: null},
    0x8b81: { constant: 'COMPILE_STATUS'                             , setterFn: null},
    0x8b82: { constant: 'LINK_STATUS'                                , setterFn: null},
    0x8b30: { constant: 'FRAGMENT_SHADER'                            , setterFn: null},
    0x8b31: { constant: 'VERTEX_SHADER'                              , setterFn: null},
    0x8c8d: { constant: 'SEPARATE_ATTRIBS'                           , setterFn: null},
    0x8b86: { constant: 'ACTIVE_UNIFORMS'                            , setterFn: null},
    0x8b89: { constant: 'ACTIVE_ATTRIBUTES'                          , setterFn: null},
    0x8c83: { constant: 'TRANSFORM_FEEDBACK_VARYINGS'                , setterFn: null},
    0x8a36: { constant: 'ACTIVE_UNIFORM_BLOCKS'                      , setterFn: null},
    0x8a44: { constant: 'UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER'  , setterFn: null},
    0x8a46: { constant: 'UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER', setterFn: null},
    0x8a40: { constant: 'UNIFORM_BLOCK_DATA_SIZE'                    , setterFn: null},
    0x8a43: { constant: 'UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES'       , setterFn: null},
    0x1406: { constant: 'FLOAT'                                      , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number  ) => gl.uniform1f(loc, val)},
    0x8B50: { constant: 'FLOAT_VEC2'                                 , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform2fv(loc, val)},
    0x8B51: { constant: 'FLOAT_VEC3'                                 , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform3fv(loc, val)},
    0x8B52: { constant: 'FLOAT_VEC4'                                 , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform4fv(loc, val)},
    0x1404: { constant: 'INT'                                        , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number  ) => gl.uniform1i(loc, val) },
    0x8B53: { constant: 'INT_VEC2'                                   , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform2iv(loc, val)},
    0x8B54: { constant: 'INT_VEC3'                                   , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform3iv(loc, val)},
    0x8B55: { constant: 'INT_VEC4'                                   , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform4iv(loc, val)},
    0x8B56: { constant: 'BOOL'                                       , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number  ) => gl.uniform1i(loc, val) },
    0x8B57: { constant: 'BOOL_VEC2'                                  , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform2iv(loc, val)},
    0x8B58: { constant: 'BOOL_VEC3'                                  , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform3iv(loc, val)},
    0x8B59: { constant: 'BOOL_VEC4'                                  , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniform4iv(loc, val)},
    0x8B5A: { constant: 'FLOAT_MAT2'                                 , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix2fv(loc, false, val)},
    0x8B5B: { constant: 'FLOAT_MAT3'                                 , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix3fv(loc, false, val)},
    0x8B5C: { constant: 'FLOAT_MAT4'                                 , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix4fv(loc, false, val)},
    0x8B5E: { constant: 'SAMPLER_2D'                                 , setterFn: null},
    0x8B60: { constant: 'SAMPLER_CUBE'                               , setterFn: null},
    0x8B5F: { constant: 'SAMPLER_3D'                                 , setterFn: null},
    0x8B62: { constant: 'SAMPLER_2D_SHADOW'                          , setterFn: null},
    0x8B65: { constant: 'FLOAT_MAT2x3'                               , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix2x3fv(loc, false, val)},
    0x8B66: { constant: 'FLOAT_MAT2x4'                               , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix2x4fv(loc, false, val)},
    0x8B67: { constant: 'FLOAT_MAT3x2'                               , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix3x2fv(loc, false, val)},
    0x8B68: { constant: 'FLOAT_MAT3x4'                               , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix3x4fv(loc, false, val)},
    0x8B69: { constant: 'FLOAT_MAT4x2'                               , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix4x2fv(loc, false, val)},
    0x8B6A: { constant: 'FLOAT_MAT4x3'                               , setterFn: (gl: WebGL2RenderingContext) => (loc: WebGLUniformLocation, val: number[]) => gl.uniformMatrix4x3fv(loc, false, val)},
    0x8DC1: { constant: 'SAMPLER_2D_ARRAY'                           , setterFn: null},
    0x8DC4: { constant: 'SAMPLER_2D_ARRAY_SHADOW'                    , setterFn: null},
    0x8DC5: { constant: 'SAMPLER_CUBE_SHADOW'                        , setterFn: null},
    0x1405: { constant: 'UNSIGNED_INT'                               , setterFn: null},
    0x8DC6: { constant: 'UNSIGNED_INT_VEC2'                          , setterFn: null},
    0x8DC7: { constant: 'UNSIGNED_INT_VEC3'                          , setterFn: null},
    0x8DC8: { constant: 'UNSIGNED_INT_VEC4'                          , setterFn: null},
    0x8DCA: { constant: 'INT_SAMPLER_2D'                             , setterFn: null},
    0x8DCB: { constant: 'INT_SAMPLER_3D'                             , setterFn: null},
    0x8DCC: { constant: 'INT_SAMPLER_CUBE'                           , setterFn: null},
    0x8DCF: { constant: 'INT_SAMPLER_2D_ARRAY'                       , setterFn: null},
    0x8DD2: { constant: 'UNSIGNED_INT_SAMPLER_2D'                    , setterFn: null},
    0x8DD3: { constant: 'UNSIGNED_INT_SAMPLER_3D'                    , setterFn: null},
    0x8DD4: { constant: 'UNSIGNED_INT_SAMPLER_CUBE'                  , setterFn: null},
    0x8DD7: { constant: 'UNSIGNED_INT_SAMPLER_2D_ARRAY'              , setterFn: null},
    0x0DE1: { constant: 'TEXTURE_2D'                                 , setterFn: null},
    0x8513: { constant: 'TEXTURE_CUBE_MAP'                           , setterFn: null},
    0x806F: { constant: 'TEXTURE_3D'                                 , setterFn: null},
    0x8C1A: { constant: 'TEXTURE_2D_ARRAY'                           , setterFn: null},
  }
}
