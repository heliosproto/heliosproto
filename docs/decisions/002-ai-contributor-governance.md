# ADR-002: AI Contributor Governance

**Status:** Proposed, awaiting maintainer approval

**Date:** 2026-11-12

**Scope:** Repository-wide dev process. No runtime or protocol changes.

---

## Context

heliosproto is an open-source Soroban wallet project with external contributors arriving through the Grantfox / Drips Wave pipeline. Prior Stellar-ecosystem waves have had incidents where malicious actors opened contributor pull requests that exfiltrated keys or shipped crypto-stealers into other contributors' or maintainers' machines (postinstall scripts, test-setup payloads, obfuscated dependency pins). Reviewing every line manually scales poorly as PR volume grows during a wave.

Today the repo has:

- No branch protection on `main`; direct pushes and force-pushes are allowed.
- No CODEOWNERS; GitHub does not know who is required to approve what.
- No dependency-audit gate in CI; a transitively-installed malicious package would ship with the next build.
- No formal ADR + human-approval flow for non-trivial changes; AI agents can land arbitrary diffs once a human merges the PR.

The threat we are specifically trying to raise the bar against is: **a contributor PR that looks legitimate on first read but contains malicious code or malicious dependencies.** Secondary concern: **AI agents (ours or contributors') pushing changes the maintainer did not actually approve.**

---

## Decision

Adopt a two-phase governance plan.

### Phase A: Minimal anti-malware subset (land now)

1. **`.github/CODEOWNERS`** assigning every path to the maintainer, so every PR surfaces a required code-owner ownership signal.
2. **`.github/workflows/security.yml`** that runs three dependency audits on every PR and on a weekly schedule:
   - `pnpm audit --audit-level high --prod` on `web/`
   - `cargo audit --deny warnings` on `contracts/`
   - `pip-audit --strict` on `backend/api/`
   A high or critical advisory fails the job; a PR carrying a compromised dependency cannot be merged.
3. **Branch protection on `main`** enforced via the GitHub API with:
   - Required status checks: `test` (web), `test` (contracts), `api` (backend), plus the three new audit jobs.
   - Squash-merge only, head branches deleted on merge.
   - No force-pushes; no branch deletion.
   - `enforce_admins: true` so even the maintainer cannot bypass the gates accidentally.

### Phase B: Full AI-governance framework (parked, post-appeal)

The maintainer holds an external blueprint (an 800+ line installable framework extracted from a production Next.js repo with a year of operating history) that adds, on top of Phase A:

- A two-ADR gate (technical + plain-English) with mandatory human approval before non-trivial implementation begins.
- Mandatory git worktree isolation for all AI-agent work.
- A red-green test-first discipline for every bug fix.
- A five-gate local preflight script (`format → lint → typecheck → test → build`) and a matching CI `quality` aggregator required by branch protection.
- A release-notes governance gate: app-code changes without a release note under `docs/release-notes/` fail CI.
- A `ship-*.sh` script pattern so the agent prepares PRs but the maintainer signs and pushes.

Phase B is not installed in this ADR. Installing it is substantial scaffolding work (15+ new files, hook setup, CI aggregation, per-stack adaptations across contracts / web / backend) and would meaningfully slow every subsequent PR during the current Drips appeal review window. The ADR exists to lock the intent and the shape so the install, when it happens, is a well-scoped follow-up PR rather than ad-hoc process.

---

## Diagram

```
Contributor PR
     |
     v
+----------------------+
| CI (parallel)        |
|  - web.yml           |
|  - rust.yml          |
|  - backend.yml       |
|  - security.yml      | <-- Phase A: dependency audits
+----------------------+
     |
     v
+----------------------+
| CODEOWNERS review    | <-- Phase A: maintainer-only approval
+----------------------+
     |
     v
+----------------------+
| Branch protection    | <-- Phase A: squash, no force, admins enforced
+----------------------+
     |
     v
   main

(Phase B adds, before CI: ADR approval gate, worktree isolation,
 red-green test-first fix flow, release-notes gate, preflight aggregator.)
```

---

## Consequences

### Positive

- A compromised transitive dependency fails the security job before a reviewer can merge it, even if nobody reads the diff carefully.
- Branch protection prevents any accidental or malicious direct push, including from a leaked maintainer token.
- CODEOWNERS makes "who approves this" unambiguous to GitHub and to contributors; a GH-UI review-required rule can be flipped on later without more file changes.
- The Phase B framework is on-record as the destination, so if the Drips reviewer asks about contributor-governance posture during appeal review, there is a written answer.

### Negative

- The audit jobs may surface false positives from test-only or dev-only dependencies that have advisories but do not affect production. Those need per-case review and allow-list entries.
- Enforcing admins on branch protection means the maintainer cannot bypass CI on their own branches; this is intentional but changes the current workflow (direct `git push origin main` stops working).
- Phase B, when installed, materially slows PR velocity. It is explicitly not for this ADR to install.

### Operational notes

- The maintainer must run the branch-protection API call manually (see Verification). AI agents are not authorized to modify branch protection settings.
- `cargo audit --deny warnings` can be noisy with yanked-crate warnings; the first failure after install may need a lockfile refresh rather than a code change.

---

## Alternatives considered

1. **Install the full Phase B framework now.** Rejected for timing: 15+ files, changes to every PR workflow, high scaffolding cost during a live appeal. Also partially solves a different problem (AI-agent discipline) rather than the stated malicious-contributor threat.
2. **Do nothing until after the appeal.** Rejected because the audit CI and branch protection are small, high-leverage, and specifically address the attack surface a Drips wave opens.
3. **Rely on manual review alone.** Does not scale and is exactly the attack mode the ecosystem has already been burned by. A reviewer skimming a 500-line PR under time pressure is the failure mode this ADR is designed to replace.
4. **Enable Dependabot instead of a scheduled audit job.** Complementary rather than alternative; Dependabot opens PRs to upgrade, `pnpm audit` / `cargo audit` / `pip-audit` block PRs that ship known-vulnerable deps. Dependabot can land in a later chore PR.

---

## Verification

Phase A is considered installed when all of the following are true:

1. `.github/CODEOWNERS` exists and points at `@Labi-Joy`.
2. `.github/workflows/security.yml` runs on a PR and shows three jobs (`web-audit`, `contracts-audit`, `backend-audit`) all green.
3. `gh api repos/heliosproto/heliosproto/branches/main/protection` returns a non-404 response with:
   - `required_status_checks.contexts` including at least `test` (from web and rust workflows), `api` (from backend), `web-audit`, `contracts-audit`, `backend-audit`.
   - `enforce_admins.enabled: true`.
   - `allow_force_pushes.enabled: false`.
   - `allow_deletions.enabled: false`.

The maintainer runs the branch-protection enable step with:

```bash
gh api -X PUT repos/heliosproto/heliosproto/branches/main/protection \
  -f required_status_checks[strict]=true \
  -f required_status_checks[contexts][]=test \
  -f required_status_checks[contexts][]=api \
  -f required_status_checks[contexts][]=web-audit \
  -f required_status_checks[contexts][]=contracts-audit \
  -f required_status_checks[contexts][]=backend-audit \
  -F enforce_admins=true \
  -F required_pull_request_reviews=null \
  -F restrictions=null \
  -F allow_force_pushes=false \
  -F allow_deletions=false
```

Phase B verification is deferred to the ADR that installs it.
