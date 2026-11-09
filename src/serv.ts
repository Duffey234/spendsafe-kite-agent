/**
 * SERV Reasoning client (OpenAI-compatible).
 * Base: https://inference-api.openserv.ai/v1
 * Auth: SERV_API_KEY env var only (never hardcode vault paths in public code).
 * Falls back to a deterministic mock when the key is missing.
 */
import type { ServDecision, SpendProposal, SpendingSession } from './types.js';
import { fromAtomicUsdc, toAtomicUsdc } from './limits.js';

const SERV_BASE = process.env.SERV_BASE_URL ?? 'https://inference-api.openserv.ai/v1';
const SERV_MODEL = process.env.SERV_MODEL ?? 'gpt-6-luna';

export async function loadServApiKeyAsync(): Promise<string | null> {
  const k = process.env.SERV_API_KEY?.trim();
  return k || null;
}

const SYSTEM = `You are SpendSafe, a spending-guard advisor for a Kite Passport agent.
Decide whether a proposed x402 payment should be approved, refused, or reduced.
Reply with ONLY compact JSON: {"action":"approve"|"refuse"|"reduce","explanation":"...","suggestedAmountUsdc":"0.001"}
Rules: refuse sanctioned or over-limit spends; prefer the smallest useful amount; never invent chain facts.
explanation must be a short plain sentence that does NOT start with "Mock".`;

function mockDecide(proposal: SpendProposal, session: SpendingSession): ServDecision {
  const remaining = session.maxTotalAmountAtomic - session.spentAtomic;
  if (proposal.amountAtomic > session.maxAmountPerTxAtomic) {
    return {
      action: 'refuse',
      explanation: `Per-tx cap is ${fromAtomicUsdc(session.maxAmountPerTxAtomic)} USDC; proposal is ${proposal.amountUsdc}.`,
      source: 'serv-mock',
      model: 'mock',
    };
  }
  if (proposal.amountAtomic > remaining) {
    const suggested = remaining > 0n ? remaining : 0n;
    return {
      action: suggested > 0n ? 'reduce' : 'refuse',
      explanation: `Session remaining ${fromAtomicUsdc(remaining)} USDC; reduce or refuse.`,
      suggestedAmountAtomic: suggested > 0n ? suggested : undefined,
      source: 'serv-mock',
      model: 'mock',
    };
  }
  return {
    action: 'approve',
    explanation: `${proposal.reason} is within the session envelope (${proposal.amountUsdc} USDC).`,
    source: 'serv-mock',
    model: 'mock',
  };
}

function parseDecision(text: string, fallback: ServDecision): ServDecision {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) {
      return {
        ...fallback,
        explanation: `SERV live returned no JSON; using deterministic mock. Raw: ${text.slice(0, 80)}`,
        source: 'serv-mock',
        model: 'mock',
      };
    }
    const j = JSON.parse(text.slice(start, end + 1)) as {
      action?: string;
      explanation?: string;
      suggestedAmountUsdc?: string;
    };
    const action =
      j.action === 'approve' || j.action === 'refuse' || j.action === 'reduce' ? j.action : fallback.action;
    let suggestedAmountAtomic: bigint | undefined;
    if (j.suggestedAmountUsdc) {
      try {
        suggestedAmountAtomic = toAtomicUsdc(String(j.suggestedAmountUsdc));
      } catch {
        /* ignore */
      }
    }
    const explanation = j.explanation
      ? String(j.explanation).slice(0, 500)
      : `SERV ${action} (model omitted explanation field).`;
    return {
      action,
      explanation,
      suggestedAmountAtomic,
      source: 'serv-live',
      model: SERV_MODEL,
    };
  } catch {
    return {
      ...fallback,
      explanation: `SERV live returned unparseable content; using deterministic mock. Raw: ${text.slice(0, 80)}`,
      source: 'serv-mock',
      model: 'mock',
    };
  }
}

export async function decideSpend(
  proposal: SpendProposal,
  session: SpendingSession,
  opts?: { forceMock?: boolean },
): Promise<ServDecision> {
  const mock = mockDecide(proposal, session);
  if (opts?.forceMock) return mock;

  const key = await loadServApiKeyAsync();
  if (!key) return mock;

  const user = JSON.stringify({
    proposal: {
      payTo: proposal.payTo,
      amountUsdc: proposal.amountUsdc,
      resource: proposal.resource,
      reason: proposal.reason,
      network: proposal.network,
    },
    session: {
      maxPerTxUsdc: fromAtomicUsdc(session.maxAmountPerTxAtomic),
      maxTotalUsdc: fromAtomicUsdc(session.maxTotalAmountAtomic),
      spentUsdc: fromAtomicUsdc(session.spentAtomic),
      expiresAt: session.expiresAt,
      status: session.status,
    },
  });

  const res = await fetch(`${SERV_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SERV_MODEL,
      max_completion_tokens: 256,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return {
      ...mock,
      explanation: `SERV live call failed (${res.status}); using mock. ${body.slice(0, 120)}`,
      source: 'serv-mock',
      model: 'mock',
    };
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? '';
  return parseDecision(content, mock);
}

/** Tiny ping for credit smoke — keep max_completion_tokens low. */
export async function smokeServ(): Promise<{ ok: boolean; detail: string; source: 'serv-live' | 'serv-mock' }> {
  const key = await loadServApiKeyAsync();
  if (!key) return { ok: false, detail: 'SERV_API_KEY not set', source: 'serv-mock' };

  const res = await fetch(`${SERV_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: SERV_MODEL,
      max_completion_tokens: 32,
      messages: [
        { role: 'system', content: 'Reply with the single word pong.' },
        { role: 'user', content: 'ping' },
      ],
    }),
  });
  const text = await res.text();
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 200)}`, source: 'serv-live' };
  return { ok: true, detail: text.slice(0, 300), source: 'serv-live' };
}
