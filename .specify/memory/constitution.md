<!--
Sync Impact Report:
- Version change: 1.0.0 → 2.0.0
- Modified principles: Complete restructure from exploration phase to MVP-focused development
- Added sections: Development Workflow (quality gates)
- Removed sections: None (first formal ratification of template)
- Templates requiring updates:
  ✅ spec-template.md - User story prioritization aligns with MVP-first principle
  ✅ plan-template.md - Constitution Check section will validate against these principles
  ✅ tasks-template.md - Task organization by user story supports MVP incremental delivery
- Follow-up TODOs: None
- Rationale for MAJOR version bump: First formal ratification, establishing non-negotiable governance model
-->

# grafana-cli Constitution

## Core Principles

### I. MVP-First Development (NON-NEGOTIABLE)

**Start simple. Ship value. Iterate based on real usage.**

- Every feature MUST begin with the minimum viable implementation that delivers user value
- Implement ONE user story at a time in priority order (P1 → P2 → P3)
- YAGNI (You Aren't Gonna Need It) is law: do not add features, abstractions, or configurations "for future use"
- No "enterprise patterns" (Repository, Factory, Strategy) unless solving a demonstrated problem in the current code
- No speculative error handling: validate at system boundaries (user input, external APIs), trust internal contracts
- Three similar lines are better than a premature abstraction
- Question: "Does removing this break the current user story?" If no, remove it.

**Rationale**: Over-engineering delays delivery, increases maintenance burden, and often solves problems that never materialize. Ship working software first, complexity only when proven necessary.

### II. CLI-First Interface

**Consistent text-based protocol for maximum composability.**

- Every command MUST follow stdin/arguments → stdout, errors → stderr protocol
- Exit codes MUST be meaningful: 0 success, 1 general error, 2+ specific error categories
- Support both JSON output (--json flag) and human-readable formats (default)
- All output MUST be parseable: no mixing of data and decorative elements on stdout
- Interactive prompts MUST use stderr, allowing stdout piping to remain clean
- Each command MUST be independently testable via command-line invocation

**Rationale**: CLI-first design ensures commands are composable with pipes, scriptable, and testable without complex mocking. Consistent protocols reduce cognitive load and enable automation.

### III. Clean Architecture & SOLID (NON-NEGOTIABLE)

**Separation of concerns with testable boundaries.**

- **Single Responsibility**: One module, one reason to change (e.g., config management vs API client)
- **Dependency Inversion**: Core logic depends on interfaces, not implementations (e.g., IConfigStore, IGrafanaClient)
- **Interface Segregation**: Small, focused interfaces (don't force CLI commands to implement unused methods)
- **Layer separation**: Domain entities → Use cases → Interface adapters → Frameworks/drivers
- No business logic in CLI command handlers: commands orchestrate, use cases execute
- External dependencies (axios, fs) isolated behind interfaces for testability

**Enforcement**:

- PR reviews MUST verify: Is business logic in domain/use cases or leaked into CLI handlers?
- PR reviews MUST verify: Are external dependencies directly imported in use cases, or abstracted?
- PR reviews MUST verify: Is this adding complexity without solving a current problem?

**Rationale**: Clean Architecture enables testing without HTTP servers, file systems, or external services. SOLID principles ensure changes remain localized and maintainable as the project grows.

### IV. Practical Testing

**Test what matters, skip the ceremony for MVP.**

- **Contract tests**: Required for all external APIs (Grafana REST endpoints) - ensures our client matches the API contract
- **Integration tests**: Required for complete user journeys (e.g., "config set → status check → query dashboard")
- **Unit tests**: Optional for MVP - add when logic is complex enough to warrant isolated testing
- **TDD for contract tests**: Write failing test → implement → green test cycle
- **No mocking internal code**: Integration tests use real config files (in temp directories), real API clients (against test servers or recorded responses)
- **Test pyramid for MVP**: Few contract tests (API surface) → More integration tests (user journeys) → Unit tests only when needed

**What NOT to test for MVP**:

- Trivial getters/setters
- Framework code (commander already tested by its maintainers)
- Code with no conditional logic

**Rationale**: Testing ceremonies (100% coverage, mocking everything, TDD everywhere) slow MVP delivery. Focus tests on contracts and user journeys where failures hurt real usage. Unit tests emerge naturally when complexity demands them.

### V. Performance & Scalability

**Responsive CLI, efficient API usage.**

- **Response time**: All CLI commands MUST complete within 5 seconds for typical use cases (excluding large data queries)
- **Resource usage**: CLI MUST NOT consume more than 100MB memory for normal operations
- **API efficiency**: Batch requests when possible, cache responses locally with TTL (e.g., dashboard lists cached for 60s)
- **Lazy loading**: Only fetch data when needed - don't preload all dashboards on startup
- **Progress feedback**: Long-running operations (>1s) MUST show progress to stderr

**Measurement**:

- Profile commands during development: `time grafana-cli <command>`
- Monitor memory: `ps aux` during command execution
- Track API call counts: log HTTP requests during integration tests

**Rationale**: CLI tools must feel snappy. Users abandon slow tools. Efficient API usage respects rate limits and reduces server load. Performance is a feature, not an afterthought.

## Development Workflow

### Quality Gates

**Pre-commit**:

- Code MUST pass formatting (Prettier) and type checking (TypeScript strict mode)
- Linting: ESLint is deferred until MVP ships; TypeScript strict mode serves as the primary static analysis gate for MVP
- No debug `console.log` in committed code (remove or replace with intentional output). Note: CLI commands legitimately use `console.log` for stdout output and `console.error` for stderr — these are NOT debug logs and are permitted per Principle II (CLI-First Interface)

**Pre-PR**:

- All contract tests MUST pass
- All integration tests for changed features MUST pass
- New API integrations MUST include contract tests
- New user journeys MUST include integration tests

**Code Review Requirements**:

- Reviewer MUST verify constitution compliance (especially Principle I: MVP-First)
- Reviewer MUST challenge any abstractions not solving current problems
- Reviewer MUST verify test coverage for contracts and user journeys
- Reviewer MUST verify CLI protocol adherence (stdout/stderr/exit codes)

### Iteration Workflow

1. **User Story Selection**: Pick highest priority unimplemented story (P1 → P2 → P3)
2. **Contract Test First**: Write failing test for external API interactions
3. **Integration Test**: Write failing test for complete user journey
4. **Implement**: Simplest code that makes tests pass
5. **Refactor**: Extract abstractions only if duplication is painful
6. **Ship**: Commit, PR, merge, tag
7. **Repeat**: Move to next priority user story

## Governance

### Amendment Process

1. **Proposal**: Document proposed change with rationale in GitHub issue
2. **Impact Analysis**: Identify affected code, tests, documentation
3. **Migration Plan**: Define how existing code will be updated to comply
4. **Approval**: Requires consensus from maintainers
5. **Version Bump**: Increment version (MAJOR/MINOR/PATCH) per semantic rules
6. **Propagation**: Update all template files, documentation, and add sync report

### Semantic Versioning Rules

- **MAJOR**: Backward incompatible changes (e.g., removing a core principle, changing governance model)
- **MINOR**: New principles added, existing principles materially expanded
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Review

- All PRs MUST reference constitution principles in review comments
- Quarterly review: Scan codebase for principle violations, create remediation issues
- Constitution supersedes all other practices: when conflict arises, constitution wins

### Living Document

This constitution evolves with the project. When a principle becomes a burden rather than a guide, propose an amendment. When new patterns emerge that improve quality, codify them. Balance is: stable enough to guide, flexible enough to adapt.

**Version**: 2.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-15
