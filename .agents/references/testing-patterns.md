# Reference: Testing Patterns & Anti-Patterns

A concise reference for designing resilient, high-signal automated tests across any programming language.

## 🎯 The Test Pyramid

1. **Unit Tests (70%)**:
   - Fast, in-memory, deterministic.
   - Tests isolated functions, state transitions, and edge cases.
   - Zero network, database, or disk dependencies.
2. **Integration Tests (20%)**:
   - Tests component boundaries (e.g. database repositories, API handlers, file parsers).
   - Use testcontainers or ephemeral test databases where possible.
3. **End-to-End / Contract Tests (10%)**:
   - Tests critical user journeys and external API contracts.

---

## 🚫 Common Test Anti-Patterns to Avoid

- **Testing Implementation Details**: Don't assert private method execution or internal variable states. Assert observable outputs and side-effects.
- **Mocking What You Don't Own**: Wrap external services in thin adapters and mock your adapter interface, not third-party HTTP clients.
- **Flickering / Non-Deterministic Tests**: Avoid `sleep(N)`. Use condition-polling, events, or deterministic clocks.
- **Test Tampering**: Never modify an existing test assertion just because a code edit caused it to fail. Fix the code.
- **Over-Mocking**: If a test requires 15 lines of mock setup for 2 lines of logic, refactor the underlying code to be simpler.
