import Renderer from './renderer'
import { latentPointsVert, latentPointsFrag } from './shader_programs/basic'
import LatentPoints from './latent_points'
import NP_Loader from './npy_loader'

import all_z_mean from './assets/all_z_mean.npy'
import all_labels from './assets/all_train_labels.npy'

const R = new Renderer()
R.init(512, 512)

R.initShaderProgram('points', latentPointsVert, latentPointsFrag, 'POINTS')
R.initProgramUniforms('points', [
  'u_ProjectionMatrix',
  'u_ViewMatrix',
  'u_Mouse',
])
R.initGeometryUniforms('points', ['u_ModelMatrix'])
R.cameraPosition = [0, 0, 0.2]

const n = new NP_Loader()
n.load(all_z_mean).then((latent_vals) => {
  n.load(all_labels).then((labels) => {
    const zs = new LatentPoints(R.gl, latent_vals, labels)
    zs.rotate = { speed: 0.001, axis: [0, 1, 0] }
    R.addGeometry('points', zs)

    function draw(now: number) {
      R.draw(now)
      window.requestAnimationFrame(draw)
    }
    window.requestAnimationFrame(draw)
  })
})

//const points = new RandomPointSphere(R.gl, 1000)
