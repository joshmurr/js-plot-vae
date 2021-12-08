import { vec3, mat4 } from 'gl-matrix'

//import Renderer from './renderer'
import GL_Handler from './gl_handler'
import { pointsVert, pointsFrag } from './shader_programs/basic'
//import LatentPoints from './latent_points'
import RandomPointSphere from './random_point_sphere'
//import NP_Loader from './npy_loader'

//import all_z_mean from './assets/all_z_mean.npy'
//import all_labels from './assets/all_train_labels.npy'

//const R = new Renderer()
//R.init(512, 512)

//R.initShaderProgram('points', latentPointsVert, latentPointsFrag, 'POINTS')
//R.initProgramUniforms('points', [
//'u_ProjectionMatrix',
//'u_ViewMatrix',
//'u_Mouse',
//])
//R.initGeometryUniforms('points', ['u_ModelMatrix'])
//R.cameraPosition = [0, 0, 0.2]

//const n = new NP_Loader()
//n.load(all_z_mean).then((latent_vals) => {
//n.load(all_labels).then((labels) => {
//const zs = new LatentPoints(R.gl, latent_vals, labels)
//zs.rotate = { speed: 0.001, axis: [0, 1, 0] }
//R.addGeometry('points', zs)

//function draw(now: number) {
//R.draw(now)
//window.requestAnimationFrame(draw)
//}
//window.requestAnimationFrame(draw)
//})
//})

// --------------------------
type UniformDescs = {
  [key: string]: number | number[] | mat4 | vec3
}

const G = new GL_Handler()
const canvas = G.canvas(512, 512)
const gl = G.gl
const program = G.shaderProgram(pointsVert, pointsFrag)
gl.useProgram(program)

const randomPS = new RandomPointSphere(gl, 1000)
randomPS.rotate = { speed: 0.001, axis: [0, 1, 0] }

randomPS.linkProgram(program)

const cameraPos = vec3.fromValues(0, 0, 4)
const up = vec3.fromValues(0, 1, 0)
const target = vec3.fromValues(0, 0, 0)
const viewMatrix = mat4.lookAt(mat4.create(), cameraPos, target, up)
const fieldOfView = (45 * Math.PI) / 180
const aspect = G.aspect
const zNear = 0.1
const zFar = 100.0

const projMatrix = mat4.perspective(
  mat4.create(),
  fieldOfView,
  aspect,
  zNear,
  zFar
)

const uniforms: UniformDescs = {
  u_ModelMatrix: mat4.create(),
  u_ViewMatrix: viewMatrix,
  u_ProjectionMatrix: projMatrix,
}

const uniformSetters = G.getUniformSetters(program)

G.setUniforms(uniformSetters, uniforms)

function draw(time: number) {
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.clearDepth(1.0)
  gl.enable(gl.CULL_FACE)
  gl.enable(gl.DEPTH_TEST)

  const modelMat = randomPS.updateModelMatrix(time)

  G.setUniforms(uniformSetters, { u_ModelMatrix: modelMat })

  gl.bindVertexArray(randomPS.VAO)

  gl.drawArrays(gl.POINTS, 0, randomPS.numVertices)

  gl.bindVertexArray(null)
  gl.bindBuffer(gl.ARRAY_BUFFER, null)
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

  requestAnimationFrame(draw)
}
draw(0)
