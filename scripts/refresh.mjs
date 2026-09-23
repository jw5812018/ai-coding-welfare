#!/usr/bin/env node
/**
 * 拉取所有站点的实时状态，写入 data/live.json。
 *   node scripts/refresh.mjs
 * 网络不通时保留上一次的 live.json，不会把仓库刷成空数据。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchJson, probeUrl } from './lib/newapi.mjs';
import { probeSite } from './lib/panels.mjs';
import { mergeSnapshot } from './lib/merge.mjs';
import { activeSites } from './lib/archived.mjs';
import { signupProbeUrl } from './lib/signup.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITES = path.join(ROOT, 'data', 'sites.json');
const LIVE = path.join(ROOT, 'data', 'live.json');

async function loadPrevious() {
  try {
    return JSON.parse(await readFile(LIVE, 'utf8'));
  } catch {
    return null;
  }
}

// 归档（已挂掉）的站点不再探测：死站没有「实时状态」可言，天天探只会让日志充满重复告警
const { sites: allSites } = JSON.parse(await readFile(SITES, 'utf8'));
const sites = activeSites(allSites);
const skipped = allSites.length - sites.length;
const previous = await loadPrevious();

const snapshots = await Promise.all(
  sites.map(async (site) => {
    const [snap, signup] = await Promise.all([probeSite(site), probeUrl(signupProbeUrl(site))]);
    const mirrors = await Promise.all(
      (site.mirrors ?? []).map(async (m) => ({
        homeUrl: m.homeUrl,
        online: (await fetchJson(`${m.homeUrl.replace(/\/$/, '')}/api/status`)).ok,
      })),
    );
    return { ...snap, signup: { ...signup, url: signupProbeUrl(site) }, mirrors };
  }),
);

// 字段级合并：抓失败的字段沿用上一次的值，避免一次 Cloudflare 挑战把页面刷空（逻辑见 lib/merge.mjs）
const merged = snapshots.map((fresh) => mergeSnapshot(fresh, previous?.sites?.find((s) => s.id === fresh.id)));

const out = {
  generatedAt: new Date().toISOString(),
  sites: merged,
};

await writeFile(LIVE, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

for (const s of merged) {
  const bonus = s.inviteeBonusUsd ? `新用户 $${s.inviteeBonusUsd}` : '邀请额度未公开';
  const signup = s.signup ? `公开入口 HTTP ${s.signup.status}` : '公开入口未检查';
  const stale = s.dataStale ? `  ⚠ 沿用 ${String(s.staleFrom).slice(0, 16)} 的 ${s.staleFields.length} 个字段（${s.error ?? 'api 未响应'}）` : '';
  console.log(
    `${s.online ? (s.probeBlocked ? 'WAF ' : 'OK  ') : 'DOWN'} ${s.id.padEnd(12)} ${String(s.systemName ?? '-').padEnd(14)} ` +
      `${bonus.padEnd(18)} 模型 ${String(s.models.length).padStart(2)} 项  ${signup}${stale}`,
  );
}
if (skipped) console.log(`\n⚰ ${skipped} 个已归档（挂掉）的站点跳过探测，快照里不再保留`);
console.log(`\n已写入 ${path.relative(ROOT, LIVE)}`);
