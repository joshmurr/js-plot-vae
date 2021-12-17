import * as tf from '@tensorflow/tfjs'
import Model from './model'
import { Config } from './types'

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
