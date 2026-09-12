# Workspace Rule: Anti-Test Tampering Protocol

This rule guarantees the integrity of test suites and prevents false positive ("fake green") test runs.

## 🛑 The Tampering Ban
When tests fail, AI agents are often tempted to "fix" the failure by modifying the test file to accommodate faulty code. This is strictly prohibited.

1. **Existing Assertions are Sacred**:
   - You must NEVER alter, comment out, or weaken existing test assertions to make a test pass.
   - If an assertion fails, the flaw is presumed to be in the **implementation**, not the test.
2. **When Test Changes are Permitted**:
   - A test may be modified ONLY IF the user explicitly requested a change to the underlying functional specification or API contract.
   - Any modification to existing tests must be accompanied by an explicit explanation in the commit message describing why the requirement changed.
3. **No Muting of Failures**:
   - Never skip tests (`@pytest.mark.skip`, `it.skip`, `t.Skip()`) to bypass CI/CD failures unless requested by the human lead.
   - Never artificially catch and suppress assertion errors in test harnesses.
