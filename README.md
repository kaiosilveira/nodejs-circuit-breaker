# nodejs-circuit-breaker

This repository is an example implementation of a Circuit Breaker, as described in the "Release it" book, by Michael T Nygard.

## Roadmap

This is the technical roadmap of things I want to implement in this repo:

- Leaky bucket pattern (use child process for that)
- Endpoints for directly tripping the CB
- Differ callback failures form normal failures
- fallback to last cached result in case the transaction-history-service is down

# Hypothetical domain

A banking app was chosen to be the hypothetical domain for this implementation. This app fetches transaction history data from the `TransactionHistoryService`, which is in a remote location. The circuit breaker was implemented to protect the app from displaying errored transaction pages to the users if the transaction history service is down. In such cases, the circuit breaker will return the last cached result for that specific user, only returning an error if there is a cache miss.

# Implementation details

## Tech stack

**Programming language**
Typescript was chosen to be the programming language for this project, mainly because it allows for a more formal object-oriented programming approach on top of Javascript, which gave me the right level of flexibility when using abstractions (in the form of interfaces), but also because of the improved development experience, with fast feedback loops (code -> build -> unit test) and IDE support (using VSCode).

**Web server**
Express was chosen to be the web server framework for this implementation.

## Test strategy

## The Leaky Bucket pattern

## The State pattern
