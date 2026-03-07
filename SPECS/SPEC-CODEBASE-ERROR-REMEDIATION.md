# SPEC: Codebase Error Remediation Plan

## 1. Objective
Remediate current workspace errors with a phased, risk-based approach while keeping production code stable.

## 2. Error Baseline (from diagnostics)
### 2.1 Core/Config
- `prisma.config.ts`: invalid import (`defineConfig` not exported by `@prisma/client`).

### 2.2 TypeScript Scripts
- `scripts/append-to-practice-tests.ts`
  - `dbResult` typed as `{}` but accessed with `.length` and `[0]`.
  - missing `Question` type.

### 2.3 JS Script Lint Violations
- `scripts/import_generated_questions.js`
- `scripts/append-to-practice-tests.js`
  - `require()` forbidden by lint policy.

### 2.4 Notebook / Data Artifacts
- notebook cell undefined symbols and syntax typo.
- `generated-questions/reading_batch.json` invalid string termination.

## 3. Implementation Phases

### Phase 1 (P0): Core Code Safety
1. Fix `prisma.config.ts` import source for `defineConfig`.
2. Fix TS typing in `scripts/append-to-practice-tests.ts`:
   - introduce explicit row type for raw query result
   - replace `{}` assumptions with typed arrays
   - add/define `Question` interface or import correct type.
3. Re-run diagnostics and ensure no errors in these files.

### Phase 2 (P1): Script Lint Policy Alignment
Option A (preferred): migrate two JS scripts to ESM imports.
Option B: scope lint override for legacy scripts folder.

Deliverable: zero blocking lint errors for script workflow.

### Phase 3 (P2): Notebook/Data Hygiene
1. Notebook fixes:
   - define required symbols before use
   - correct syntax (`", ".join(missing)`)
2. JSON payload repair/regen for invalid file.
3. Optionally move notebook checks out of blocking CI diagnostics.

## 4. Validation Strategy
- Run full diagnostics after each phase.
- Verify no regressions in:
  - admin APIs
  - practice test scripts
  - question manager page.

## 5. Rollback Strategy
- Each phase committed independently.
- If regression occurs, revert only the last phase.

## 6. Acceptance Criteria
- P0: 0 errors in `prisma.config.ts` and critical TS scripts.
- P1: JS script lint path no longer blocks developer checks.
- P2: notebook/data issues resolved or isolated from CI blocking.

## 7. Execution Notes
- Prioritize files that affect runtime/deploy first.
- Treat notebooks/generated data as separate quality track unless directly consumed by prod paths.
