import AdminController from './controller';

export default class AdminResource {
  static build({ router, applicationState }) {
    const admCtrl = new AdminController({ applicationState });

    router
      .route('/circuit-breaker-states')
      .get(admCtrl.describeCircuitBreakerStates)
      .put(admCtrl.setCircuitBreakerState);

    return { router };
  }
}
