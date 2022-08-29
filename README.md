# nodejs-circuit-breaker

[![Continuous Integration](https://github.com/kaiosilveira/nodejs-circuit-breaker/actions/workflows/ci.yml/badge.svg)](https://github.com/kaiosilveira/nodejs-circuit-breaker/actions/workflows/ci.yml)

🚧 **This repository is a work in progress. It's being constantly updated, so stay tuned if you're interested!** 🚧

This repository is an example implementation of a Circuit Breaker, as described in the "Release it" book, by Michael T. Nygard.

## Roadmap

Remaining things to implement:

- Endpoints for directly tripping the CB
- Differ callback failures form normal failures
- Improve logging
- fallback to last cached result in case the transaction-history-service is down

# Hypothetical domain

A banking app was chosen to be the hypothetical domain for this implementation. This app fetches transaction history data from the `TransactionHistoryService`, which is in a remote location. The circuit breaker was implemented to protect the app from displaying errored transaction pages to the users if the transaction history service is down. In such cases, the circuit breaker will return the last cached result for that specific user, only returning an error if there is a cache miss.

# Implementation details

## Tech stack

**Programming language**
Typescript was chosen to be the programming language for this project, mainly because it allows for a more formal object-oriented programming approach on top of Javascript, which gave me the right level of flexibility when using abstractions (in the form of interfaces), but also because of the improved development experience, with fast feedback loops (code -> build -> unit test) and IDE support (using VSCode).

**Web server**
Express was chosen as the web server framework for this implementation, its middleware structure allow us to plug our circuit breaker as a middleware, blocking requests when in the **_OPEN_** state.

**Jest**
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

In our particular case, an `ExpressCircuitBreaker` was implemented. This implementation contains a `monitor(req: Request, res: Response, next: Function)` method, which has the signature of an express middleware and is meant to be added into an express middleware chain. This method is one of the key parts of this implementation, it fails fast in case the circuit is `OPEN`, and adds a listener into the `response.finish` event to monitor each outgoing response and check its status.

### Closed circuit, requests flowing though

### Half-Open circuit, next response status decides

### Failing fast

One of the main reasons to implement a Circuit Breaker is to be able to fail fast if we know the request is likely to fail anyway. That's what happens when the circuit is open:

```typescript
if (this.state.status === CircuitBreakerStatus.OPEN) {
  this.logger.info({ msg: 'Call refused from circuit breaker', status: this.state.status });
  return res.status(500).json({ msg: 'Call refused from circuit breaker' });
}
```

A log is added to let our monitoring team know that a circuit breaker was opened, and a `500 INTERNAL SERVER ERROR` response is returned to the client.

## The Leaky Bucket pattern

### The State pattern
