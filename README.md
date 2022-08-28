# Circuit Breaker

- Banking circuit breaker with fallback to last cached result in case the transaction-history service is down.
- Leaky bucket pattern (use child process for that)
- Log changes in the CB state (closed, open, half-open)
- Allow for directly tripping the CB
- Differ CB failures form normal failures