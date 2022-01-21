import { vec3, mat4, quat } from 'gl-matrix'

export default class Arcball {
  private _res: number
  private _width: number
  private _height: number
  private _startRotationVector: vec3
  private _currentRotationVector: vec3

  private _startQuat: quat
  private _currentQuat: quat

  constructor(width: number, height: number) {
    this._width = width
    this._height = height
    this._res = Math.min(width, height) - 1

    this._startQuat = quat.create()
    this._currentQuat = quat.create()
  }

  public startRotation(_x: number, _y: number) {
    const { x, y } = this.remapXY(_x, _y)

    this._startRotationVector = this.project(x, y)
  }

  public updateRotation(_x: number, _y: number) {
    const { x, y } = this.remapXY(_x, _y)
    this._currentRotationVector = this.project(x, y)

    this._currentQuat = quat.rotationTo(
      this._currentQuat,
      this._startRotationVector,
      this._currentRotationVector
    )
  }

  public stopRotation() {
    quat.mul(this._startQuat, this._currentQuat, this._startQuat)
    quat.identity(this._currentQuat)
  }

  private remapXY(_x: number, _y: number) {
    const x = (2 * _x - this._width - 1) / this._res
    const y = (2 * _y - this._height - 1) / this._res

    return { x, y }
  }

  private project(x: number, y: number): vec3 {
    const r = 0.8
    let z
    if (x * x + y * y <= (r * r) / 2) {
      z = Math.sqrt(r * r - x * x + y * y)
    } else {
      z = (r * r) / 2 / Math.sqrt(x * x + y * y)
    }
    return vec3.fromValues(x, -y, z)
  }

  public applyRotationMatrix(_matrix: mat4) {
    const rotation = quat.create()
    quat.mul(rotation, this._currentQuat, this._startQuat)
    mat4.fromRotationTranslation(_matrix, rotation, vec3.create())
  }
}
