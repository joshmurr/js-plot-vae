import { vec3, mat4 } from 'gl-matrix'

import GL_Handler from './gl_handler'
import {
  latentVert,
  latentFrag,
  basicVert,
  basicFrag,
} from './shader_programs/basic'
import LatentPoints from './latent_points'
import Curve from './curve'
import NP_Loader from './npy_loader'
import Arcball from './arcball_quat'
import VAE from './vae'
import { config } from './config'

type UniformDescs = {
  [key: string]: number | number[] | mat4 | vec3
}

const getUserSelection = () => {
  const select = document.getElementById('models') as HTMLSelectElement
  return select.value
}

document.getElementsByTagName('form')[0].onsubmit = (e) => {
  e.preventDefault()

  const model_name = getUserSelection()
  main(model_name)

  return false
}

const n = new NP_Loader()
const G = new GL_Handler()
const canvas = G.canvas(512, 512, true)
const gl = G.gl
const program = G.shaderProgram(latentVert, latentFrag)
const curve_program = G.shaderProgram(basicVert, basicFrag)

const camPos: [number, number, number] = [0, 0, 2]
let viewMat = G.viewMat({ pos: vec3.fromValues(...camPos) })
const projMat = G.defaultProjMat()
const modelMat = mat4.create()

const baseUniforms: UniformDescs = {
  u_ModelMatrix: modelMat,
  u_ViewMatrix: viewMat,
  u_ProjectionMatrix: projMat,
}

const uniforms: UniformDescs = {
  ...baseUniforms,
  u_UseUid: 0,
  u_IdSelected: -1,
  u_PointSize: 8.0,
}

const uniformSetters = G.getUniformSetters(program)
const curveUniformSetters = G.getUniformSetters(curve_program)

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

const arrayToXYZ = (a: Float32Array) =>
  `x: ${a[0].toFixed(4)},\ty: ${a[1].toFixed(4)},\tz: ${a[2].toFixed(4)}`

const populateOutput = (id: number, mean: Float32Array) => {
  const output_id = document.getElementById('output_id')
  const output_mean = document.getElementById('output_mean')

  output_id.innerText = `ID: ${id}`
  output_mean.innerText = `Mean\t\t${arrayToXYZ(mean)}`
}

let vae: VAE

function main(model_name: string) {
  // - MODEL ------------------------------------------------
  const model_canvas = <HTMLCanvasElement>(
    document.getElementById('model_output')
  )
  console.log(`Loading Model: ${model_name}`)
  if (vae) vae.dispose()
  vae = new VAE(config[model_name], model_canvas)
  // --------------------------------------------------------

  const data_promises = [config[model_name].labels, config[model_name].z].map(
    (data) => n.load(data)
  )

  Promise.all(data_promises).then(([labels, z_vals]) => {
    const curve = new Curve(gl, [
      [-2, -2, -2],
      [0, 2, -1],
      [-3, 1, -0.5],
      [0.5, -3, 1],
      [2, 2, 2],
    ])
    //const curve = new Curve(gl, 'circle')
    curve.linkProgram(curve_program)

    document
      .getElementsByTagName('button')[0]
      .addEventListener('click', () => vae.latentTraversal(curve.verts))

    //const slice = 100
    //z_vals.data = z_vals.data.slice(0, slice * 3)
    //labels.data = labels.data.slice(0, slice)
    const geom = new LatentPoints(gl, z_vals, labels)
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

    gl.viewport(0, 0, canvas.width, canvas.height)
    function draw() {
      gl.useProgram(program)
      G.setFramebufferAttachmentSizes(
        canvas.width,
        canvas.height,
        pickingTex,
        depthBuffer
      )

      gl.bindVertexArray(geom.VAO)

      // Draw for picking ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

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
        const z = z_vals.data.slice(idx, idx + 3) as Float32Array
        populateOutput(idx, z)

        vae.run(z)
      }
      //----------------------

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      G.setUniforms(uniformSetters, { u_UseUid: 0, u_IdSelected: id - 1 })

      gl.clearDepth(1.0)
      gl.enable(gl.CULL_FACE)
      gl.enable(gl.DEPTH_TEST)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.clearColor(0.9, 0.9, 0.9, 1)

      gl.drawArrays(gl.POINTS, 0, geom.numVertices)

      gl.useProgram(curve_program)
      gl.bindVertexArray(curve.VAO)
      G.setUniforms(curveUniformSetters, {
        ...baseUniforms,
        u_ViewMatrix: viewMat,
      })
      gl.drawElements(gl.LINES, curve.numIndices, gl.UNSIGNED_SHORT, 0)

      gl.bindVertexArray(null)
      gl.bindBuffer(gl.ARRAY_BUFFER, null)
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null)

      id = -1
      requestAnimationFrame(draw)
    }
    draw()
  })
}

main(getUserSelection())

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
