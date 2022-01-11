import { Config } from './types'

type AllConfigs = { [key: string]: Config }

export const config: AllConfigs = {
  mnist: {
    path: './assets/vae_decoder_reparam/model.json',
    z: './assets/model_data/mnist/all_z_mnist.npy',
    labels: './assets/model_data/mnist/all_train_labels_mnist.npy',
    class_labels: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    width: 28,
    height: 28,
    input_shape: [1, 3],
  },
  fashion_mnist: {
    path: './assets/vae_fashion_reparam/model.json',
    z: './assets/model_data/fashion/all_z_fashion_mnist.npy',
    labels: './assets/model_data/fashion/all_train_labels_fashion_mnist.npy',
    class_labels: [
      'T-shirt/top',
      'Trouser',
      'Pullover',
      'Dress',
      'Coat',
      'Sandal',
      'Shirt',
      'Sneaker',
      'Bag',
      'Ankle boot',
    ],
    width: 28,
    height: 28,
    input_shape: [1, 3],
  },
  cifar10: {
    path: './assets/cifar10_decoder/model.json',
    aux: 'cifar10_aux',
    z: './assets/model_data/cifar10/umap-latents.npy',
    labels: './assets/model_data/cifar10/labels.npy',
    class_labels: [
      'Airplane',
      'Automobile',
      'Bird',
      'Cat',
      'Deer',
      'Dog',
      'Frog',
      'Horse',
      'Ship',
      'Truck',
    ],
    width: 32,
    height: 32,
    input_shape: [1, 1024],
  },
  cifar10_aux: {
    path: './assets/cifar10_xyz-to-z/model.json',
    input_shape: [1, 3],
  },
}
