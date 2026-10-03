# Next four deployment phases: current evidence

## Historical report — current reference updated 2026-10-03

The original findings, counts and pending lists below remain historical evidence.
Current code is `d81b281`, schema `20261003000004`; see
[project status](../PROJECT_STATUS.md) and [latest verification](WHATSAPP_ASSISTANT_2026_10_03.md).
Do not interpret older missing-feature lists as current or fixture passes as real
provider/browser certification. No historical test result was changed or rerun
by this documentation update.


These phases remain incomplete. Local code and unit tests do not prove an
external provider, public preview, installed customer agent or server operation.

| Phase | Available implementation | Completion requirement |
| --- | --- | --- |
| Repository/LLM flow | Durable queue, worker preflight, isolated clone, provider-backed structured changes, applicable checks, artifacts and approved PR shipping | Designated worker host, approved images, cloud model credential, authorized test repository; verify actual inference and GitHub results |
| Public preview | Signed grants, loopback gateway and isolated relay | Public app origin, preview domain, signing secret, wildcard DNS/TLS, proxy routing and browser access/expiry/isolation verification |
| Enrollment/telemetry | Short-lived enrollment, device signatures, ingestion and SSE | Published release manifest and checksummed agent binary, public control plane and authorized test host; verify real install, telemetry, revocation and UI |
| Server operations | Web API rejects unsupported actions; native telemetry now rejects command-bearing acknowledgements | Durable approval decisions, signed expiring commands, device binding, replay protection, narrowly allowed execution, signed receipts and recovery verification |

## Findings and changes

The native Go daemon previously dispatched firewall, service and container actions
from telemetry acknowledgements, without command signatures or persisted approval
references. The dispatcher now rejects every nonempty command list, even when
`success` is true. The daemon's acknowledgement-to-execution path is removed.
Ordinary telemetry acknowledgement remains supported. Native firewall/systemd/
container utilities are retained; this change removes their remote invocation
through this unapproved channel. Git history preserves the removed handler.

This closes an execution path; it does not implement remote operations. Never
re-enable it simply because transport TLS and telemetry signatures are working.

## Validation

- New acknowledgement cases reject service restarts, firewall changes and
  container restarts. Dispatcher tests passed with a TLS fixture.
- Go vet and Linux amd64 build passed.
- Full Windows Go test run did not pass: Windows Application Control blocked
  execution of `daemon.test.exe`. Other reported packages passed. This requires
  execution on an approved test host; no policy bypass was attempted.
- Runtime probe: verified database TLS and required schema objects; no missing
  migration entries. Cloud LLM credential and production preview/public URL/
  release/image/allowlist configuration remain missing in the inspected env.

To continue live verification, provide the designated worker host, application
and preview domains, authorized GitHub test repository and enrollment test host.
Place credentials in ignored environment files or the server secret store;
record only variable names and configuration locations in conversation/docs.
