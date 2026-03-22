import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join, dirname } from 'path';

export function initExperimentsTsv(stateRoot, slug) {
  const filePath = join(stateRoot, '.plans', slug, 'experiments.tsv');
  mkdirSync(dirname(filePath), { recursive: true });
  if (!existsSync(filePath)) {
    const header = 'round\tcommit\tdescription\tpass_rate\tmetric_value\tmetric_direction\tloc_delta\tstatus\tmode\ttimestamp\n';
    writeFileSync(filePath, header, 'utf8');
  }
  return filePath;
}

export function appendExperimentRow(stateRoot, slug, row) {
  const filePath = initExperimentsTsv(stateRoot, slug);
  const line = [
    row.round ?? 0,
    row.commit ?? '-',
    row.description ?? '',
    row.pass_rate ?? '-',
    row.metric_value ?? '-',
    row.metric_direction ?? '-',
    row.loc_delta ?? 0,
    row.status ?? 'baseline',
    row.mode ?? 'normal',
    row.timestamp ?? new Date().toISOString(),
  ].join('\t') + '\n';
  appendFileSync(filePath, line, 'utf8');
}

export function readExperimentsTsv(stateRoot, slug) {
  const filePath = join(stateRoot, '.plans', slug, 'experiments.tsv');
  if (!existsSync(filePath)) return [];
  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  if (lines.length <= 1) return [];
  const headers = lines[0].split('\t');
  return lines.slice(1).map(line => {
    const vals = line.split('\t');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    obj.round = parseInt(obj.round, 10) || 0;
    obj.loc_delta = parseInt(obj.loc_delta, 10) || 0;
    return obj;
  });
}

export function getLastKeepOrBaseline(rows) {
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].status === 'keep' || rows[i].status === 'baseline') return rows[i];
  }
  return rows[0] ?? null;
}

export function decideExperiment(baselinePassRate, newPassRate, opts = {}) {
  const { metricValue, baselineMetricValue, metricDirection, locDelta, totalLines } = opts;

  const bParts = parsePassRate(baselinePassRate);
  const nParts = parsePassRate(newPassRate);
  if (!bParts || !nParts) return 'error';

  const baseRatio = bParts.passed / bParts.total;
  const newRatio = nParts.passed / nParts.total;

  if (newRatio < baseRatio) return 'discard';
  if (newRatio > baseRatio) return 'keep';

  if (metricValue != null && baselineMetricValue != null && metricDirection) {
    const improved = metricDirection === 'lower'
      ? metricValue < baselineMetricValue
      : metricValue > baselineMetricValue;
    if (improved) {
      const changePct = Math.abs(metricValue - baselineMetricValue) / Math.abs(baselineMetricValue || 1) * 100;
      const locPct = totalLines ? (Math.abs(locDelta ?? 0) / totalLines * 100) : 0;
      if (changePct < 5 && locPct > 30) return 'marginal';
      return 'keep';
    }
    const unchanged = metricValue === baselineMetricValue;
    if (unchanged && (locDelta ?? 0) < 0) return 'keep';
    if (unchanged && (locDelta ?? 0) >= 0) return 'discard';
    return 'discard';
  }

  if ((locDelta ?? 0) < 0) return 'keep';
  if ((locDelta ?? 0) >= 0) return 'discard';

  return 'discard';
}

export function parsePassRate(str) {
  if (!str || str === '-') return null;
  const m = String(str).match(/^(\d+)\/(\d+)$/);
  if (!m) return null;
  return { passed: parseInt(m[1], 10), total: parseInt(m[2], 10) };
}

export function writeExperimentFlag(stateRoot, slug, timeoutSec = 300) {
  const flagPath = join(stateRoot, '.alataflow', 'experiment_active.' + slug);
  const flag = {
    slug,
    started_at: new Date().toISOString(),
    heartbeat_at: new Date().toISOString(),
    pid: process.pid,
    timeout_sec: timeoutSec,
    round: 0,
  };
  writeFileSync(flagPath, JSON.stringify(flag), 'utf8');
  return flagPath;
}

export function updateHeartbeat(stateRoot, slug, round) {
  const flagPath = join(stateRoot, '.alataflow', 'experiment_active.' + slug);
  if (!existsSync(flagPath)) return;
  try {
    const flag = JSON.parse(readFileSync(flagPath, 'utf8'));
    flag.heartbeat_at = new Date().toISOString();
    if (round != null) flag.round = round;
    writeFileSync(flagPath, JSON.stringify(flag), 'utf8');
  } catch { /* ignore */ }
}

export function removeExperimentFlag(stateRoot, slug) {
  const flagPath = join(stateRoot, '.alataflow', 'experiment_active.' + slug);
  try {
    if (existsSync(flagPath)) unlinkSync(flagPath);
  } catch { /* ignore */ }
}

export function isExperimentActive(stateRoot, slug) {
  const flagPath = join(stateRoot, '.alataflow', 'experiment_active.' + slug);
  return existsSync(flagPath);
}

export function cleanStaleExperimentFlags(stateRoot) {
  const dir = join(stateRoot, '.alataflow');
  if (!existsSync(dir)) return [];
  const cleaned = [];
  try {
    const files = readdirSync(dir).filter(f => f.startsWith('experiment_active.'));
    for (const file of files) {
      const flagPath = join(dir, file);
      try {
        const flag = JSON.parse(readFileSync(flagPath, 'utf8'));
        let pidAlive = false;
        try { process.kill(flag.pid, 0); pidAlive = true; } catch { pidAlive = false; }
        if (pidAlive) continue;
        const heartbeat = new Date(flag.heartbeat_at).getTime();
        const ttl = Math.max((flag.timeout_sec ?? 300) * 3, 900) * 1000;
        if (Date.now() - heartbeat > ttl) {
          unlinkSync(flagPath);
          cleaned.push(flag.slug);
        }
      } catch {
        unlinkSync(flagPath);
        cleaned.push(file.replace('experiment_active.', ''));
      }
    }
  } catch { /* ignore */ }
  return cleaned;
}

export function buildExperimentMemoryEntry(stateRoot, slug, rows) {
  const kept = rows.filter(r => r.status === 'keep');
  const total = rows.filter(r => r.round > 0);
  const baseline = rows.find(r => r.status === 'baseline');
  const bestKept = kept[kept.length - 1];
  const mode = baseline?.mode ?? 'normal';
  const totalDelta = kept.reduce((sum, r) => sum + (r.loc_delta || 0), 0);

  return {
    kind: 'experiment',
    summary: '[EXPERIMENT] ' + slug + ': ' + (bestKept?.description ?? 'no improvement') +
             ', ' + (totalDelta >= 0 ? '+' : '') + totalDelta + ' lines' +
             ', ' + kept.length + '/' + total.length + ' rounds kept',
    content: 'baseline pass_rate=' + (baseline?.pass_rate ?? '-') +
             ', best pass_rate=' + (bestKept?.pass_rate ?? baseline?.pass_rate ?? '-') +
             ', rounds=' + total.length +
             ', kept=' + kept.length +
             ', mode=' + mode,
    tags: {
      project: stateRoot,
      space: slug,
      type: 'experiment',
    },
  };
}
