# Live proof (2026-11-09, America/New_York)

Hard cap for live spend: **$1.00** total · per payment **≤ $0.10**. No card / no KYC on-ramp / no SERV credit purchase.

## Live today

| Piece | Status | Evidence |
|---|---|---|
| SERV Reasoning decide | **Live** | OpenAI-compatible `inference-api.openserv.ai` with `SERV_API_KEY` (cheapest model `gpt-6-luna`) |
| PayGuard OFAC preview | **Live** | Free `GET /payguard/v1/preview` |
| x402 payment + Settlement Check | **Live** | Worker settle-check paid allowlisted `x402fix-lite` for **0.005 USDC** on Base |

### Settlement Check / x402 receipt

- **ref:** `SERV4248089`
- **amount:** 0.005 USDC (5000 atomic)
- **payer:** `0xE35E10429048b6F3409b0307E65e4797477Ed144` (existing capped settle-check test payer)
- **payTo:** `0x3c1A1E01e790Cd326495631B3b38Bd7068F08d6F`
- **network:** `eip155:8453` (Base)
- **tx:** [`0x7da2e7c99f8ef9e589e75adbf84f511b3e8e4816772c3a3225990890a857552d`](https://basescan.org/tx/0x7da2e7c99f8ef9e589e75adbf84f511b3e8e4816772c3a3225990890a857552d)
- **resource:** `https://api.youraitools.co/x402fix/v1/lite?url=https://api.youraitools.co/toolfit/v1/lite`
- Raw report: `demo/settle-check-live.json`

**Total real USDC spent this session:** **$0.005**

## Still simulated (and why)

| Piece | Why |
|---|---|
| Kite Passport identity + spending session | Signup started for `hello@youraitools.co`; **human passkey approval** on the Passport dashboard is required before agent register / session create / `session execute`. No Banxa/card funding. |
| In-process `executeX402Payment` helper | Demo CLI still labels programmatic pays as simulated unless wired to Passport `session execute` after passkey. The **live** on-chain pay above is the Settlement Check runner. |

## Passport — human step (stop here)

1. Check inbox for **Kite / Passport** mail to `hello@youraitools.co` (verification link + 8-char code). Signup id: `signup_01a1c183-b27c-72a3-a48f-f9c15a29f501`.
2. Open the verification link → dashboard (**https://agentpassport.ai** / link in email).
3. **Create a passkey** when prompted (Touch ID / Face ID / Windows Hello / hardware key).
4. Exchange: `KPASS_SIGNUP_CODE=<CODE> kpass signup exchange --signup-id signup_01a1c183-b27c-72a3-a48f-f9c15a29f501 --output json`
5. Then register agent + `kpass agent:session create ...` → open the **approval URL** it returns → approve with passkey.
6. Fund via **crypto deposit only** (no card) if a Passport-paid catalog call is needed later.
