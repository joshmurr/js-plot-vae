export default {
  mnist: {
    decoder_path: './assets/vae_decoder2/model.json',
    z_mean: require('./assets/all_z_mean.npy'),
    log_var: require('./assets/all_log_var.npy'),
    labels: require('./assets/all_train_labels.npy'),
    width: 28,
    height: 28,
  },
  fashion_mnist: {
    decoder_path: './assets/vae_decoder_fashion/model.json',
    z_mean: require('./assets/all_z_mean_fashion.npy'),
    log_var: require('./assets/all_log_var_fashion.npy'),
    labels: require('./assets/all_train_labels_fashion.npy'),
    width: 28,
    height: 28,
  },
}
