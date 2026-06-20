export function pickRandomBatch<T>(items: T[], size: number): T[] {
  const normalizedSize = Math.max(1, size);
  const pool = [...items];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, normalizedSize);
}

export function dedupeById<T extends { id: number }>(list: T[]): T[] {
  if (list.length <= 1) return list;
  const seen = new Set<number>();
  const next: T[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

export function formatLearningTime(timeMs: number): string {
  if (!Number.isFinite(timeMs) || timeMs <= 0) {
    return "0 min";
  }

  const totalMinutes = Math.max(0, Math.round(timeMs / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}
