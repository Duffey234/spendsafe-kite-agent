/** Shared types for SpendSafe Kite Agent. */

export type Mode = 'simulated' | 'live-free' | 'live-paid';

export interface PassportIdentity {
  /** Labelled simulated or live Passport agent id */
  agentId: string;
  ownerEmail: string;
  mode: Mode;
  /** Human-readable note: "SIMULATED — not a real Kite Passport id" etc. */
  label: string;
  createdAt: string;
}

export interface SpendingSession {
  sessionId: string;
  agentId: string;
  /** Max atomic USDC (6 decimals) per single payment */
  maxAmountPerTxAtomic: bigint;
  /** Max total atomic USDC for the session */
  maxTotalAmountAtomic: bigint;
  spentAtomic: bigint;
  /** ISO expiry */
  expiresAt: string;
  assets: string[];
  paymentApproach: 'x402_http';
  status: 'active' | 'exhausted' | 'expired' | 'revoked';
  mode: Mode;
  label: string;
}

export interface SpendProposal {
  payTo: string;
  amountAtomic: bigint;
  amountUsdc: string;
  resource: string;
  reason: string;
  network: 'base-sepolia' | 'base' | 'kite-simulated';
}

export interface ServDecision {
  action: 'approve' | 'refuse' | 'reduce';
  explanation: string;
  /** If reduce, suggested atomic amount */
  suggestedAmountAtomic?: bigint;
  source: 'serv-live' | 'serv-mock';
  model?: string;
}

export interface PayGuardResult {
  address: string;
  sanctioned: boolean;
  matchCount: number;
  source: 'payguard-live-preview' | 'payguard-mock';
  detail?: string;
}

export interface GuardVerdict {
  ok: boolean;
  reasons: string[];
  payguard?: PayGuardResult;
  session?: SpendingSession;
  decision?: ServDecision;
}

export interface PaymentReceipt {
  success: boolean;
  simulated: boolean;
  transaction: string;
  network: string;
  amountAtomic: string;
  payTo: string;
  resource: string;
  settledAt: string;
  settleCheck?: { status: string; note: string };
}
