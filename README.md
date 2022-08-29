# nodejs-circuit-breaker

[![Continuous Integration](https://github.com/kaiosilveira/nodejs-circuit-breaker/actions/workflows/ci.yml/badge.svg)](https://github.com/kaiosilveira/nodejs-circuit-breaker/actions/workflows/ci.yml)

🚧 **This repository is a work in progress. It's being constantly updated, so stay tuned if you're interested!** 🚧

This repository is an example implementation of a Circuit Breaker, as described in the "Release it" book, by Michael T. Nygard.

## Roadmap

Remaining things to implement:

- Endpoints for directly tripping the circuit breaker
- Differ circuit breaker failures from normal failures
- Improve logging
- fallback to last cached result in case the transaction-history-service is down

# Hypothetical domain

A banking app was chosen to be the hypothetical domain for this implementation. This app fetches transaction history data from the `TransactionHistoryService`, which is in a remote location. The circuit breaker was implemented to protect the app from displaying errored transaction pages to the users if the transaction history service is down. In such cases, the circuit breaker will return the last cached result for that specific user, only returning an error if there is a cache miss.

# Implementation details

This implementation posed some interesting technical challenges, specially on handling the decrementing of the counters, as node is a single-thread language. The solution for the counters was to abstract it into the [leaky-bucket/process-definition.ts](./src/leaky-bucket/process-definition.ts) child process, which wraps a [LeakyBucket](./src/leaky-bucket/index.ts) class, that holds the counters for all registered clients. The registration is done via inter-process communication using event emitters, and the counters are infinitely decremented using a `setInterval` loop, with a minimum of `0` for each counter:

```typescript
Math.max(0, this.COUNTERS[subscriptionId].current - 1);
```

## Tech stack

**Programming language**

Typescript was chosen to be the programming language for this project, mainly because it allows for a more formal object-oriented programming approach on top of Javascript, which gave me the right level of flexibility when using abstractions (in the form of interfaces), but also because of the improved development experience, with fast feedback loops (code -> build -> unit test) and IDE support (using VSCode).

**Web server**

Express was chosen as the web server framework for this implementation, its middleware structure allow us to plug our circuit breaker as a middleware, blocking requests when in the **_OPEN_** state.

**Test framework**

Jest was chosen as the test runner. Its built-in spying and stubbing structure allows for fast implementation of unit tests and its declarative expectation syntax allows for a readable and elegant test structure.

## Test strategy

As per default, unit tests were implemented for all files that contain logic.

## Continuous Integration

A continuous integration pipeline was put in place to make sure all additions to the `main` branch are healthy. The pipeline definition is pretty straightforward:

```yml
name: Continuous Integration

on:
  push:
    branches: [main]

jobs:
  Integration:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [16.x]

    steps:
      - name: Check out the repository
        uses: actions/checkout@v2

      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v1
        with:
          node-version: ${{ matrix.node-version }}

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build

      - name: Run unit tests
        run: npm run test:unit
```

It install all the dependencies, build the project and run all unit tests.

## The Circuit Breaker

The `CircuitBreaker` interface is relatively simple (at least in its surface):

```typescript
export default interface CircuitBreaker {
  open(): void;
  halfOpen(): void;
  close(): void;
  registerFailure(): void;
}
```

The `open`, `halfOpen` and `close` methods allow for changing the circuit breaker state, and the `registerFailure` method implements the logic to compute a new failure, in whatever way the client code likes.

In our particular case, an [ExpressCircuitBreaker](./src/circuit-breaker/express/index.ts) was implemented. This implementation contains a `monitor(req: Request, res: Response, next: Function)` method, which has the signature of an express middleware and is meant to be added into an express middleware chain. This method is one of the key parts of this implementation, it fails fast in case the circuit is `OPEN`, and adds a listener into the `response.finish` event to monitor each outgoing response and check its status.

`ExpressCircuitBreaker` also relies heavily on the [State Pattern](https://github.com/kaiosilveira/design-patterns/tree/main/state) to react to events when in different states without resorting to a many `switch` statements.

### Closed circuit, requests flowing though

At bootstrap time, the circuit breaker sets its status to closed:

```typescript

constructor({ bucket, logger, config }: ExpressCircuitBreakerProps) {
    // more initialization code here
    this.state = new CircuitBreakerClosedState({ circuitBreaker: this, logger: this.logger });
// ...
}
```

As in a electrical system, a closed circuit means that energy is allowed to flow through. In our case, energy = requests. As mentioned, the circuit breaker monitors all outgoing responses, "taking notes" on its status code and reacting accordingly. In this implementation, this monitoring is done by listening to the `finish` event on the response object:

```typescript
monitor(_: Request, res: Response, next: Function): void | Response {
  // rest of the code above here
  res.on('finish', () => {
    switch (res.statusCode) {
      case 200:
        this.state.handleOkResponse();
        break;
      case 500:
        this.state.handleInternalServerErrorResponse();
        break;
      default:
        break;
    }
  });

  next();
}
```

In the code above, the `handleOkResponse()` method will simply log the fact that there was a successful response going through. For the `handleInternalServerErrorResponse()`, though, things are a little bit more involved. When requests fail and the circuit is `CLOSED`, the `registerFailure()` method is invoked. This method sends a message to the `LeakyBucket` process, which in turn will increase the failure count for the circuit breaker bucket, based on its identifier:

```typescript
class ExpressCircuitBreaker {
  // lots of code

  registerFailure() {
    this.bucket.send({
      type: 'NEW_FAILURE',
      payload: { subscriptionId: this.subscriptionId },
    } as LeakyBucketMessage);
  }
  // more code
}
```

```typescript
// LeakyBUcketProcess
process.on('message', (msg: LeakyBucketMessage) => {
  const { subscriptionId } = msg.payload;
  switch (msg.type) {
    // ...
    case 'NEW_FAILURE':
      bucket.increment({ subscriptionId });
    // ...
  }
  // ...
});
```

This happens until the bucket starts leaking, i.e., when the failure count is high enough to go above the specified threshold, which will cause the bucket to report a `THRESHOLD_VIOLATION` event back to the main process:

```typescript
if (bucket.isAboveThreshold({ subscriptionId })) {
  process.send?.({ type: 'THRESHOLD_VIOLATION', payload: { subscriptionId } });
}
```

The `CircuitBreaker` is able to listen to this event because it subscribes to it at startup time:

```typescript
this.bucket.on('message', this._handleBucketMessage);
```

And then it reacts accordingly, opening the circuit:

```typescript
class ExpressCircuitBreaker extends EventEmitter implements CircuitBreaker {
  private _handleBucketMessage(msg: LeakyBucketMessage): void {
    switch (msg.type) {
      // code
      case 'THRESHOLD_VIOLATION':
        this.logger.info({ msg: 'Threshold violated. Opening circuit.' });
        this.open();
        break;
      // ...
    }
  }

  // code...
}
```

### External service is misbehaving, circuit is opened

When the circuit is `OPEN`, all requests will be blocked and the endpoint will fail fast.

#### Failing fast

One of the main reasons to implement a Circuit Breaker is to be able to fail fast if we know the request is likely to fail anyway:

```typescript
if (this.state.status === CircuitBreakerStatus.OPEN) {
  this.logger.info({ msg: 'Call refused from circuit breaker', status: this.state.status });
  return res.status(500).json({ msg: 'Call refused from circuit breaker' });
}
```

A log is added to let our monitoring team know that a circuit breaker was opened, and a `500 INTERNAL SERVER ERROR` response is returned to the client.

### Control levels goes below threshold, circuit moves to half-open

After a while, the bucket will stop leaking, the `counter` for the given circuit breaker will be back below the threshold, and whenever it happens, the bucket process itself will notify this fact:

```typescript
if (currentCount - threshold === 1) {
  process.send?.({ type: 'THRESHOLD_RESTORED', subscriptionId });
}
bucket.decrement({ subscriptionId });
```

This will in turn trigger a listener on the circuit breaker, which will react changing its status to `HALF_OPEN`:

```typescript
class ExpressCircuitBreaker extends EventEmitter implements CircuitBreaker {
  // ...code
  private _handleBucketMessage(msg: LeakyBucketMessage): void {
    switch (msg.type) {
      // other case statements...
      case 'THRESHOLD_RESTORED':
        this.halfOpen();
        this.logger.info({
          msg: 'Threshold restored. Moving circuit to half-open.',
          status: this.state.status,
        });
        break;
      // ...
    }
  }
  // more code
}
```

In the `HALF_OPEN` state, the next response decides wether new requests will be allowed to flow though again (if `statusCode: 200`) or will continue being denied (if `statusCode: 500`).

### The Leaky Bucket pattern

### The State pattern
