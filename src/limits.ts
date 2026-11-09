import type { SpendingSession, SpendProposal } from './types.js';

const USDC_DECIMALS = 6n;
const SCALE = 10n ** USDC_DECIMALS;

/** "0.01" → 10000n atomic */
export function toAtomicUsdc(price: string): bigint {
  const p = price.trim().replace(/^\$/, '');
  const m = /^(\d+)(?:\.(\d{1,6}))?$/.exec(p);
  if (!m) throw new RangeError(`bad USDC amount: ${price}`);
  const atomic = BigInt(m[1]!) * SCALE + BigInt((m[2] ?? '').padEnd(6, '0'));
  if (atomic <= 0n) throw new RangeError('amount must be > 0');
  return atomic;
}

export function fromAtomicUsdc(atomic: bigint): string {
  const whole = atomic / SCALE;
  const frac = (atomic % SCALE).toString().padStart(6, '0').replace(/0+$/, '');
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function createSession(opts: {
  agentId: string;
  maxPerTxUsdc: string;
  maxTotalUsdc: string;
  ttlSeconds: number;
  mode?: SpendingSession['mode'];
}): SpendingSession {
  if (opts.ttlSeconds <= 0) throw new RangeError('ttlSeconds must be > 0');
  const maxAmountPerTxAtomic = toAtomicUsdc(opts.maxPerTxUsdc);
  const maxTotalAmountAtomic = toAtomicUsdc(opts.maxTotalUsdc);
  if (maxAmountPerTxAtomic > maxTotalAmountAtomic) {
    throw new RangeError('maxPerTx cannot exceed maxTotal');
  }
  const now = Date.now();
  const mode = opts.mode ?? 'simulated';
  return {
    sessionId: `sess_${mode}_${now.toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    agentId: opts.agentId,
    maxAmountPerTxAtomic,
    maxTotalAmountAtomic,
    spentAtomic: 0n,
    expiresAt: new Date(now + opts.ttlSeconds * 1000).toISOString(),
    assets: ['USDC'],
    paymentApproach: 'x402_http',
    status: 'active',
    mode,
    label:
      mode === 'simulated'
        ? 'SIMULATED spending session — not a live Kite Passport approval'
        : 'Live-mode session envelope (still $0 path unless explicitly funded)',
  };
}

export function refreshSessionStatus(s: SpendingSession, now = Date.now()): SpendingSession {
  const next = { ...s };
  if (Date.parse(next.expiresAt) <= now) next.status = 'expired';
  else if (next.spentAtomic >= next.maxTotalAmountAtomic) next.status = 'exhausted';
  else if (next.status !== 'revoked') next.status = 'active';
  return next;
}

/** Hard code limits — model cannot override these. */
export function checkLimits(session: SpendingSession, proposal: SpendProposal, now = Date.now()): string[] {
  const s = refreshSessionStatus(session, now);
  const reasons: string[] = [];
  if (s.status === 'revoked') reasons.push('session revoked');
  if (s.status === 'expired' || Date.parse(s.expiresAt) <= now) reasons.push('session expired (TTL)');
  if (s.status === 'exhausted') reasons.push('session budget exhausted');
  if (proposal.amountAtomic <= 0n) reasons.push('amount must be > 0');
  if (proposal.amountAtomic > s.maxAmountPerTxAtomic) {
    reasons.push(
      `per-tx limit exceeded: ${fromAtomicUsdc(proposal.amountAtomic)} > ${fromAtomicUsdc(s.maxAmountPerTxAtomic)} USDC`,
    );
  }
  if (s.spentAtomic + proposal.amountAtomic > s.maxTotalAmountAtomic) {
    reasons.push(
      `session total exceeded: spent ${fromAtomicUsdc(s.spentAtomic)} + ${fromAtomicUsdc(proposal.amountAtomic)} > ${fromAtomicUsdc(s.maxTotalAmountAtomic)} USDC`,
    );
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(proposal.payTo)) reasons.push('payTo must be a 0x EVM address');
  return reasons;
}

export function recordSpend(session: SpendingSession, amountAtomic: bigint): SpendingSession {
  const next = { ...session, spentAtomic: session.spentAtomic + amountAtomic };
  return refreshSessionStatus(next);
}
