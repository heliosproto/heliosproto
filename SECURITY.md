# Security Policy

`heliosproto` produces a wallet that custodies user funds. Security reports are taken seriously.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Report privately via GitHub's security advisory:
https://github.com/heliosproto/heliosproto/security/advisories/new

If GitHub advisories are unavailable, email `security@heliosproto.com` (placeholder — to be configured on the registered domain).

Include:
- A description of the vulnerability
- Steps to reproduce
- The impact (funds at risk, account takeover, privacy leak, etc.)
- Any suggested mitigation

## Disclosure timeline

- We acknowledge reports within **3 business days**.
- We aim to ship a fix within **30 days** for critical issues, **90 days** for lower severity.
- Coordinated disclosure: once a fix is deployed (and any vulnerable deployments are patched), we publish a security advisory with credit to the reporter unless they prefer to remain anonymous.

## Scope

In scope:
- Smart contracts in `contracts/`
- Wallet app in `web/app/` and `web/extension/`
- Backend services in `backend/`
- SDKs in `sdk-ts/` and `sdk-py/`

Out of scope:
- Vulnerabilities in third-party dependencies (report those upstream)
- Vulnerabilities in Stellar Core, Soroban, or other Stellar protocol layers (report to the [Stellar Bug Bounty](https://hackerone.com/stellar))
- Self-XSS, social engineering, physical attacks
- Issues requiring physical access to a user's device

## Bug bounty

We do not yet operate a paid bug bounty. Once mainnet deployments hold meaningful TVL, a bounty program will be announced separately. Until then, reports are credited and rewarded at maintainer discretion via the Grantfox escrow mechanism.
