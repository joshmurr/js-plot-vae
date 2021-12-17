export default class Slider {
  private _slider: HTMLInputElement
  constructor(
    min: number,
    max: number,
    value: number,
    step: number,
    id: string
  ) {
    this._slider = document.createElement('input')
    this._slider.type = 'range'
    this._slider.min = String(min)
    this._slider.max = String(max - 1)
    this._slider.value = String(value)
    this._slider.step = String(step)
    this._slider.classList.add('latent-slider')
    this._slider.id = id
    document
      .getElementsByClassName('slide-container')[0]
      .appendChild(this._slider)
  }

  public setEventListener(func: () => void) {
    this._slider.addEventListener('change', func)
  }

  get value() {
    return parseInt(this._slider.value)
  }

  get max() {
    return parseInt(this._slider.max)
  }
}
