import Renderer from './renderer'
import { pointsVert, pointsFrag } from './shader_programs/basic'
import RandomPointSphere from './randomPointSphere'
import NP_Loader from './npy_loader'

import all_z_mean from './assets/all_z_mean.npy'

const R = new Renderer()
R.init(512, 512)

R.initShaderProgram('points', pointsVert, pointsFrag, 'POINTS')

const points = new RandomPointSphere(R.gl, 1000)
points.rotate = { speed: 0.001, axis: [0, 1, 0] }

R.addGeometry('points', points)

R.initProgramUniforms('points', ['u_ProjectionMatrix', 'u_ViewMatrix'])
R.initGeometryUniforms('points', ['u_ModelMatrix'])

R.cameraPosition = [0, 0, 3]

function draw(now: number) {
  R.draw(now)
  window.requestAnimationFrame(draw)
}
window.requestAnimationFrame(draw)

const n = new NP_Loader()
n.load(all_z_mean).then((vals) => {
  console.log(vals)
})
