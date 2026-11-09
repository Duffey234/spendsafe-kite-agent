# SpendSafe Kite Agent — SERV Hackathon 02 (Kite track)

Online hackathon by OpenServ · Nov 2–15, 2026 · deadline **Sun Nov 15 23:59 UTC** (6:59 PM ET)  
Track: **Kite** (verifiable identity + spending limits + x402) · must use **SERV Reasoning**  
Form: https://openserv.typeform.com/submissions02 · Page: https://www.openserv.ai/hackathon-2

> **Status:** ready for review. **Not submitted.** See [LIVE-PROOF.md](./LIVE-PROOF.md) for live tx hashes.

## One-liner

A SERV Reasoning agent with hard spending limits that proposes a paid x402 call, screens the payee with **PayGuard**, and only pays inside an approved envelope. **Model proposes; code + session decide. Fail closed.**

## What is live vs simulated

| Piece | Mode |
|---|---|
| SERV Reasoning decide | **Live** (when `SERV_API_KEY` is set) |
| PayGuard OFAC preview | **Live** (free tier) |
| x402 / Settlement Check | **Live Settlement Check worker payment (0.005 USDC)** ([Basescan](https://basescan.org/tx/0x7da2e7c99f8ef9e589e75adbf84f511b3e8e4816772c3a3225990890a857552d)); **local `executeX402Payment` = SIMULATED** |
| Kite Passport identity / session execute | **Prepared; waiting on human passkey** (see LIVE-PROOF.md) |
| Local CLI `executeX402Payment` helper | **Simulated** until Passport session execute is approved |

## Quick start

```bash
npm install
npm test                 # uses mock SERV
export SERV_API_KEY=...  # required for live decide / smoke
npm run smoke-serv
npm run demo             # paced CLI walkthrough
npm start                # http://127.0.0.1:8787
```

## Demo HTTP

- `GET /health` · `GET /session`
- `POST /demo/approve` · `POST /demo/refuse-sanctioned` · `POST /demo/refuse-overlimit`

## Architecture

```
Spending session (per-tx / total / TTL)
        │
        ▼
SERV Reasoning ──► approve | refuse | reduce
        │
        ▼
Code limits (fail closed) ──► PayGuard preview
        │
        ▼
x402 pay (live via Settlement Check proof; Passport session pending passkey)
```

## Reused building blocks

- PayGuard — https://api.youraitools.co/payguard  
- Settlement Check — https://api.youraitools.co/x402fix/v1/settle-check  
- x402 paid-agent patterns — https://agentgate-source.pages.dev/x402-paid-agent-starter/  
- Kite Passport docs — https://docs.gokite.ai/passport  

## Kit files

| File | Purpose |
|---|---|
| `WRITEUP.md` | Short project write-up |
| `DEMO-SCRIPT.md` | Recording script |
| `LIVE-PROOF.md` | Live tx hashes + passkey stop |
| `demo/spendsafe-demo.mp4` | Terminal demo video |

## Secrets

Set `SERV_API_KEY` in the environment. Never commit keys.

## License

MIT for new code in this entry. Upstream starters keep their licenses.
