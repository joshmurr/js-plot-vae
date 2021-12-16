import * as tf from '@tensorflow/tfjs'
import Model from './model'
import NN from './neural_net'

interface Config {
  path: string
  z?: string
  labels?: string
  width?: number
  height?: number
  input_shape: number[]
}

export default class VAE extends Model {
  private canvas: HTMLCanvasElement

  constructor(config: Config, canvas: HTMLCanvasElement) {
    super(config)

    this.canvas = canvas
    this.canvas.width = config.width
    this.canvas.height = config.height

    const ctx = this.canvas.getContext('2d')
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
  }

  public async run(mean: Float32Array) {
    const logits = tf.tidy(() => {
      //const z = this.reparameterize(mean, logvar).expandDims(0)
      const z = tf.tensor([mean])
      const decoded = this.model.predict(z) as tf.Tensor
      return decoded.sigmoid()
    })
    const d = logits.squeeze()
    tf.browser.toPixels(d as tf.Tensor2D, this.canvas)

    return d
  }

  public dispose() {
    this.model.dispose()
    tf.disposeVariables()
  }

  private async generateImageTensors(points: number[]) {
    const output_tensors: Array<tf.Tensor2D> = []
    for (let i = 0; i < points.length; i += 3) {
      const mean = points.slice(i, i + 3)
      const mean_t = tf.tensor([[...mean]])
      //const log_var = await mean_to_log.run(mean_t)
      //const log_var_d = await log_var.data()

      const output = await this.run(
        new Float32Array(mean)
        //log_var_d as Float32Array
      )

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
