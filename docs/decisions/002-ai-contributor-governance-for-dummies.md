# ADR-002 for Dummies: AI Contributor Governance

**Status:** Proposed, awaiting maintainer approval

**Date:** 2026-11-12

---

## The Idea

Set a few guardrails on the repo so that if a hostile contributor shows up during the Drips wave and tries to sneak malware into a pull request, the project catches it before it lands. Do the small, cheap things now; park the bigger process overhaul for after the appeal result is in.

## What the Person Sees

A contributor opens a pull request. Before anyone can merge it:

1. The usual tests run (lint, build, unit tests) as before.
2. A new security job runs. It scans every dependency the PR would install, for every pillar of the project (web, contracts, backend). If any dependency has a known high or critical vulnerability, the PR is red and cannot be merged.
3. GitHub shows the maintainer as the required code owner for every file touched. The maintainer is the only person who can approve and merge.
4. Nobody, not even the maintainer, can push directly to `main` or force-push over history. Every change has to come in via a PR with green checks.

## Important Limitation

This proposal does not install the full governance framework (the one with mandatory architecture decision records, worktree discipline, release notes gated in CI, and a signed ship-script workflow). That heavier overhaul slows every pull request and is a bigger commitment. It is on the table but it waits until the appeal outcome is in, so the current review period is not disrupted.

The dependency-audit jobs will sometimes block a PR that adds a dependency with an advisory that does not actually affect the project (a test-only lib, for example). When that happens, the maintainer has to look at the advisory, decide it is harmless, and add it to an allow-list. This will happen occasionally.

## What Changes

- A new CODEOWNERS file names the maintainer as owner of every file.
- A new security CI workflow runs three dependency audits (`pnpm audit`, `cargo audit`, `pip-audit`) on every PR and once a week.
- Branch protection on `main` turns on, with:
  - squash-merge only
  - no force-pushes, no branch deletion
  - the usual tests + the new audit jobs required to be green before merge
  - admins (the maintainer) included in the gate, no backdoor
- A written ADR captures the plan to install the full governance framework later, so the direction is on record.

## What Does Not Change

- No on-chain behavior. No contract code touched.
- No change to the demo, the wallet UI, or any of the live surfaces.
- No change to how the maintainer writes code themselves; they still work on branches and PRs the same way.
- Nothing about the Drips appeal content changes; this ADR is a standalone governance proposal.
