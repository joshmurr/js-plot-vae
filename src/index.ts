import { vec3, mat4 } from 'gl-matrix'
import fitCurve from 'fit-curve'

import GL_Handler from './gl_handler'
import {
  latentVert,
  latentFrag,
  basicPointVert,
  basicPointFrag,
  basicLineVert,
  basicLineFrag,
} from './shader_programs/basic'
import LatentPoints from './latent_points'
import Curve from './curve'
import Points from './points'
import Slider from './slider'
import NP_Loader from './npy_loader'
import Arcball from './arcball_quat'
import VAE from './vae'
import { config } from './config'

import './styles.scss'

type UniformDescs = {
  [key: string]: number | number[] | mat4 | vec3
}

const getUserSelection = () => {
  const select = document.getElementById('models') as HTMLSelectElement
  return select.value
}

const replaceElement = (id: string) => {
  const old_el = document.getElementById(id)
  const new_element = old_el.cloneNode(true)
  old_el.parentNode.replaceChild(new_element, old_el)
}

document.getElementsByTagName('form')[0].onsubmit = (e) => {
  e.preventDefault()

  replaceElement('btn_gen_curve')
  replaceElement('btn_gen_traversal')

  const model_name = getUserSelection()
  main(model_name)

  return false
}

const n = new NP_Loader()
const G = new GL_Handler()
const canvas = G.canvas(
  800,
  800,
  true,
  document.getElementById('canvas_wrapper')
)
const gl = G.gl

const points_program = G.shaderProgram(latentVert, latentFrag)
const curve_program = G.shaderProgram(basicLineVert, basicLineFrag)
const traversal_points_program = G.shaderProgram(basicPointVert, basicPointFrag)

const camPos: [number, number, number] = [0, 0, 2]
let viewMat = G.viewMat({ pos: vec3.fromValues(...camPos) })
const projMat = G.defaultProjMat()
const modelMat = mat4.create()

let id = -1
let selected_z: Float32Array
let all_selected_zs: Array<number[]> = []

const baseUniforms: UniformDescs = {
  u_ModelMatrix: modelMat,
  u_ViewMatrix: viewMat,
  u_ProjectionMatrix: projMat,
}

const traversal_points_uniforms: UniformDescs = {
  ...baseUniforms,
  u_IdSelected: 4,
  u_PointSize: 8.0,
}

const z_points_uniforms: UniformDescs = {
  ...traversal_points_uniforms,
  u_UseUid: 0,
}

const z_points_uniform_setters = G.getUniformSetters(points_program)
const curve_uniform_setters = G.getUniformSetters(curve_program)
const traversal_points_uniform_setters = G.getUniformSetters(
  traversal_points_program
)

gl.useProgram(points_program)
G.setUniforms(z_points_uniform_setters, z_points_uniforms)
gl.useProgram(traversal_points_program)
G.setUniforms(traversal_points_uniform_setters, traversal_points_uniforms)

// -- PICKING ---
const pickingTex = G.createTexture(canvas.width, canvas.height, 'RGB')

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

const addPointToUI = (z: Float32Array) => {
  const li = document.createElement('li')
  li.innerText = arrayToXYZ(z)
  document.getElementById('selected_points').appendChild(li)
}

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

