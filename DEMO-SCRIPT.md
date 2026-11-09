# Demo script (60–120s, under 3 min) — SpendSafe Kite Agent

Record with the paced demo: `npm run demo` (requires `SERV_API_KEY` for live SERV).

## Beat sheet

| t | Beat | Show |
|---|---|---|
| 0:00–0:15 | Problem | Agents that pay need hard caps, not prompt hopes. |
| 0:15–0:35 | Session | Simulated Passport-style session: per-tx / total / TTL labels. |
| 0:35–1:00 | SERV live approve | Clean payee, 0.001 USDC proposal. `source: serv-live`. |
| 1:00–1:25 | PayGuard | Live OFAC preview on clean + SDN sample. |
| 1:25–1:45 | Refuse | SDN sanctioned → no receipt. Over-limit → refuse. |
| 1:45–2:15 | Live x402 + settle | Show LIVE-PROOF Basescan tx (0.005 USDC Settlement Check). |
| 2:15–2:30 | Close | Passport passkey still human; repo + write-up. |

## Record

```bash
export SERV_API_KEY=...          # from your secret store — do not commit
export SERV_MODEL=gpt-6-luna
npm run demo
# asciinema / ffmpeg capture → demo/spendsafe-demo.mp4
```

Thumbnails: `ffmpeg -i demo/spendsafe-demo.mp4 -vf fps=1/20 demo/thumb-%02d.png`
