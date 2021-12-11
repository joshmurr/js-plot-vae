import { vec3, mat4 } from 'gl-matrix'

export default class Arcball {
  private _radius: number
  private _startMatrix: mat4
  private _currentMatrix: mat4
  private _FOV = 30
  private _translation_factor = 0.1
  private _width: number
  private _height: number
  private _isRotating = false
  private _startRotationVector: vec3
  private _currentRotationVector: vec3
  private _transX = 0
  private _transY = 0
  private _startTransX = 0
  private _startTransY = 0
  private _currentTransX = 0
  private _currentTransY = 0

  constructor(width: number, height: number) {
    this._width = width
    this._height = height
    this._radius = Math.floor(Math.min(width, height) / 2)
    this._startMatrix = mat4.create()
    this._currentMatrix = mat4.create()
  }

  public startRotation(_x: number, _y: number) {
    const { x, y } = this.remapXY(_x, _y)

    this._startRotationVector = this.convertXY(x, y)
    vec3.normalize(this._startRotationVector, this._startRotationVector)

    this._currentRotationVector = vec3.clone(this._startRotationVector)
    this._isRotating = true
  }

  public updateRotation(_x: number, _y: number) {
    const { x, y } = this.remapXY(_x, _y)

    this._currentRotationVector = this.convertXY(x, y)
    vec3.normalize(this._currentRotationVector, this._currentRotationVector)
  }
  private remapXY(_x: number, _y: number) {
    // Unintuitive inversion works better
    // for some reason
    const x = -2 * (_x / this._width) - 1
    const y = 2 * (_y / this._height) + 1

    return { x, y }
  }

  public applyRotationMatrix(_matrix: mat4) {
    if (this._isRotating) {
      const diff = vec3.create()
      vec3.sub(diff, this._currentRotationVector, this._startRotationVector)
      if (vec3.len(diff) > 1e-6) {
        const rotationAxis = vec3.create()
        vec3.cross(
          rotationAxis,
          this._currentRotationVector,
          this._startRotationVector
        )
        vec3.normalize(rotationAxis, rotationAxis)

        let val = vec3.dot(
          this._currentRotationVector,
          this._startRotationVector
        )
        val = val > 1 - 1e-10 ? 1.0 : val
        const rotationAngle = Math.acos(val) * Math.PI

        mat4.fromRotation(
          this._currentMatrix,
          rotationAngle * 100,
          rotationAxis
        )
      }
    }
    mat4.multiply(_matrix, this._startMatrix, this._currentMatrix)
  }

  private applyTranslationMatrix(_matrix: mat4, reverse: boolean) {
    const factor = reverse ? -0.01 : 0.01
    const tx =
      this._transX +
      (this._currentTransX - this._startTransX) * this._translation_factor
    const ty =
      this._transY +
      (this._currentTransY - this._startTransY) * this._translation_factor
    const trans = vec3.fromValues(factor * tx, factor * -ty, 0)
    mat4.translate(_matrix, _matrix, trans)
  }

  public stopRotation(_matrix: mat4) {
    this._isRotating = false
    mat4.multiply(this._startMatrix, this._currentMatrix, this._startMatrix)
    mat4.identity(this._currentMatrix)
    _matrix = mat4.clone(this._startMatrix)
  }

  private convertXY(x: number, y: number): vec3 {
    const d = x * x + y * y
    const radiusSq = this._radius * this._radius
    if (d > radiusSq) return vec3.fromValues(x, y, 0)
    else return vec3.fromValues(x, y, Math.sqrt(radiusSq - d))
  }

  public get rotationMatrix() {
    return this._startMatrix
  }
}
