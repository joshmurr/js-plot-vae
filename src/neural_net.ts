import * as tf from '@tensorflow/tfjs'
import Model from './model'

interface Config {
  path: string
  mean?: string
  log_var?: string
  labels?: string
  width?: number
  height?: number
  input_shape: number[]
}

export default class NN extends Model {
  constructor(config: Config) {
    super(config)
  }

  public async run(mean: tf.Tensor) {
    const logits = tf.tidy(() => {
      const y = this.model.predict(mean) as tf.Tensor
      return y
    })

    const d = logits.squeeze()
    return d
  }
}
