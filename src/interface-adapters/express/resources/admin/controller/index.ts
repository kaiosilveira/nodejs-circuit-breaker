import { Request, Response } from 'express';
import ApplicationState from '../../../../../app/infra/application-state';
import { CircuitBreakerStatus } from '../../../../../app/stability/circuit-breaker/status';

export type AdminControllerProps = { applicationState: ApplicationState };
export default class AdminController {
  _appState: ApplicationState;

  constructor({ applicationState }: AdminControllerProps) {
    this._appState = applicationState;

    this.setCircuitBreakerState = this.setCircuitBreakerState.bind(this);
    this.describeCircuitBreakerStates = this.describeCircuitBreakerStates.bind(this);
  }

  setCircuitBreakerState(req: Request, res: Response): Response | void {
    const { circuitBreakerId, state } = req.body;
    if (!circuitBreakerId) {
      return res.status(500).json({ msg: 'Invalid circuitBreakerId. Expected a string.' });
    }

    if (!state || !Object.values(CircuitBreakerStatus).includes(state)) {
      return res.status(500).json({
        msg: 'Invalid state for circuit breaker. Expected one of the following values: OPEN | HALF_OPEN | CLOSED.',
      });
    }

    this._appState.setCircuitBreakerState({ circuitBreakerId, state });
    res.end();
  }

  describeCircuitBreakerStates(_: Request, res: Response): Response | void {
    return res.json(this._appState.describeRegisteredCircuitBreakers());
  }
}
