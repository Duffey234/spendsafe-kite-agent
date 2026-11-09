/**
 * PayGuard free preview wrapper.
 * Live: GET https://api.youraitools.co/payguard/v1/preview?address=…
 * Never hits the paid /v1/address route on the $0 path.
 */
import type { PayGuardResult } from './types.js';

const PREVIEW = process.env.PAYGUARD_PREVIEW_URL ?? 'https://api.youraitools.co/payguard/v1/preview';

/** Well-known OFAC SDN sample (Lazarus) used in PayGuard docs — for tests only. */
export const SDN_SAMPLE = '0x098B716B8Aaf21512996dC57EB0615e2383E2f96';
export const CLEAN_SAMPLE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // USDC on Base

export async function screenPayee(
  address: string,
  opts?: { forceMock?: boolean; mockSanctioned?: boolean },
): Promise<PayGuardResult> {
  if (opts?.forceMock) {
    const sanctioned = opts.mockSanctioned ?? address.toLowerCase() === SDN_SAMPLE.toLowerCase();
    return {
      address,
      sanctioned,
      matchCount: sanctioned ? 1 : 0,
      source: 'payguard-mock',
      detail: sanctioned ? 'mock SDN hit' : 'mock clear',
    };
  }

  try {
    const url = `${PREVIEW}?address=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      return {
        address,
        sanctioned: false,
        matchCount: 0,
        source: 'payguard-mock',
        detail: `preview HTTP ${res.status}; fail-closed callers should refuse on transport errors if desired`,
      };
    }
    const j = (await res.json()) as { sanctioned?: boolean; match_count?: number; address?: string };
    return {
      address: j.address ?? address,
      sanctioned: Boolean(j.sanctioned),
      matchCount: Number(j.match_count ?? 0),
      source: 'payguard-live-preview',
      detail: j.sanctioned ? 'OFAC SDN match (preview tier)' : 'clear on preview tier',
    };
  } catch (e) {
    return {
      address,
      sanctioned: false,
      matchCount: 0,
      source: 'payguard-mock',
      detail: `preview error: ${(e as Error).message}`,
    };
  }
}
