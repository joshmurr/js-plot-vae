export default class Slider {
  private _slider: HTMLInputElement
  constructor(min = 0, max = 10, value = 5, step = 1, id = 'slider') {
    console.log('New slider')
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

  public set min(val: number) {
    this._slider.min = String(val)
  }

  public set max(val: number) {
    this._slider.max = String(val)
  }

  public get max() {
    return parseInt(this._slider.max)
  }

  public set value(val: number) {
    this._slider.value = String(val)
  }

  public get value() {
    return parseInt(this._slider.value)
  }

  public set step(val: number) {
    this._slider.step = String(val)
  }

  public setEventListener(func: () => void) {
    this._slider.addEventListener('change', func)
  }
}
