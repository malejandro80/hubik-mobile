# Reference: Security & Hardening Checklist

Use this checklist during pre-commit reviews and when modifying data ingestion, authentication, or external integrations.

## 🔒 Security Audit Points

### 1. Trust Boundaries & Input Validation
- [ ] Treat all external input (HTTP headers, request parameters, uploaded files, environment variables) as untrusted.
- [ ] Validate and enforce strict data schemas before processing (e.g., Zod, Pydantic, struct unmarshaling).
- [ ] Reject malformed payloads immediately with structured error codes.

### 2. Secret & Credential Handling
- [ ] Never hardcode API tokens, database connection strings, or private keys.
- [ ] Read secrets strictly from environment variables or secure key vaults.
- [ ] Ensure `.env` is listed in `.gitignore` and never committed.
- [ ] Scrub sensitive data (passwords, tokens, PII) from application logs and error traces.

### 3. Injection & Execution Protection
- [ ] SQL: Use parameterized queries or prepared statements; never concatenate raw user input into SQL strings.
- [ ] Shell: Avoid invoking raw shell processes (`system()`, `exec()`) with user-provided arguments.
- [ ] XSS / HTML: Ensure appropriate context-aware escaping on user content.

### 4. Dependency Auditing
- [ ] Only add dependencies with proven maintenance and security track records.
- [ ] Check installed dependencies for known vulnerabilities before adding new libraries.
