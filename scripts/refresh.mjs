#!/usr/bin/env node
/**
 * 拉取所有站点的实时状态，写入 data/live.json。
 *   node scripts/refresh.mjs
 * 网络不通时保留上一次的 live.json，不会把仓库刷成空数据。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { probeSite, fetchJson } from './lib/newapi.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SITES = path.join(ROOT, 'data', 'sites.json');
const LIVE = path.join(ROOT, 'data', 'live.json');

async function headOk(url) {
  if (!url) return null;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'user-agent': 'ai-coding-welfare/1.0 link-check' },
      signal: AbortSignal.timeout(20_000),
    });
    return { status: res.status, ok: res.ok, ms: Date.now() - started };
  } catch (err) {
    return { status: 0, ok: false, ms: Date.now() - started, error: String(err.message || err) };
  }
}

async function loadPrevious() {
  try {
    return JSON.parse(await readFile(LIVE, 'utf8'));
  } catch {
    return null;
  }
}

const { sites } = JSON.parse(await readFile(SITES, 'utf8'));
const previous = await loadPrevious();

const snapshots = await Promise.all(
  sites.map(async (site) => {
    const [snap, signup] = await Promise.all([probeSite(site), headOk(site.signupUrl)]);
    const mirrors = await Promise.all(
      (site.mirrors ?? []).map(async (m) => ({
        homeUrl: m.homeUrl,
        online: (await fetchJson(`${m.homeUrl.replace(/\/$/, '')}/api/status`)).ok,
      })),
    );
    return { ...snap, signup, mirrors };
  }),
);

// 抓失败的站点沿用上一次的详细数据，只把 online 标成 false，避免页面突然空白。
const merged = snapshots.map((snap) => {
  if (snap.online) return snap;
  const old = previous?.sites?.find((s) => s.id === snap.id);
  if (!old) return snap;
  return { ...old, ...snap, models: snap.models.length ? snap.models : old.models, staleFrom: old.checkedAt };
});

const out = {
  generatedAt: new Date().toISOString(),
  sites: merged,
};

await writeFile(LIVE, `${JSON.stringify(out, null, 2)}\n`, 'utf8');

for (const s of merged) {
  const bonus = s.inviteeBonusUsd ? `新用户 $${s.inviteeBonusUsd}` : '邀请额度未公开';
  const signup = s.signup ? `注册页 HTTP ${s.signup.status}` : '注册页未检查';
  console.log(
    `${s.online ? 'OK  ' : 'DOWN'} ${s.id.padEnd(12)} ${String(s.systemName ?? '-').padEnd(14)} ` +
      `${bonus.padEnd(18)} 模型 ${String(s.models.length).padStart(2)} 项  ${signup}`,
  );
}
console.log(`\n已写入 ${path.relative(ROOT, LIVE)}`);
