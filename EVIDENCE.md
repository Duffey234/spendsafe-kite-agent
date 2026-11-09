# SERV Hackathon 02 — Phase A evidence (2026-11-09)

## Official sources (quoted)

### Hackathon page — https://www.openserv.ai/hackathon-2
- Dates: Edition 02 · ONLINE · 2–15 November 2026; submissions close Nov 15 **23:59 UTC**.
- Pool: **$5,000** total; per-track split still TBA (`track_winner × 2`, `best_overall_build`, `special_mention`).
- Every track must use **SERV Reasoning**.
- Kite track: "Build agents with a **verifiable identity** and **spending limits** you control, so it can shop, book, and pay on your behalf, safely." Links: https://docs.gokite.ai/passport
- Priority repos: kite-x402-explorer, kite-x402-hono, kite-x402-axum, kite_counter_dapp.
- Submit: "**public repo**, a demo and a short write-up" + SERV Reasoning in the build.
- Winners: "Announced on X and here; **prizes paid out after verification**."
- Cost: "Registration is free. Pre-registered participants receive **$5 in SERV credits**."
- Account: "You’ll need an OpenServ account and API key to build with SERV Reasoning."
- Help: X @openservai; Telegram; Discord https://discord.com/invite/9u724WsWCU
- Submit form: https://openserv.typeform.com/submissions02

### Typeform (public form JSON id `cj6ydMrb`, alias submissions02)
- Title: "Hackathon Edition 02 — Submit Your Project"; `isFormClosed: false` (checked 2026-11-09).
- Fields include: full name, email, new-to-OpenServ?, **track** (Dolphin / **Kite** / Reppo / Open Track), new vs existing project, project name, write-up, **project URL** ("demo, website, or GitHub repository"), **X post URL** (tag @openservai), optional extra URL, logo upload, data-collection enabled?, team (solo / have team / looking), AI-agent experience, country, company/school, role, LinkedIn/GitHub/website, SERV feedback, quote permission, updates opt-in.
- Project URL wording names GitHub as an **example**, not a hard requirement. No "GitHub only" language found.

### Ed01 FAQ (eligibility precedent) — https://www.openserv.ai/hackathon
- "Who is eligible? **Everyone.** Solo builders and teams…"
- "To be eligible, you must enable data collection at console.openserv.ai/settings/organization."
- Ed01 prizes: $4k SERV + $1k USDC (track $1k SERV; best overall +$1k USDC). Ed02 currency/split still TBA.

### SERV signup / API — docs.openserv.ai
- Account: https://docs.openserv.ai/serv-reasoning/tutorials/account — open **SERV console** (https://console.openserv.ai), Sign up, **email+password or Continue with Google**, verify email, accept legal docs, org created/selected.
- API key: https://docs.openserv.ai/serv-reasoning/tutorials/credits-and-api-keys — `/settings/keys` → Create secret key → `export SERV_API_KEY=…` (shown once). Billing `/settings/billing` buys more credits (card) — **out of scope / $0**.
- Inference: https://docs.openserv.ai/serv-reasoning/introduction — base `https://inference-api.openserv.ai/v1` (OpenAI SDK), system prompt required on every request.

### Kite Passport — docs.gokite.ai
- https://docs.gokite.ai/passport — passkey-approved spending sessions; agent pays for x402 catalog APIs + wallet sends within limits.
- https://docs.gokite.ai/passport/payments — fund USDC.e on Kite; session create with max-per-tx / max-total / ttl / assets; `kpass session execute` pays x402.
- https://docs.gokite.ai/passport/payments/allowance — allowance vs session; sessions for hard per-payment cap + end date.
- https://docs.gokite.ai/passport/payments/funding — USDC.e on Kite; card / direct deposit / bridge. Card on-ramps (Banxa/Zero Hash on agentpassport.ai quickstart) **require KYC** — avoid for $0 path; crypto deposit is the non-card path.
- Agent identity: register agent via `kpass agent:register`; sessions use `--payment-approach x402_http` (CLI reference).

## What was NOT found in public sources
- No explicit **prize-payout KYC / government ID** requirement for Ed02 (only "after verification").
- No explicit "GitHub mandatory" or "Bitbucket forbidden" for Ed02.
- No published Ed02 prize currency/split beyond $5k total TBA.
- Terms/Privacy URLs on openserv.ai returned 404 to curl (2026-11-09); legal links may live under console onboarding.
