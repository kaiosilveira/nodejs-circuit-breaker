export default class GlobalConfig {
  CB_OPEN: boolean;

  constructor() {
    this.CB_OPEN = false;
  }

  setCircuitBreakerOpen(value: boolean): void {
    this.CB_OPEN = value;
  }
}
