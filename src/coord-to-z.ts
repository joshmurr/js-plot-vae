import * as tf from '@tensorflow/tfjs'
import Model from './model'
import { Config } from './types'

export default class CoordToZ extends Model {
  constructor(config: Config) {
    super(config)
  }

  public async run(inp: Float32Array) {
    const logits = tf.tidy(() => {
      const z = tf.tensor([inp])
      const decoded = this.model.predict(z) as tf.Tensor
      return decoded
    })
    const d = await logits.data()
    return d
  }
}
