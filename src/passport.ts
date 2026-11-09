import { createHash, randomBytes } from 'node:crypto';
import type { Mode, PassportIdentity } from './types.js';

/**
 * Kite Passport–style agent identity.
 * Default mode is SIMULATED (no kpass CLI / no real passkey / $0).
 * Live registration would use `kpass agent:register` per docs.gokite.ai.
 */
export function registerAgent(opts: {
  ownerEmail?: string;
  type?: string;
  mode?: Mode;
}): PassportIdentity {
  const mode = opts.mode ?? 'simulated';
  const ownerEmail = opts.ownerEmail ?? 'hello@youraitools.co';
  const type = opts.type ?? 'spending-guard-agent';
  const seed = randomBytes(16).toString('hex');
  const digest = createHash('sha256').update(`${ownerEmail}:${type}:${seed}`).digest('hex').slice(0, 24);
  const agentId =
    mode === 'simulated' ? `kite-sim-agent-${digest}` : `kite-agent-${digest}`;
  return {
    agentId,
    ownerEmail,
    mode,
    label:
      mode === 'simulated'
        ? 'SIMULATED Kite Passport agent id — not registered on live Passport; for hackathon demo / tests'
        : 'Live Passport agent id (requires kpass + passkey; not used on $0 path)',
    createdAt: new Date().toISOString(),
  };
}

export function assertSimulated(identity: PassportIdentity): void {
  if (identity.mode !== 'simulated' && process.env.ALLOW_LIVE_PASSPORT !== '1') {
    throw new Error('Live Passport mode blocked ($0 path). Set ALLOW_LIVE_PASSPORT=1 only with CMM OK.');
  }
}
