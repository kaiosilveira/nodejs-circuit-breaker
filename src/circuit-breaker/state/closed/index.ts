import CircuitBreakerState from '..';
import CircuitBreaker from '../..';
import ILogger from '../../../monitoring/logger';
import { CircuitBreakerStatus } from '../../status';

export default class CircuitBreakerClosedState extends CircuitBreakerState {
  constructor({ circuitBreaker, logger }: { circuitBreaker: CircuitBreaker; logger: ILogger }) {
    super({ status: CircuitBreakerStatus.CLOSED, circuitBreaker, logger });
  }

  handleOkResponse(): void {
    this.logger.info({ msg: 'Successful response', status: this.status });
  }

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.registerFailure();
  }
}
