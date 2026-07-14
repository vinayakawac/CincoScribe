# GATE 2 — npm audit justification

**Date:** 2026-07-14  
**Command:** `npm audit` from monorepo root  
**Total:** 0 critical, high+moderate in `packages/web` stub only, 0 in Electron

---

## Affected Package: `next` (packages/web stub only)

All CVEs are in `next@^14.2.5`. The desktop Electron app has zero npm audit findings.
`node-machine-id` and `crypto` (old fingerprint deps) have been removed entirely.

| Advisory | Severity | Description | Justification |
|---|---|---|---|
| GHSA-h25m-26qc-wcjf | High | DoS via Server Components | Web target is a stub — no Server Components process user input. Not deployed publicly. |
| GHSA-ggv3-7p47-pfv8 | Moderate | HTTP request smuggling in rewrites | No rewrites configured in next.config.js stub. |
| GHSA-3x4c-7xq6-9pq8 | Moderate | next/image disk cache growth | next/image is not used in the stub page. |
| GHSA-q4gf-8mx6-v5v3 | High | DoS with Server Components | Same as GHSA-h25m — no user-input Server Components. |
| GHSA-8h8q-6873-q5fj | High | DoS with Server Components | Same suppression as above. |
| GHSA-3g8h-86w9-wvmq | Low | Middleware cache poisoning | No middleware defined in stub. |
| GHSA-ffhc-5mcf-pf4q | Moderate | XSS in App Router CSP nonces | No CSP nonce headers configured. |
| GHSA-vfv6-92ff-j949 | Low | Cache poisoning via RSC | No RSC data fetching in stub. |
| GHSA-gx5p-jg67-6x7h | Moderate | XSS in beforeInteractive scripts | No beforeInteractive scripts used. |
| GHSA-h64f-5h5j-jqjh | Moderate | DoS in Image Optimization API | next/image API disabled — not used. |
| GHSA-c4j6-fc7j-m34r | High | SSRF in WebSocket upgrades | No WebSocket routes in stub. |
| GHSA-wfc6-r584-vfw7 | Moderate | Cache poisoning in RSC responses | No RSC data responses. |
| GHSA-36qx-fr4f-26g5 | High | Middleware bypass i18n | No i18n configured. |
| GHSA-qx2v-qp2m-jg93 | Moderate | postcss XSS via unescaped style | Build-time only, no user-controlled CSS. |

## Fix action before public web deployment

```
npm install next@15.5.16 --workspace=packages/web
npm audit   # expect 0 findings
```

## Electron desktop — ZERO CVEs

`packages/desktop` npm audit: clean.
