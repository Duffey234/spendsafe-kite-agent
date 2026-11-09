/**
 * Settlement Check hook — attaches a receipt-style report after a (simulated) pay.
 * Live service: GET/POST https://api.youraitools.co/x402fix/v1/settle-check (paid/admin).
 * On $0 path we never call the paid settle runner; we emit a labelled simulated report
 * and optionally hit the free x402fix preview for the target URL.
 */
const PREVIEW = process.env.X402FIX_PREVIEW_URL ?? 'https://api.youraitools.co/x402fix/v1/preview';

export interface SettleCheckReport {
  status: 'simulated-pass' | 'preview-only' | 'skipped';
  simulated: true;
  resource: string;
  note: string;
  previewGrade?: string;
  at: string;
}

export async function attachSettleCheck(resource: string, opts?: { probePreview?: boolean }): Promise<SettleCheckReport> {
  const at = new Date().toISOString();
  if (!opts?.probePreview) {
    return {
      status: 'simulated-pass',
      simulated: true,
      resource,
      note: 'SIMULATED Settlement Check — live settle-check runner not invoked ($0).',
      at,
    };
  }
  try {
    const url = `${PREVIEW}?url=${encodeURIComponent(resource)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    let grade = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { grade?: string; summary?: { grade?: string } };
      grade = j.grade ?? j.summary?.grade ?? grade;
    } catch {
      grade = text.slice(0, 80);
    }
    return {
      status: 'preview-only',
      simulated: true,
      resource,
      note: 'Free x402fix preview only; no paid settle-check run.',
      previewGrade: String(grade).slice(0, 120),
      at,
    };
  } catch (e) {
    return {
      status: 'skipped',
      simulated: true,
      resource,
      note: `preview skipped: ${(e as Error).message}`,
      at,
    };
  }
}
