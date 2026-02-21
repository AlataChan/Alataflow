const DECAY_FACTOR = 0.95;
const CONFIDENCE_FLOOR = 0.10;
const DECAY_THRESHOLD_DAYS = 30;

export function applyMonthlyDecay(entries) {
  const now = Date.now();
  return entries.map(entry => {
    if (entry.kind !== 'capsule') return entry;
    const lastUsed = new Date(entry.last_used_at).getTime();
    const daysSince = (now - lastUsed) / (1000 * 60 * 60 * 24);
    if (daysSince <= DECAY_THRESHOLD_DAYS) return entry;
    const decayed = Math.max(CONFIDENCE_FLOOR, entry.confidence * DECAY_FACTOR);
    return { ...entry, confidence: Math.round(decayed * 10000) / 10000 };
  });
}
