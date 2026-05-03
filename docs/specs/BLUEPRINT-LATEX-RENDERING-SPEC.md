# Blueprint: Universal Text + LaTeX Rendering Spec Template

Use this blueprint to write implementation-ready specs for rendering consistency across all question surfaces.

## 1. Document Header
- Spec Title:
- Date:
- Author:
- Status: Draft | In Review | Approved
- Related Issues/PRD/ADR:

## 2. Goal (1-2 paragraphs)
Define exactly what rendering consistency means in this scope.

Required language:
- "All question content fields render consistently across all listed surfaces."
- "No raw LaTeX artifacts (e.g., backslash commands, orphan delimiters) are user-visible."

## 3. Problem Statement
Describe current inconsistencies with concrete examples.

Include at least 3 failing examples:
1. Doubled-slash command example (`2\\\\sqrt{2}`)
2. Non-delimited LaTeX option example (`B) 2\\sqrt{2}`)
3. Mixed text + latex explanation example

## 4. Scope Matrix
Create a table with columns:
- Surface
- Current renderer path
- API source
- Status (Compliant/Non-compliant)
- Owner

Minimum required surfaces:
- Topic Drill
- Practice Test
- Question Library/Web
- Group Study
- Admin Review
- Exported HTML

## 5. Canonical Contracts
5.1 API contract
- Define normalized text payload expectations
- Define slash normalization behavior
- Define entity decoding behavior

5.2 Client renderer contract
- Define approved delimiters
- Define non-delimited command handling policy
- Forbid direct field-level `dangerouslySetInnerHTML` bypasses

5.3 Export contract
- Define static render runtime and delimiter policy

## 6. Normalization Rules
For each rule provide:
- Rule name
- Input example
- Output example
- Safety notes

Required rules:
- Slash normalization
- Delimiter preservation
- Conditional auto-wrap
- Non-math backslash preservation
- Entity decode ordering

## 7. Architecture and File Targets
List exact files to modify by layer.

Required layers:
- Shared math utilities
- Core renderer component
- API response normalizers
- Surface components/pages
- Export scripts

## 8. Rendering Invariants
Define non-negotiable invariants (must be testable).

Required invariants:
- No raw LaTeX commands visible
- No orphan `$`
- Identical rendering across listed surfaces for same fixture

## 9. Test Plan
9.1 Unit tests (normalization helpers)
9.2 Renderer component tests
9.3 API contract tests
9.4 End-to-end tests for each surface
9.5 Exported HTML smoke tests

Include a fixture pack section with at least 10 representative strings.

## 10. Rollout and Migration Plan
Define phases with owners, dependencies, and rollback plan.

Required phase sequence:
1. Utilities
2. Renderer
3. API normalization
4. Surface migrations
5. Export parity
6. Regression gates in CI

## 11. Acceptance Criteria
Use numbered ACs (AC1, AC2, ...), each objective and testable.

Required ACs:
- AC for each surface
- AC for no raw slash/dollar artifacts
- AC for CI regression coverage

## 12. Risk Register
For each risk:
- Risk description
- Likelihood (Low/Med/High)
- Impact (Low/Med/High)
- Mitigation
- Owner

Required risks:
- Over-aggressive auto-wrap false positives
- Performance impact from render parsing
- Legacy page divergence

## 13. Open Questions
List unresolved architectural choices and decision owners.

## 14. Implementation Checklist (Ready-to-Ship)
- [ ] Shared utility module implemented
- [ ] Renderer migrated to shared utility
- [ ] APIs normalized
- [ ] Legacy html injection paths removed
- [ ] Export parity complete
- [ ] Unit + integration tests green
- [ ] QA visual verification complete
- [ ] Documentation updated

## Appendix A: Fixture Starter Pack
- `A) 2\\\\sqrt{2}`
- `B) 2\\sqrt{2}`
- `C) $2\\sqrt{2}$`
- `x &lt; y &amp; y &gt; 0`
- `Path C:\\Users\\name`
- `\\frac{3}{4}`
- `Let f(x)=x^2 and g(x)=\\sqrt{x}`
- `The value is $\\frac{1}{2}$ and the ratio is 3:4`
- `\\triangle ABC is right at A`
- `Distance = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}`

## Appendix B: Spec Review Rubric
A spec is "implementation-ready" only if:
- Every surface has explicit migration target files
- Invariants are testable and mapped to tests
- Acceptance criteria are measurable
- Rollout includes rollback plan
- Risk owner assigned for each high-impact risk
