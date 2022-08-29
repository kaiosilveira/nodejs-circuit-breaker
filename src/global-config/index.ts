import { CircuitBreakerStatus } from '../circuit-breaker/status';

export default interface GlobalConfig {
  setCircuitBreakerOpen(value: boolean): void;
  isCircuitBreakerOpen(): boolean;
  setCircuitBreakerState(circuitBreakerId: string, state: CircuitBreakerStatus): void;
}
