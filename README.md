[![Continuous Integration](https://github.com/kaiosilveira/nodejs-circuit-breaker/actions/workflows/ci.yml/badge.svg)](https://github.com/kaiosilveira/nodejs-circuit-breaker/actions/workflows/ci.yml)

_This repository is an example implementation in NodeJS of a Circuit Breaker as described in "Release it! - Nygard" and is part of my Stability Patterns Series. Check out [kaiosilveira/stability-patterns](https://github.com/kaiosilveira/stability-patterns) for more details._

# Circuit breaker

In electrical engineering there's a concept of "circuit breaker", a mechanism to stop energy of flowing through and potentially burning down all the system if something goes wrong. Its equivalent in the software engineering world mimics this mechanism and creates a parallel between energy and requests. As Nygard mentions in his book: requests are the energy of our system, and we need a way of protecting the whole system of being completely burned down.

Circuit breakers contains three states:

- `CLOSED`: Requests flow normally through
- `OPEN`: Requests do not flow through and operation is refused
- `HALF_OPEN`: Next request is evaluated by the circuit breaker code, if it succeeds, the circuit state is changed to `CLOSED`, otherwise it goes back to `OPEN`

Find below the hypothetical domain used to give an example of this pattern in action, alongside all of its technical details.

## Hypothetical domain

A banking app was chosen to be the hypothetical domain for this implementation. This app fetches transaction history data from the `TransactionHistoryService`, which is in a remote location. The circuit breaker was implemented to protect the app from displaying errored transaction pages to the users if the transaction history service is down. In such cases, the circuit breaker will return the last cached result for that specific user, only returning an error if there is a cache miss.

## Implementation details

This implementation posed some interesting technical challenges, specially on handling the decrementing of the counters, as node is a single-thread language. The solution for the counters was to abstract it into a [child process](./src/leaky-bucket/index.ts), which wraps a [LeakyBucket](./src/leaky-bucket/leaky-bucket/index.ts) class that holds the counters for all registered clients. The registration is done via inter-process communication using event emitters, and the counters are infinitely decremented using a `setInterval` loop, with a minimum of `0` for each counter:

```typescript
Math.max(0, this.COUNTERS[subscriptionId].current - 1);
```

### Tech stack

**Programming language**

Typescript was chosen to be the programming language for this project, mainly because it allows for a more formal object-oriented programming approach on top of Javascript, which gave me the right level of flexibility when using abstractions (in the form of interfaces), but also because of the improved development experience, with fast feedback loops (code -> build -> unit test) and IDE support (using VSCode).

**Web server**

Express was chosen as the web server framework for this implementation, its middleware structure allow us to plug our circuit breaker as a middleware, blocking requests when in the **_OPEN_** state.

**Test framework**

Jest was chosen as the test runner. Its built-in spying and stubbing structure allows for fast implementation of unit tests and its declarative expectation syntax allows for a readable and elegant test structure.

### Test strategy

As per default, unit tests were implemented for all files that contain logic.

### Continuous Integration

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

### The Circuit Breaker

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

#### Closed circuit, requests flowing though

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
class LeakyBucketProcessManager {
  // ...some code...

  private handleNewFailureMessage(msg: LeakyBucketMessage): void {
    const { subscriptionId } = msg.payload;
    this._bucket.increment({ subscriptionId });
    // some other code ...
  }

  // more code...
}
```

This happens until the bucket starts leaking, i.e., when the failure count is high enough to go above the specified threshold, which will cause the bucket to report a `THRESHOLD_VIOLATION` event back to the main process:

```typescript
class LeakyBucketProcessManager {
  // ...some code...
  private handleNewFailureMessage(msg: LeakyBucketMessage): void {
    // some other code ...
    if (this._bucket.isAboveThreshold({ subscriptionId })) {
      this._processRef.send?.({
        type: LeakyBucketMessageTypes.THRESHOLD_VIOLATION,
        payload: { subscriptionId },
      });
    }
  }

  // more code...
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

#### External service is misbehaving, circuit is opened

When the circuit is `OPEN`, all incoming requests which would activate the problematic remote service will be rejected, unless there is a cache entry for the user requesting the data.

##### Cache entry available

In this case, the circuit breaker will return a potentially outdated result, but which will still allow users to see something on the UI. to let users know about the possible discrepancy between what's in the screen and what is the current state of the system, a flag `fromCache: true` is provided.

##### Failing fast

One of the main reasons to implement a Circuit Breaker is to be able to fail fast if we know the request is likely to fail anyway:

```typescript
if (this.state.status === CircuitBreakerStatus.OPEN) {
  this.logger.info({ msg: 'Call refused from circuit breaker', status: this.state.status });
  return res.status(500).json({ msg: 'Call refused from circuit breaker' });
}
```

A log is added to let our monitoring team know that a circuit breaker was opened, and a `500 INTERNAL SERVER ERROR` response is returned to the client.

#### Control levels goes below threshold, circuit moves to half-open

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

### The Leaky Bucket

The `LeakyBucket` class controls the lifecycle of the counters for a given `subscriptionId`. As mentioned above, this class is used by a process manager that runs as a child-process and communicates to the main process whenever needed. The `LeakyBucket` interface is pretty straightforward:

```typescript
interface LeakyBucket {
  subscribe({ subscriptionId, threshold }: { subscriptionId: string; threshold?: number }): void;
  fetchThresholdFor({ subscriptionId }: { subscriptionId: string }): number;
  fetchCountFor({ subscriptionId }: { subscriptionId: string }): number;
  increment({ subscriptionId }: { subscriptionId: string }): void;
  decrement({ subscriptionId }: { subscriptionId: string }): void;
  resetCountFor({ subscriptionId }: { subscriptionId: string }): void;
  isAboveThreshold({ subscriptionId }: { subscriptionId: string }): Boolean;
}
```

And the corresponding `LeakyBucketProcessManager` looks also pretty simple:

```typescript
interface LeakyBucketProcessManager {
  handleMessage(msg: LeakyBucketMessage): void;
  handleTick(): void;
  getTickIntervalInMs(): number;
}
```

To start the magic, we need to create a new instance of `LeakyBucketProcessManager` and give it a `LeakyBucket`, a value for `tickIntervalMs` and a `ref` to the process:

```typescript
const processManager = new LeakyBucketProcessManagerImpl({
  processRef: process,
  bucket: new LeakyBucketImpl(),
  tickIntervalMs: 1000,
});
```

Then, we need to plug its `handleMessage` method into the `process.on('message', fn)` so we can listen to messages from the main process:

```typescript
process.on('message', processManager.handleMessage);
```

The `handleMessage` method knows how to manipulate the `LeakyBucket` instance according to the type of message received. It looks like this:

```typescript
handleMessage(msg: LeakyBucketMessage): void {
  switch (msg.type) {
    case LeakyBucketMessageTypes.REGISTER:
      this.handleRegisterMessage(msg);
      break;
    case LeakyBucketMessageTypes.NEW_FAILURE:
      this.handleNewFailureMessage(msg);
      break;
    case LeakyBucketMessageTypes.RESET:
      this.handleResetMessage(msg);
      break;
    default:
      break;
  }
}
```

Finally, we can set up the infinity loop using a `setInterval` statement to decrement the counters in an interval of `tickIntervalMs`:

```typescript
setInterval(processManager.handleTick, processManager.getTickIntervalInMs());
```

The code above basically means that for every tick of the interval we will be decrementing `1` from the counters of each subscription. This is done inside the `handleTick` function, which does a few things:

- goes over each subscription
  - decrements it
  - checks if the current `counter - threshold` is equal `1`
  - if so, send a message to the main process notifying that the control level was restored

Below there's the actual implementation:

```typescript
handleTick(): void {
  this._bucket.fetchSubscriptionIds().forEach((subscriptionId: string) => {
    const currentCount = this._bucket.fetchCountFor({ subscriptionId });
    const threshold = this._bucket.fetchThresholdFor({ subscriptionId });
    if (currentCount - threshold === 1) {
      this._processRef.send?.({
        type: LeakyBucketMessageTypes.THRESHOLD_RESTORED,
        subscriptionId,
      });
    }
    this._bucket.decrement({ subscriptionId });
  });
}
```

### Faking a remote service having trouble

To fake a `TransactionHistoryService` under trouble, we're going to use our [TransactionHistoryService](src/app/services/transaction-history/fake/index.ts). This fake returns a failure in every fourth response if the circuit breaker status is not `OPEN`. With this, we can simulate "random" failures from a remote service and can test that our circuit breaker is behaving as expected.

### Application state

To keep track of all registered circuit breakers and to allow for direct manipulation of their states, an `ApplicationState` interface was defined:

```typescript
interface ApplicationState {
  fetchCircuitBreakerState(circuitBreakerId: string): CircuitBreakerStatus;
  registerCircuitBreaker(circuitBreaker: CircuitBreaker): void;
  describeRegisteredCircuitBreakers(): Array<CircuitBreakerDescription>;
  setCircuitBreakerState({
    circuitBreakerId,
    state,
  }: {
    circuitBreakerId: string;
    state: CircuitBreakerStatus;
  }): void;
}
```

and an [in-memory representation](./src/app/infra/application-state/in-memory/index.ts) was provided.

This implementation acts as a middleman between the `admin` resource and the `CircuitBreaker`s themselves, allowing for HTTP requests to modify the current state of any circuit breaker.

### Taking the kid to the playground

To "manually" test our circuit breaker, we are going to use `loadtest`. With that, we will simply send 10 requests per second targeting the transaction history endpoint, which will eventually cause the fake service mentioned above to fail often enough to trip the circuit breaker:

```console
loadtest --rps 10 'http://localhost:3000/transaction-history/mine'
```

We can see in the logs that the circuit breaker opens after some failed requests, then it starts to resolve requests from cache and, after a while, it recovers to `HALF_OPEN`, allowing new requests to flow trough:

```console
info: {"msg":"Successful response","status":"closed"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Successful response","status":"closed"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
error: {"msg":"Failed to execute"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Threshold violated. Opening circuit."} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Resolving request using cached data while in OPEN state"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Resolving request using cached data while in OPEN state"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Resolving request using cached data while in OPEN state"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Resolving request using cached data while in OPEN state"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Resolving request using cached data while in OPEN state"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Resolving request using cached data while in OPEN state"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Threshold restored. Moving circuit to half-open.","status":"half_open"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
info: {"msg":"Successful response while in a HALF_OPEN state. Closing the circuit.","status":"half_open"} {"defaultMeta":{"object":"ExpressCircuitBreaker"}}
```
