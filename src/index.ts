import { vec3, mat4 } from 'gl-matrix'

import GL_Handler from './gl_handler'
import { latentVert, latentFrag } from './shader_programs/basic'
import LatentPoints from './latent_points'
import NP_Loader from './npy_loader'

import all_z_mean from './assets/all_z_mean.npy'
import all_labels from './assets/all_train_labels.npy'

type UniformDescs = {
  [key: string]: number | number[] | mat4 | vec3
}

const n = new NP_Loader()

const G = new GL_Handler()
const canvas = G.canvas(1024, 1024)
const gl = G.gl
const program = G.shaderProgram(latentVert, latentFrag)

const cameraPos = vec3.fromValues(-0.1, 0.1, 0)
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
  u_pointSize: 0.6,
  u_useUid: 0,
  u_IdSelected: -1,
  u_PointSize: 8.0,
}

const uniformSetters = G.getUniformSetters(program)

gl.useProgram(program)

G.setUniforms(uniformSetters, uniforms)

// -- PICKING ---

const pickingTex = G.createTexture(canvas.width, canvas.height)

const depthBuffer = gl.createRenderbuffer()
gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer)

const fbo = G.createFramebuffer(pickingTex)

gl.framebufferRenderbuffer(
  gl.FRAMEBUFFER,
  gl.DEPTH_ATTACHMENT,
  gl.RENDERBUFFER,
  depthBuffer
)

let mouseX = -1
let mouseY = -1
//const oldPickNdx = -1
let oldPickColor
//const frameCount = 0

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
})

n.load(all_z_mean).then((latent_vals) => {
  latent_vals.data = latent_vals.data.slice(0, 3000)
  n.load(all_labels).then((labels) => {
    const latents = new LatentPoints(gl, latent_vals, labels)
    latents.linkProgram(program)
    latents.oscillate = true
    latents.rotate = { speed: 0.01, axis: [1, 1, 0] }

    function draw(time: number) {
      G.setFramebufferAttachmentSizes(
        canvas.width,
        canvas.height,
        pickingTex,
        depthBuffer
      )

      gl.bindVertexArray(latents.VAO)

      // Draw for picking ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.clearColor(1, 1, 1, 1)
      gl.clearDepth(1.0)
      gl.enable(gl.CULL_FACE)
      gl.enable(gl.DEPTH_TEST)

      //const modelMat = latents.updateModelMatrix(time)
      G.setUniforms(uniformSetters, { u_useUid: 1 })

      gl.drawArrays(gl.POINTS, 0, latents.numVertices)
      //---

      // Mouse pixel

      const pixelX = (mouseX * gl.canvas.width) / gl.canvas.clientWidth
      const pixelY =
        gl.canvas.height -
        (mouseY * gl.canvas.height) / gl.canvas.clientHeight -
        1
      const data = new Uint8Array(4)
      gl.readPixels(
        pixelX, // x
        pixelY, // y
        1, // width
        1, // height
        gl.RGBA, // format
        gl.UNSIGNED_BYTE, // type
        data
      ) // typed array to hold result
      const id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24)
      //---

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      G.setUniforms(uniformSetters, { u_useUid: 0, u_IdSelected: id - 1 })

      gl.drawArrays(gl.POINTS, 0, latents.numVertices)

      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

      requestAnimationFrame(draw)
    }
    draw(0)
  })
})
