/**
 * Limitador em memória dos alertas (uma instância serverless). Separado do
 * report.ts, que é server-only, para poder ser testado com relógio controlado.
 *
 * - O mesmo alerta (fingerprint) passa no máximo 1x por `sameAlertWindowMs`.
 * - No total, no máximo `maxPerWindow` alertas a cada `windowMs`.
 */
export function createAlertThrottle(opts: {
  sameAlertWindowMs: number;
  windowMs: number;
  maxPerWindow: number;
}) {
  const lastSent = new Map<string, number>();
  let sent: number[] = [];

  return function allow(fp: string, now: number): boolean {
    const last = lastSent.get(fp);
    if (last !== undefined && now - last < opts.sameAlertWindowMs) return false;

    sent = sent.filter((t) => now - t < opts.windowMs);
    if (sent.length >= opts.maxPerWindow) return false;

    // Limpa fingerprints velhas para o Map não crescer sem limite.
    for (const [key, t] of lastSent) {
      if (now - t >= opts.sameAlertWindowMs) lastSent.delete(key);
    }

    lastSent.set(fp, now);
    sent.push(now);
    return true;
  };
}
