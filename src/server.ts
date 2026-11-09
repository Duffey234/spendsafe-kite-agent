/**
 * Tiny read-only HTTP surface for local demo.
 * No secrets. No live payments.
 */
import { createServer } from 'node:http';
import { bootAgent, makeProposal, publicSummary, runSpend } from './agent.js';
import { CLEAN_SAMPLE, SDN_SAMPLE } from './payguard.js';

const PORT = Number(process.env.PORT ?? 8787);

let state = bootAgent({ maxPerTxUsdc: '0.01', maxTotalUsdc: '0.05', ttlSeconds: 3600 });

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  res.setHeader('content-type', 'application/json; charset=utf-8');

  if (url.pathname === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'spendsafe-kite-agent', mode: 'simulated' }));
    return;
  }

  if (url.pathname === '/session') {
    res.end(JSON.stringify(publicSummary(state), null, 2));
    return;
  }

  if (url.pathname === '/demo/approve' && req.method === 'POST') {
    const proposal = makeProposal({
      payTo: CLEAN_SAMPLE,
      amountUsdc: '0.001',
      resource: 'https://api.youraitools.co/payguard/v1/preview',
      reason: 'Screen a clean USDC contract address before a catalog buy',
    });
    const out = await runSpend(state, proposal, { forceMockServ: true });
    state = out.state;
    res.end(JSON.stringify({ summary: publicSummary(state), verdict: serialize(out.verdict), receipt: out.receipt }, null, 2));
    return;
  }

  if (url.pathname === '/demo/refuse-sanctioned' && req.method === 'POST') {
    const proposal = makeProposal({
      payTo: SDN_SAMPLE,
      amountUsdc: '0.001',
      resource: 'https://example.com/paid',
      reason: 'Attempted pay to known SDN sample (should refuse)',
    });
    const out = await runSpend(state, proposal, { forceMockServ: true });
    state = out.state;
    res.end(JSON.stringify({ summary: publicSummary(state), verdict: serialize(out.verdict), receipt: out.receipt }, null, 2));
    return;
  }

  if (url.pathname === '/demo/refuse-overlimit' && req.method === 'POST') {
    const proposal = makeProposal({
      payTo: CLEAN_SAMPLE,
      amountUsdc: '1.00',
      resource: 'https://example.com/paid',
      reason: 'Way over per-tx cap (should refuse)',
    });
    const out = await runSpend(state, proposal, { forceMockServ: true });
    state = out.state;
    res.end(JSON.stringify({ summary: publicSummary(state), verdict: serialize(out.verdict), receipt: out.receipt }, null, 2));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not_found', paths: ['/health', '/session', 'POST /demo/approve', 'POST /demo/refuse-sanctioned', 'POST /demo/refuse-overlimit'] }));
});

function serialize(v: unknown): unknown {
  return JSON.parse(
    JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? val.toString() : val)),
  );
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`SpendSafe Kite Agent listening on http://127.0.0.1:${PORT} (simulated)`);
});