canvas.addEventListener('mousedown', (e) => {
  mousedown = true
  if (e.shiftKey) {
    all_selected_zs.push(Array.from(selected_z))
    addPointToUI(selected_z)
  }
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

const populateOutput = (id: string, mean: Float32Array) => {
  const el = document.getElementById(id)
  el.innerText = `z\t\t${arrayToXYZ(mean)}`
}

const generateCurve = (nPoints: number) => {
  const randomVal = (min: number, max: number) =>
    Math.random() * (max - min) + min
  //const randInt = (min: number, max: number) => Math.floor(randomVal(min, max))
  const points = []
  for (let i = 0; i < nPoints; i++) {
    points.push([randomVal(-1, 1), randomVal(-1, 1), randomVal(-1, 1)])
  }
  return points
}

let vae: VAE

const slider = new Slider()

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
    const curve = new Curve(gl, generateCurve(5), 0.01)
    curve.linkProgram(curve_program)

    const traversal_points = new Points(gl, curve.verts)
    traversal_points.linkProgram(traversal_points_program)

    slider.min = 0
    slider.max = traversal_points.numVertices
    slider.value = traversal_points.numVertices / 2

    let prevIdx = slider.value
    slider.setEventListener(() => {
      const idx = slider.value
      const vert_idx = idx * 3
      const z = new Float32Array(curve.verts.slice(vert_idx, vert_idx + 3))
      populateOutput('output_traversal', z)
      vae.run(z)

      const output_el = document.getElementById('latent_images')
      const latent_images = output_el.getElementsByTagName('canvas')
      latent_images[prevIdx].classList.remove('border')
      latent_images[idx].classList.add('border')

      prevIdx = idx
    })

    document
      .getElementById('btn_gen_traversal')
      .addEventListener('click', () => vae.latentTraversal(curve.verts))

    document.getElementById('btn_gen_curve').addEventListener('click', () => {
      console.info('Generating curve')
      const error = 10
      const controlPoints = fitCurve(all_selected_zs, error)
      curve.generateCurveFromControlPoints(curve_program, controlPoints)
      all_selected_zs = []
      traversal_points.updateVerts(traversal_points_program, curve.verts)
      document.getElementById('selected_points').innerHTML = ''
    })

    const z_points = new LatentPoints(gl, z_vals, labels)
    z_points.normalize()
    z_points.linkProgram(points_program)

    const pallette_el = document.getElementById('pallette')
    pallette_el.innerHTML = ''
    z_points.pallette.map((rgba, i) => {
      const li = document.createElement('li')
      li.innerText = `${config[model_name].class_labels[i]}`
      const [r, g, b] = rgba
      li.style.background = `rgb(${r * 255},${g * 255},${b * 255})`
      li.addEventListener('click', () => z_points.selectClassLabel(i))
      pallette_el.appendChild(li)
    })

    gl.viewport(0, 0, canvas.width, canvas.height)
    function draw() {
      gl.useProgram(points_program)
      G.setFramebufferAttachmentSizes(
        canvas.width,
        canvas.height,
        pickingTex,
        depthBuffer
      )

      gl.bindVertexArray(z_points.VAO)

      // Draw for picking ---
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)

      G.setUniforms(z_points_uniform_setters, {
        u_ModelMatrix: modelMat,
        u_ViewMatrix: viewMat,
        u_UseUid: 1,
        u_PointSize: 8 - (Math.log(camPos[2]) + 1),
      })

      gl.drawArrays(gl.POINTS, 0, z_points.numVertices)
      //----------------------

      // Mouse pixel ---------
      const pixelX = (mouseX * gl.canvas.width) / gl.canvas.clientWidth
      const pixelY =
        gl.canvas.height -
        (mouseY * gl.canvas.height) / gl.canvas.clientHeight -
        1
      const data = new Uint8Array(4)
      gl.readPixels(pixelX, pixelY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, data)
      id = data[0] + (data[1] << 8) + (data[2] << 16) + (data[3] << 24)
      if (id > 0) {
        const idx = (id - 1) * 3
        selected_z = z_vals.data.slice(idx, idx + 3) as Float32Array
        populateOutput('output_z', selected_z)
        document.getElementById('output_id').innerText = `ID: ${id}`

        vae.run(selected_z)
      }
      //----------------------

      gl.bindFramebuffer(gl.FRAMEBUFFER, null)

      G.setUniforms(z_points_uniform_setters, {
        u_UseUid: 0,
        u_IdSelected: id - 1,
      })

      gl.clearDepth(1.0)
      gl.enable(gl.CULL_FACE)
      gl.enable(gl.DEPTH_TEST)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
      gl.clearColor(0.9, 0.9, 0.9, 1)

      gl.drawArrays(gl.POINTS, 0, z_points.numVertices)

      gl.useProgram(curve_program)
      gl.bindVertexArray(curve.VAO)
      G.setUniforms(curve_uniform_setters, {
        ...baseUniforms,
        u_ViewMatrix: viewMat,
      })
      gl.drawElements(gl.LINES, curve.numIndices, gl.UNSIGNED_SHORT, 0)

      gl.useProgram(traversal_points_program)
      gl.bindVertexArray(traversal_points.VAO)
      G.setUniforms(traversal_points_uniform_setters, {
        ...traversal_points_uniforms,
        u_IdSelected: slider.value,
        u_ViewMatrix: viewMat,
      })
      gl.drawArrays(gl.POINTS, 0, traversal_points.numVertices)

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
