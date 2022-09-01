import ExpressCircuitBreaker from '..';
import ILogger from '../../../infra/logger';
import { CircuitBreakerStatus } from '../status';

export default abstract class CircuitBreakerState {
  status: CircuitBreakerStatus;
  logger: ILogger;
  circuitBreaker: ExpressCircuitBreaker;

  constructor({
    circuitBreaker,
    logger,
    status,
  }: {
    circuitBreaker: ExpressCircuitBreaker;
    logger: ILogger;
    status: CircuitBreakerStatus;
  }) {
    this.logger = logger;
    this.circuitBreaker = circuitBreaker;
    this.status = status;
  }

  handleOkResponse() {}
  handleInternalServerErrorResponse() {
    this.circuitBreaker.registerFailure();
  }
}
