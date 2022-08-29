import CircuitBreakerState from '..';
import ExpressCircuitBreaker from '../..';
import ILogger from '../../../monitoring/logger';
import { CircuitBreakerStatus } from '../../status';

export default class CircuitBreakerOpenState extends CircuitBreakerState {
  constructor({ circuitBreaker, logger }: { circuitBreaker: ExpressCircuitBreaker; logger: ILogger }) {
    super({ circuitBreaker, logger, status: CircuitBreakerStatus.OPEN });
    this.circuitBreaker = circuitBreaker;
    this.status = CircuitBreakerStatus.OPEN;
  }

  handleOkResponse(): void {}

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.registerFailure();
  }
}
