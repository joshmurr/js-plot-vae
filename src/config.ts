export default {
  mnist: {
    path: './assets/vae_decoder2/model.json',
    mean: './assets/model_data/mnist/mean.npy',
    log_var: './assets/model_data/mnist/log_var.npy',
    labels: './assets/model_data/mnist/train_labels.npy',
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
}
