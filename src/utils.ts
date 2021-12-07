import { vec3, vec4, mat4 } from 'gl-matrix'

export function generateColourPalette(num_colours: number): Array<number[]> {
  const colours: Array<number[]> = []
  for (let i = 0; i < num_colours; i++) {
    const s = i / num_colours
    colours.push([...HSVtoRGB(s, 1.0, 1.0)])
  }
  return colours
}

export function HSVtoRGB(h: number, s: number, v: number): Array<number> {
  let r: number
  let g: number
  let b: number
  const i = Math.floor(h * 6)
  const f = h * 6 - i
  const p = v * (1 - s)
  const q = v * (1 - f * s)
  const t = v * (1 - (1 - f) * s)
  switch (i % 6) {
    case 0:
      r = v
      g = t
      b = p
      break
    case 1:
      r = q
      g = v
      b = p
      break
    case 2:
      r = p
      g = v
      b = t
      break
    case 3:
      r = p
      g = q
      b = v
      break
    case 4:
      r = t
      g = p
      b = v
      break
    case 5:
      r = v
      g = p
      b = q
      break
  }
  return [r, g, b]
}

export function getMultiplyVec(mat: mat4, vec: vec4): Float32Array {
  const ret = new Float32Array(4)
  ret[0] = mat[0] * vec[0] + mat[4] * vec[1] + mat[8] * vec[2] + mat[12]
  ret[1] = mat[1] * vec[0] + mat[5] * vec[1] + mat[9] * vec[2] + mat[13]
  ret[2] = mat[2] * vec[0] + mat[6] * vec[1] + mat[10] * vec[2] + mat[14]
  ret[3] = mat[3] * vec[0] + mat[7] * vec[1] + mat[11] * vec[2] + mat[15]
  return ret
}

export function mouseRay(
  _mousePos: number[],
  _viewMat: mat4,
  _projMat: mat4
): Array<number> | null {
  // -- MOUSE CLICK TO RAY PROJECTION: -----------------------
  const rayStart = vec4.fromValues(_mousePos[0], _mousePos[1], -1.0, 1.0)
  const rayEnd = vec4.fromValues(_mousePos[0], _mousePos[1], 0.0, 1.0)

  const inverseMat = mat4.create()
  mat4.mul(inverseMat, _projMat, _viewMat)
  mat4.invert(inverseMat, inverseMat)

  const rayStart_world = getMultiplyVec(inverseMat, rayStart)
  vec4.scale(rayStart_world, rayStart_world, 1 / rayStart_world[3])
  const rayEnd_world = getMultiplyVec(inverseMat, rayEnd)
  vec4.scale(rayEnd_world, rayEnd_world, 1 / rayEnd_world[3])

  const rayDir_world = vec4.create()
  vec4.subtract(rayDir_world, rayEnd_world, rayStart_world)

  // -- RAY INTERSECTION WITH UNIT SPHERE: -------------------
  const rayOrigin = vec3.fromValues(
    rayStart_world[0],
    rayStart_world[1],
    rayStart_world[2]
  )
  const rayDirection = vec3.fromValues(
    rayDir_world[0],
    rayDir_world[1],
    rayDir_world[2]
  )
  vec3.normalize(rayDirection, rayDirection)

  const rayOrigin_sub_sphereOrigin = vec3.create()
  const sphereRadius = 0.5

  const a = vec3.dot(rayDirection, rayDirection)
  vec3.subtract(rayOrigin_sub_sphereOrigin, rayOrigin, vec3.fromValues(0, 0, 0))
  const b = 2.0 * vec3.dot(rayDirection, rayOrigin_sub_sphereOrigin)
  let c = vec3.dot(rayOrigin_sub_sphereOrigin, rayOrigin_sub_sphereOrigin)
  c -= sphereRadius * sphereRadius
  if (b * b - 4.0 * a * c < 0.0) {
    return null
    // return [0, 0, 0, 0];
  }

  const distToIntersect = (-b - Math.sqrt(b * b - 4.0 * a * c)) / (2.0 * a)
  const intersect = vec3.create()

  vec3.scaleAndAdd(intersect, rayOrigin, rayDirection, distToIntersect)
  // Spread to convert from Float32Array to normal array
  // because socket.io struggles with F32 arrays.
  return [intersect[0], intersect[1], intersect[2]]
}
