export interface Config {
  path: string
  aux?: string
  z?: string
  labels?: string
  class_labels?: Array<number | string>
  width?: number
  height?: number
  input_shape: number[]
}
