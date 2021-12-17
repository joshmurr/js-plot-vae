import * as tf from '@tensorflow/tfjs'
import Model from './model'
import { Config } from './types'

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
      const z = new Float32Array(points.slice(i, i + 3))
      const output = await this.run(z)

      output_tensors.push(output as tf.Tensor2D)
    }
    return output_tensors
  }

  public async latentTraversal(points: number[]) {
    const output_el = document.getElementById('latent_images')
    output_el.innerHTML = ''

    const image_tensors = await this.generateImageTensors(points)

    image_tensors.forEach((t: tf.Tensor2D) => {
      const canvas = document.createElement('canvas')
      canvas.width = this.config.width
      canvas.height = this.config.height
      tf.browser.toPixels(t, canvas)
      output_el.appendChild(canvas)
    })
  }
}
