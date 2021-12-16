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
  protected config: Config
  protected model: tf.GraphModel

  constructor(config: Config) {
    this.config = config

    this.initModel()
  }

  protected async initModel() {
    this.model = await tf.loadGraphModel(this.config.path)
    const warm_up = this.model.predict(
      tf.zeros(this.config.input_shape)
    ) as tf.Tensor
    warm_up.dispose()
  }
}
