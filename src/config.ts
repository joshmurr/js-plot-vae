type AllConfigs = { [key: string]: Config }

interface Config {
  path: string
  mean?: string
  log_var?: string
  z?: string
  labels?: string
  width?: number
  height?: number
  input_shape: number[]
}

export const config: AllConfigs = {
  mnist: {
    path: './assets/vae_decoder_reparam/model.json',
    z: './assets/model_data/mnist/all_z_mnist.npy',
    //log_var: './assets/model_data/mnist/log_var.npy',
    labels: './assets/model_data/mnist/all_train_labels_mnist.npy',
    width: 28,
    height: 28,
    input_shape: [1, 3],
  },
  fashion_mnist: {
    path: './assets/vae_decoder_fashion/model.json',
    mean: './assets/model_data/fashion/mean.npy',
    log_var: './assets/model_data/fashion/log_var.npy',
    labels: './assets/model_data/fashion/train_labels.npy',
    width: 28,
    height: 28,
    input_shape: [1, 3],
  },
  mean_to_logvar: {
    path: './assets/mean_to_logvar/model.json',
    input_shape: [1, 3],
  },
}
