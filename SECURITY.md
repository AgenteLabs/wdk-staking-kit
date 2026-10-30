<!-- estate-hygiene:begin — emitted by tools/estate-hygiene-files.mjs in AgenteLabs/flashyos; regenerate, never edit -->
# Security

## Reporting a vulnerability

Report it privately, never in a public issue, pull request or chat channel.
Two routes, and both reach the same people:

- **Email michael@flashygroup.com** — the estate's one disclosure address, the same one
  published at https://flashynetwork.com/security/
  and in https://flashynetwork.com/.well-known/security.txt.
  One route across every repository is deliberate: a researcher who finds two
  addresses and picks the worse one has been failed by us, not by their choice.
- **GitHub → Security → Report a vulnerability** on this repository, which
  opens a private advisory only the maintainers can read. If that button is
  missing, private vulnerability reporting has not been enabled on this
  repository yet; use the email route and say so in the report.

Include what you found, how to reproduce it and what you believe the impact
is. Do not include real credentials, private keys or production data: nothing
here needs them to reproduce a finding.

## What to expect

| | |
|---|---|
| Acknowledgement | within 72 hours |
| An assessment, and what we are doing | agreed with you, in writing |
| Publication | a window agreed with you, never imposed |

If we miss the acknowledgement window, say so publicly. A window nobody is
held to is worse than none, because it asks a reporter to wait on a promise
that was never load-bearing.

## Supported versions

The default branch only. There is no maintained release line behind it: a
finding against the default branch is in scope, a finding against an older
tag or a fork is a reason to update.

## A committed credential is rotated, never removed

If a report is that a secret reached this repository, the fix is rotation at
the issuer. Deleting the file, rewriting history or force-pushing is not a
fix: the value is burned the moment it lands and stays burned, because
history, forks, caches and mirrors keep it. Say which secret, and we rotate
it before anything else.

## About this document

The sections above are emitted by [`tools/estate-hygiene-files.mjs`](https://github.com/AgenteLabs/flashyos/blob/main/tools/estate-hygiene-files.mjs)
in AgenteLabs/flashyos from one template the whole estate shares, and
`--check` fails when they drift.
Regenerate them; never edit them here. Anything below the marker is this
repository's own and is kept as written.
<!-- estate-hygiene:end — everything below is this repository’s own -->

## Threat model

This package holds no key, signs nothing, and makes no network call. It is an accounting layer: given a `BalanceProvider` you supply, it decides whether a lock is permitted and computes yield on close. Its security surface is:

- **Over-crediting yield.** The one write this package performs is `provider.credit()` on close. `yieldForAmount()` is computed in `BigInt` specifically so this cannot silently over-credit at scale — see `ARCHITECTURE.md`. A bug that inflates a payout is the most severe class of issue this package could contain.
- **Under-checking `available()`.** If `lock()` allowed earmarking more than a holder's actual balance, a holder could lock funds they don't have. `test/staking.test.mjs` exercises this directly (`InsufficientAvailableError`).
- **Non-idempotent retries.** A retried `lock()` or a retried `close()` must not double-lock or double-pay. Both are keyed (`idempotencyKey` on `lock()`; a deterministic `staking-yield:${positionId}` key on `close()`'s `credit()` call) and tested.

This package does not authenticate callers — it assumes whatever calls `lock()`/`close()` has already verified the holder's identity and authority to act for that `holderId`. It also does not prevent a holder from spending a locked balance through a channel that doesn't check `available()` — see `ARCHITECTURE.md`'s "Earmarking, not custody" for why, and what that means for your integration.

## Known, deliberate limitations

- **`InMemoryBalanceProvider` is not production custody.** It is a reference implementation for tests and demos, explicitly documented as such. A production `BalanceProvider` needs its own security review, matched to whatever it actually holds — this package cannot review a balance store it doesn't implement.
- **No on-chain settlement.** This package makes no claim about, and provides no protection for, an on-chain contract you might build later against the same published terms.
- **Time comes from an injectable `now()`, not from a trusted clock source.** `StillLockedError` is checked against whatever `now()` your `StakingService` instance was constructed with. If your integration lets an untrusted party influence what your server considers "now," that is a bug in your integration, not in this package — supply a real, trusted clock.
