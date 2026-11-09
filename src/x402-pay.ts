/**
 * x402 payment step — SIMULATED on the $0 path.
 * A live path would use Passport session execute / @x402/fetch with a funded wallet.
 * Every receipt is labelled simulated unless ALLOW_LIVE_X402=1 (blocked by default).
 */
import { createHash, randomBytes } from 'node:crypto';
import type { PaymentReceipt, SpendProposal } from './types.js';

export async function executeX402Payment(
  proposal: SpendProposal,
  opts?: { simulate?: boolean },
): Promise<PaymentReceipt> {
  const simulate = opts?.simulate ?? process.env.ALLOW_LIVE_X402 !== '1';
  if (!simulate) {
    throw new Error('Live x402 blocked on $0 path. Keep ALLOW_LIVE_X402 unset.');
  }

  const seed = randomBytes(16).toString('hex');
  const tx = '0xsim' + createHash('sha256').update(`${proposal.payTo}:${proposal.amountAtomic}:${seed}`).digest('hex').slice(0, 60);

  return {
    success: true,
    simulated: true,
    transaction: tx,
    network: proposal.network,
    amountAtomic: proposal.amountAtomic.toString(),
    payTo: proposal.payTo,
    resource: proposal.resource,
    settledAt: new Date().toISOString(),
    settleCheck: {
      status: 'simulated-pass',
      note: 'SIMULATED settlement — no on-chain USDC moved. Mirrors Settlement Check receipt shape for demo.',
    },
  };
}
