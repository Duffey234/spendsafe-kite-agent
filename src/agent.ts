/**
 * SpendSafe Kite Agent orchestration.
 * Flow: Passport identity → spending session → SERV propose/decide →
 *       code limits → PayGuard → (simulated) x402 pay → Settlement Check receipt.
 * Model proposes; code + session decide. Fail closed.
 */
import { registerAgent, assertSimulated } from './passport.js';
import { checkLimits, createSession, fromAtomicUsdc, recordSpend, toAtomicUsdc } from './limits.js';
import { decideSpend } from './serv.js';
import { screenPayee } from './payguard.js';
import { executeX402Payment } from './x402-pay.js';
import { attachSettleCheck } from './settle-check.js';
import type {
  GuardVerdict,
  PassportIdentity,
  PaymentReceipt,
  SpendProposal,
  SpendingSession,
} from './types.js';

export interface AgentState {
  identity: PassportIdentity;
  session: SpendingSession;
}

export function bootAgent(opts?: {
  maxPerTxUsdc?: string;
  maxTotalUsdc?: string;
  ttlSeconds?: number;
}): AgentState {
  const identity = registerAgent({ ownerEmail: 'hello@youraitools.co', mode: 'simulated' });
  assertSimulated(identity);
  const session = createSession({
    agentId: identity.agentId,
    maxPerTxUsdc: opts?.maxPerTxUsdc ?? '0.01',
    maxTotalUsdc: opts?.maxTotalUsdc ?? '0.05',
    ttlSeconds: opts?.ttlSeconds ?? 3600,
    mode: 'simulated',
  });
  return { identity, session };
}

export function makeProposal(opts: {
  payTo: string;
  amountUsdc: string;
  resource: string;
  reason: string;
  network?: SpendProposal['network'];
}): SpendProposal {
  const amountAtomic = toAtomicUsdc(opts.amountUsdc);
  return {
    payTo: opts.payTo,
    amountAtomic,
    amountUsdc: fromAtomicUsdc(amountAtomic),
    resource: opts.resource,
    reason: opts.reason,
    network: opts.network ?? 'kite-simulated',
  };
}

export async function evaluateProposal(
  state: AgentState,
  proposal: SpendProposal,
  opts?: { forceMockServ?: boolean; forceMockPayguard?: boolean; failClosedOnPayguardError?: boolean },
): Promise<GuardVerdict> {
  const reasons: string[] = [];
  const limitReasons = checkLimits(state.session, proposal);
  reasons.push(...limitReasons);

  const decision = await decideSpend(proposal, state.session, { forceMock: opts?.forceMockServ });
  if (decision.action === 'refuse') reasons.push(`SERV refuse: ${decision.explanation}`);
  if (decision.action === 'reduce') {
    reasons.push(`SERV reduce: ${decision.explanation}`);
  }

  const payguard = await screenPayee(proposal.payTo, { forceMock: opts?.forceMockPayguard });
  if (payguard.sanctioned) reasons.push(`PayGuard sanctioned (${payguard.matchCount} match)`);
  if (
    opts?.failClosedOnPayguardError &&
    payguard.source === 'payguard-mock' &&
    payguard.detail?.includes('error')
  ) {
    reasons.push(`PayGuard transport error (fail-closed): ${payguard.detail}`);
  }

  // SERV reduce alone is not a hard block if limits still pass after reduce —
  // but we treat refuse + limit + sanctioned as blockers for ok=false.
  const hard = [
    ...limitReasons,
    ...(decision.action === 'refuse' ? [`SERV refuse`] : []),
    ...(payguard.sanctioned ? ['PayGuard sanctioned'] : []),
  ];

  return {
    ok: hard.length === 0 && decision.action !== 'refuse',
    reasons,
    payguard,
    session: state.session,
    decision,
  };
}

export async function runSpend(
  state: AgentState,
  proposal: SpendProposal,
  opts?: { forceMockServ?: boolean; probeSettlePreview?: boolean },
): Promise<{
  verdict: GuardVerdict;
  receipt?: PaymentReceipt;
  state: AgentState;
}> {
  const verdict = await evaluateProposal(state, proposal, {
    forceMockServ: opts?.forceMockServ,
  });

  if (!verdict.ok) {
    return { verdict, state };
  }

  // If SERV suggested reduce, apply it before pay.
  let finalProposal = proposal;
  if (
    verdict.decision?.action === 'reduce' &&
    verdict.decision.suggestedAmountAtomic &&
    verdict.decision.suggestedAmountAtomic > 0n &&
    verdict.decision.suggestedAmountAtomic < proposal.amountAtomic
  ) {
    finalProposal = {
      ...proposal,
      amountAtomic: verdict.decision.suggestedAmountAtomic,
      amountUsdc: fromAtomicUsdc(verdict.decision.suggestedAmountAtomic),
      reason: `${proposal.reason} (reduced by SERV)`,
    };
    const again = checkLimits(state.session, finalProposal);
    if (again.length) {
      return {
        verdict: { ...verdict, ok: false, reasons: [...verdict.reasons, ...again] },
        state,
      };
    }
  }

  const receipt = await executeX402Payment(finalProposal);
  const settle = await attachSettleCheck(finalProposal.resource, {
    probePreview: opts?.probeSettlePreview,
  });
  receipt.settleCheck = { status: settle.status, note: settle.note };

  const nextSession = recordSpend(state.session, finalProposal.amountAtomic);
  return {
    verdict,
    receipt,
    state: { ...state, session: nextSession },
  };
}

export function publicSummary(state: AgentState) {
  return {
    agentId: state.identity.agentId,
    identityLabel: state.identity.label,
    sessionId: state.session.sessionId,
    sessionLabel: state.session.label,
    maxPerTxUsdc: fromAtomicUsdc(state.session.maxAmountPerTxAtomic),
    maxTotalUsdc: fromAtomicUsdc(state.session.maxTotalAmountAtomic),
    spentUsdc: fromAtomicUsdc(state.session.spentAtomic),
    expiresAt: state.session.expiresAt,
    status: state.session.status,
    mode: state.session.mode,
  };
}
