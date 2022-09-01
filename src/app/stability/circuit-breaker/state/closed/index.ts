import CircuitBreakerState from '..';
import CircuitBreaker from '../..';
import ILogger from '../../../../infra/logger/fake';
import { CircuitBreakerStatus } from '../../status';

export type CircuitBreakerClosedStateProps = { circuitBreaker: CircuitBreaker; logger: ILogger };
export default class CircuitBreakerClosedState extends CircuitBreakerState {
  constructor({ circuitBreaker, logger }: CircuitBreakerClosedStateProps) {
    super({ status: CircuitBreakerStatus.CLOSED, circuitBreaker, logger });
  }

  handleOkResponse(): void {
    this.logger.info({ msg: 'Successful response', status: this.status });
  }

  handleInternalServerErrorResponse(): void {
    this.circuitBreaker.registerFailure();
  }
}
