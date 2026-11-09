import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkLimits,
  createSession,
  fromAtomicUsdc,
  recordSpend,
  toAtomicUsdc,
} from '../src/limits.js';
import type { SpendProposal } from '../src/types.js';

function proposal(amountUsdc: string, payTo = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'): SpendProposal {
  const amountAtomic = toAtomicUsdc(amountUsdc);
  return {
    payTo,
    amountAtomic,
    amountUsdc: fromAtomicUsdc(amountAtomic),
    resource: 'https://example.com/paid',
    reason: 'test',
    network: 'kite-simulated',
  };
}

describe('limits', () => {
  it('converts USDC strings to atomic', () => {
    assert.equal(toAtomicUsdc('0.001'), 1000n);
    assert.equal(toAtomicUsdc('1'), 1_000_000n);
    assert.equal(fromAtomicUsdc(1000n), '0.001');
  });

  it('creates a labelled simulated session', () => {
    const s = createSession({
      agentId: 'kite-sim-agent-test',
      maxPerTxUsdc: '0.01',
      maxTotalUsdc: '0.05',
      ttlSeconds: 60,
    });
    assert.equal(s.mode, 'simulated');
    assert.match(s.label, /SIMULATED/);
    assert.equal(s.maxAmountPerTxAtomic, 10_000n);
    assert.equal(s.status, 'active');
  });

  it('refuses over per-tx', () => {
    const s = createSession({
      agentId: 'a',
      maxPerTxUsdc: '0.01',
      maxTotalUsdc: '0.05',
      ttlSeconds: 60,
    });
    const reasons = checkLimits(s, proposal('0.02'));
    assert.ok(reasons.some((r) => r.includes('per-tx')));
  });

  it('refuses over total after spends', () => {
    let s = createSession({
      agentId: 'a',
      maxPerTxUsdc: '0.01',
      maxTotalUsdc: '0.015',
      ttlSeconds: 60,
    });
    s = recordSpend(s, toAtomicUsdc('0.01'));
    const reasons = checkLimits(s, proposal('0.01'));
    assert.ok(reasons.some((r) => r.includes('session total') || r.includes('exhausted')));
  });

  it('refuses expired TTL', () => {
    const s = createSession({
      agentId: 'a',
      maxPerTxUsdc: '0.01',
      maxTotalUsdc: '0.05',
      ttlSeconds: 1,
    });
    const reasons = checkLimits(s, proposal('0.001'), Date.now() + 2000);
    assert.ok(reasons.some((r) => r.includes('expired')));
  });

  it('refuses bad payTo', () => {
    const s = createSession({
      agentId: 'a',
      maxPerTxUsdc: '0.01',
      maxTotalUsdc: '0.05',
      ttlSeconds: 60,
    });
    const reasons = checkLimits(s, proposal('0.001', 'not-an-address'));
    assert.ok(reasons.some((r) => r.includes('payTo')));
  });
});
