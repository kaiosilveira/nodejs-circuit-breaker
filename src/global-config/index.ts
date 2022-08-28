export default interface GlobalConfig {
  setCircuitBreakerOpen(value: boolean): void;
  isCircuitBreakerOpen(): boolean;
}

export class InMemoryGlobalConfig {
  CB_OPEN: boolean;

  constructor() {
    this.CB_OPEN = false;
  }

  isCircuitBreakerOpen() {
    return this.CB_OPEN === true;
  }

  setCircuitBreakerOpen(value: boolean): void {
    this.CB_OPEN = value;
  }
}
