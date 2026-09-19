# Workspace Rule: Architecture & Modularity Core

This rule establishes non-negotiable architectural standards for code created or modified in this repository.

## 1. Modularity & Sizing Rules
- **Maximum File Length**: Strive to keep individual source files under **300 lines**. If a file exceeds 300 lines, extract cohesive sub-modules or helper functions.
- **Single Responsibility**: Each module, class, or function should perform exactly one well-defined responsibility.
- **Explicit Interfaces**: Keep public interfaces minimal and tightly typed. Private helpers should not be exported.
- **Style Isolation Rule**: All visual stylesheets must be isolated into separate `<Module>.styles.ts` companion files. Never declare inline `StyleSheet.create` inside JSX/TSX view files.

## 2. The Ponytail Minimalist Ladder
Before introducing any new code, stop at the first rung that satisfies the requirement:
1. **Does this need to exist? (YAGNI)**: If the feature or abstraction was not explicitly requested, skip it.
2. **Already in this codebase?**: Reuse existing helpers, utilities, and patterns rather than rewriting.
3. **Standard Library first**: If the language stdlib covers it (`pathlib`, `itertools`, `Intl`, `fetch`, `net/http`), use it.
4. **Native platform feature?**: Prefer native OS or runtime capabilities over third-party packages.
5. **Installed dependency?**: If an existing dependency handles it, do not add another package.
6. **Can it be one line?**: Make it one line.
7. **Only then**: Write the absolute minimum code that passes the test.

## 3. Hyrum's Law & API Design
- "With a sufficient number of users of an API, it does not matter what you promise in the contract: all observable behaviors of your system will be depended on by somebody."
- Do not expose internal implementation details (e.g. hash ordering, private attributes, undocumented return keys) in public APIs.
- Version breaking changes explicitly and document migration paths.

## 4. Architecture Decision Records (ADRs)
- Any significant architectural decision (e.g., introducing a new database, adopting a new framework, or altering core data models) requires an ADR in `docs/adr/`.

## 5. Pure Logic Extraction Outside Components
- **Zero Heavy Logic in Components**: Parsing, string manipulation, regex tokenization, heavy formatting, and complex data transformations must NEVER be embedded inside component functions or render methods.
- **Top-Level Pure Functions or Utilities**: Extract data transformers, parsers, and computational helpers into pure functions outside the component body (at top-level of module or dedicated utilities).
- **Separation of Concerns**: React components must remain lean and declarative, focusing strictly on UI layout, props passing, and styling, while all business/parsing logic is isolated, pure, and independently unit-testable.

## 6. Dedicated Library Modules (`src/lib/`) for Secondary Functions & Dictionaries
- **Isolation of Dictionaries & Formatters**: Option dictionaries, type guards, string formatters, intent recognizers, and data transformers must not reside within `.tsx` screen or component files.
- **Dedicated Cohesive Modules**: Extract these pure functions and lookup dictionaries into dedicated library files under `src/lib/` (e.g., `src/lib/livingDraft.ts`, `src/lib/messageParser.ts`, `src/lib/chatRegistration.ts`).
- **Independent Testability**: Every library module under `src/lib/` must have an associated test suite under `src/lib/__tests__/`. React view files consume these tested libraries via clean imports.

## 7. Self-Documenting Code & Zero-Comment Discipline
- **Zero Explanatory Comments**: Do not write comments (`//`, `/* */`, `{/* */}`) to explain what functions, constants, props, or components do.
- **Semantic Naming**: Ensure all types, props, functions, constants, and variables use crystal-clear, self-explanatory domain names that eliminate any ambiguity.
- **Self-Evident Architecture**: If code requires an explanation, refactor it into smaller, semantically named functions, pure helpers, or well-named constants.


