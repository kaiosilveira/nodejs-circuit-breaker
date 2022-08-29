import GlobalConfig from "..";
import { CircuitBreakerStatus } from "../../circuit-breaker/status";

export default class InMemoryGlobalConfig implements GlobalConfig {
  CB_OPEN: boolean;

  constructor() {
    this.CB_OPEN = false;
  }
  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void {
    throw new Error('Method not implemented.');
  }

  isCircuitBreakerOpen() {
    return this.CB_OPEN === true;
  }

  setCircuitBreakerOpen(value: boolean): void {
    this.CB_OPEN = value;
  }
}
