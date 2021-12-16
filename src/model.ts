import * as tf from '@tensorflow/tfjs'

interface Config {
  path: string
  mean: string
  log_var: string
  labels: string
  width: number
  height: number
  input_shape: number[]
}

export default class Model {
  private config: Config
  private canvas: HTMLCanvasElement
  private model: tf.GraphModel

  constructor(config: Config, canvas: HTMLCanvasElement) {
    this.config = config

    this.canvas = canvas
    this.canvas.width = config.width
    this.canvas.height = config.height

    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)

    this.initModel()
  }

  private async initModel() {
    this.model = await tf.loadGraphModel(this.config.path)
    const warm_up = this.model.predict(
      tf.zeros(this.config.input_shape)
    ) as tf.Tensor
    warm_up.dispose()
  }

  public async run(mean: Float32Array, logvar: Float32Array) {
    const logits = tf.tidy(() => {
      const z = this.reparameterize(mean, logvar).expandDims(0)
      const decoded = this.model.predict(z) as tf.Tensor
      return decoded.sigmoid()
    })
    const d = logits.squeeze()
    tf.browser.toPixels(d as tf.Tensor2D, this.canvas)

    return d
  }

  private reparameterize(mean: Float32Array, logvar: Float32Array) {
    const m = tf.tensor(mean)
    const l = tf.tensor(logvar)
    const exp = tf.exp(l.mul(0.5)).add(m)

    return exp
  }

  private reparameterize_with_noise(mean: Float32Array, logvar: Float32Array) {
    const m = tf.tensor(mean)
    const l = tf.tensor(logvar)
    const exp = tf.exp(l.mul(0.5))
    const eps = tf.randomNormal(m.shape)
    const ret = eps.mul(exp).add(m)

    return ret
  }

  public dispose() {
    this.model.dispose()
    tf.disposeVariables()
  }

  private async generateImageTensors(points: number[]) {
    const output_tensors: Array<tf.Tensor2D> = []
    for (let i = 0; i < points.length; i += 3) {
      const mean = new Float32Array(points.slice(i, i + 3))
      //const log_var = await tf.randomNormal([3]).data()
      const log_var = new Float32Array([0, 0, 0])
      const output = await this.run(mean, log_var as Float32Array)

      output_tensors.push(output as tf.Tensor2D)
    }
    return output_tensors
  }

  public async latentTraversal(points: number[]) {
    const image_tensors = await this.generateImageTensors(points)

    image_tensors.forEach((t: tf.Tensor2D) => {
      const canvas = document.createElement('canvas')
      canvas.width = this.config.width
      canvas.height = this.config.height
      tf.browser.toPixels(t, canvas)
      document.body.appendChild(canvas)
    })
  }
}
