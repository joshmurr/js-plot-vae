import { vec3, mat4 } from 'gl-matrix'

import GL_Handler from './gl_handler'
import { latentVert, latentFrag } from './shader_programs/basic'
import LatentPoints from './latent_points'
import NP_Loader from './npy_loader'
import Arcball from './arcball_quat'
import Model from './model'
import { config } from './config'

type UniformDescs = {
  [key: string]: number | number[] | mat4 | vec3
}

document.getElementsByTagName('form')[0].onsubmit = (e) => {
  e.preventDefault()

  const select = document.getElementById('models') as HTMLSelectElement
  const model_name = select.value
  main(model_name)

  return false
}

const n = new NP_Loader()
const G = new GL_Handler()
const canvas = G.canvas(512, 512, true)
const gl = G.gl
const program = G.shaderProgram(latentVert, latentFrag)

const camPos: [number, number, number] = [0, 0, 2]
let viewMat = G.viewMat({ pos: vec3.fromValues(...camPos) })
const projMat = G.defaultProjMat()
const modelMat = mat4.create()

const uniforms: UniformDescs = {
  u_ModelMatrix: modelMat,
  u_ViewMatrix: viewMat,
  u_ProjectionMatrix: projMat,
  u_UseUid: 0,
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
// --------------

const arcball = new Arcball(canvas.width, canvas.height)

let mouseX = -1
let mouseY = -1
let mousedown = false

const output_span = document.getElementById('latent_id')
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top

  if (mousedown) {
    arcball.updateRotation(mouseX, mouseY)
    arcball.applyRotationMatrix(modelMat)
  }
})

canvas.addEventListener('mousedown', () => {
  mousedown = true
  arcball.startRotation(mouseX, mouseY)
})

canvas.addEventListener('mouseup', () => {
  mousedown = false
  arcball.stopRotation()
})

canvas.addEventListener('mouseout', () => {
  mousedown = false
  arcball.stopRotation()
})

canvas.addEventListener('wheel', (e) => {
  e.preventDefault()
  camPos[2] = camPos[2] - e.deltaY * -0.001
  viewMat = G.viewMat({ pos: vec3.fromValues(...camPos) })
})

let model: Model

function main(model_name: string) {
  // - MODEL ------------------------------------------------
  const model_canvas = <HTMLCanvasElement>(
    document.getElementById('model_output')
  )
  if (model) model.dispose()
  model = new Model(config[model_name], model_canvas)
  // --------------------------------------------------------

  // --------------
  const data_promises = [
    config[model_name].labels,
    config[model_name].mean,
    config[model_name].log_var,
  ].map((data) => n.load(data))

  Promise.all(data_promises).then(([labels, mean_vals, log_vals]) => {
    const geom = new LatentPoints(gl, mean_vals, labels)
    geom.normalizeVerts()
    geom.linkProgram(program)

    const pallette_el = document.getElementById('pallette')
    pallette_el.innerHTML = ''
    geom.pallette.map((rgba, i) => {
      const li = document.createElement('li')
      li.innerText = String(i)
      const [r, g, b] = rgba
      li.style.background = `rgb(${r * 255},${g * 255},${b * 255})`
      pallette_el.appendChild(li)
    })

    function draw() {
      G.setFramebufferAttachmentSizes(
        canvas.width,
        canvas.height,
        pickingTex,
        depthBuffer
      )

      gl.bindVertexArray(geom.VAO)

      // Draw for picking ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
      gl.viewport(0, 0, canvas.width, canvas.height)

      G.setUniforms(uniformSetters, {
        u_ModelMatrix: modelMat,
        u_ViewMatrix: viewMat,
        u_UseUid: 1,
        u_PointSize: 8 - (Math.log(camPos[2]) + 1),
      })

      gl.drawArrays(gl.POINTS, 0, geom.numVertices)
      //----------------------

      // Mouse pixel ---------
      const pixelX = (mouseX * gl.canvas.width) / gl.canvas.clientWidth
      const pixelY =
        gl.canvas.height -
        (mouseY * gl.canvas.height) / gl.canvas.clientHeight -
        1
      const data = new Uint8Array(4)
      gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
      let id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24)
      if (id > 0) {
        const idx = (id - 1) * 3
        const z_mean = mean_vals.data.slice(idx, idx + 3)
        const log_var = log_vals.data.slice(idx, idx + 3)
        const x = z_mean[0] < 0 ? z_mean[0].toFixed(4) : z_mean[0].toFixed(5)
        const y = z_mean[1] < 0 ? z_mean[1].toFixed(4) : z_mean[1].toFixed(5)
        const z = z_mean[2] < 0 ? z_mean[2].toFixed(4) : z_mean[2].toFixed(5)
        output_span.innerText = `ID: ${id}\t\tx: ${x},\ty: ${y},\tz: ${z}`

        model.run(<Float32Array>z_mean, <Float32Array>log_var)
      }
      //----------------------

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      G.setUniforms(uniformSetters, { u_UseUid: 0, u_IdSelected: id - 1 })

      gl.clearDepth(1.0)
      gl.enable(gl.CULL_FACE)
      gl.enable(gl.DEPTH_TEST)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.clearColor(0.9, 0.9, 0.9, 1)

      gl.drawArrays(gl.POINTS, 0, geom.numVertices)

      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

      id = -1
      requestAnimationFrame(draw)
    }
    draw()
  })
}

main('fashion_mnist')

/* Select particular class code
 * ----------------------------
n.load(all_labels).then((labels) => {
labels.data = labels.data.slice(0, slice * 3)
const label_ids: number[] = []
labels.data.forEach((l, i) => {
if (l == select) label_ids.push(i)
})

labels.data = new Uint8Array(label_ids.length).fill(0)

n.load(all_z_mean).then((mean_vals) => {
mean_vals.data = mean_vals.data.slice(0, slice * 3)

const selected: Array<number> = []
label_ids.forEach((i) => {
selected.push(mean_vals.data[i * 3])
selected.push(mean_vals.data[i * 3 + 1])
selected.push(mean_vals.data[i * 3 + 2])
})

mean_vals.data = new Float32Array(selected)

n.load(all_log_var).then((log_vals) => {
log_vals.data = log_vals.data.slice(0, slice * 3)
const selected_logs: Array<number> = []
label_ids.forEach((i) => {
selected_logs.push(log_vals.data[i * 3])
selected_logs.push(log_vals.data[i * 3 + 1])
selected_logs.push(log_vals.data[i * 3 + 2])
})

log_vals.data = new Float32Array(selected_logs)
*/
