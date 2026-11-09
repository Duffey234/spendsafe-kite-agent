/**
 * Paced CLI demo (60–120s of narration when recorded with real-time pauses).
 * Requires SERV_API_KEY in the environment for live SERV. Tests stay on mock.
 */
import { readFile } from 'node:fs/promises';
import { bootAgent, makeProposal, publicSummary, runSpend } from '../src/agent.js';
import { CLEAN_SAMPLE, SDN_SAMPLE, screenPayee } from '../src/payguard.js';
import { loadServApiKeyAsync } from '../src/serv.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hr(title: string) {
  console.log('\n' + '═'.repeat(72));
  console.log(title);
  console.log('═'.repeat(72));
}

function dump(label: string, obj: unknown) {
  console.log(`\n▸ ${label}`);
  console.log(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2));
}

async function main() {
  console.log('SpendSafe Kite Agent — SERV Hackathon 02 (Kite track)');
  console.log('Paced demo. Watch live vs simulated labels carefully.\n');
  await sleep(2000);

  const key = await loadServApiKeyAsync();
  if (!key) {
    console.log('ERROR: SERV_API_KEY is not set. Export it for a live demo recording.');
    process.exit(2);
  }
  console.log('SERV_API_KEY: present → live decide calls enabled (cheapest model gpt-6-luna)');
  await sleep(1500);

  hr('1/5  Session envelope (Passport-style — SIMULATED identity until passkey)');
  let state = bootAgent({ maxPerTxUsdc: '0.01', maxTotalUsdc: '0.05', ttlSeconds: 1800 });
  dump('session', publicSummary(state));
  console.log('\nNote: Kite Passport signup prepared; human passkey approval still required.');
  await sleep(8000);

  hr('2/5  SERV Reasoning LIVE — approve a clean in-limit proposal');
  const good = makeProposal({
    payTo: CLEAN_SAMPLE,
    amountUsdc: '0.001',
    resource: 'https://api.youraitools.co/payguard/v1/preview',
    reason: 'Pre-screen USDC contract via PayGuard before a catalog buy',
  });
  dump('proposal', good);
  await sleep(2000);
  let out = await runSpend(state, good); // live SERV
  state = out.state;
  dump('verdict.decision', out.verdict.decision);
  dump('verdict.payguard', out.verdict.payguard);
  dump('receipt (local helper = simulated)', out.receipt);
  if (out.verdict.decision?.source !== 'serv-live') {
    console.log('\nWARN: expected serv-live; got', out.verdict.decision?.source);
  } else {
    console.log('\nOK: SERV source = serv-live');
  }
  await sleep(10000);

  hr('3/5  PayGuard LIVE preview — clean vs SDN sample');
  const cleanPg = await screenPayee(CLEAN_SAMPLE);
  const sdnPg = await screenPayee(SDN_SAMPLE);
  dump('PayGuard clean', cleanPg);
  dump('PayGuard SDN sample', sdnPg);
  await sleep(8000);

  hr('4/5  Fail-closed refuses (SDN + over-limit)');
  const bad = makeProposal({
    payTo: SDN_SAMPLE,
    amountUsdc: '0.001',
    resource: 'https://example.com/paid',
    reason: 'Pay SDN sample — must refuse',
  });
  out = await runSpend(state, bad, { forceMockServ: true }); // save SERV credits; PayGuard is the gate
  dump('SDN refuse', { ok: out.verdict.ok, reasons: out.verdict.reasons, payguard: out.verdict.payguard, receipt: out.receipt ?? null });
  await sleep(4000);
  const huge = makeProposal({
    payTo: CLEAN_SAMPLE,
    amountUsdc: '1.00',
    resource: 'https://example.com/paid',
    reason: 'Far above caps',
  });
  out = await runSpend(state, huge, { forceMockServ: true });
  dump('Over-limit refuse', { ok: out.verdict.ok, reasons: out.verdict.reasons, receipt: out.receipt ?? null });
  await sleep(8000);

  hr('5/5  LIVE on-chain x402 + Settlement Check (Base USDC 0.005)');
  try {
    const proof = JSON.parse(await readFile(new URL('../demo/settle-check-live.json', import.meta.url), 'utf8'));
    dump('live Settlement Check', {
      status: proof.status,
      amount_usdc: proof.amount_usdc,
      payer: proof.payer,
      payTo: proof.payTo,
      transaction: proof.settle?.transaction,
      basescan_tx: proof.basescan_tx,
      ref: proof.ref,
    });
    console.log('\nBasescan:', proof.basescan_tx);
  } catch {
    console.log('settle-check-live.json missing — see LIVE-PROOF.md');
  }
  await sleep(8000);

  hr('Done');
  console.log('Live: SERV decide · PayGuard preview · Base x402+Settlement Check ($0.005)');
  console.log('Pending human: Kite Passport passkey → session execute');
  console.log('Local executeX402Payment helper: simulated (labelled on receipt)');
  console.log('Track: Kite · SERV Hackathon 02');
  await sleep(2000);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
