#!/usr/bin/env node
/**
 * 健康检查：确认每个站点的首页、注册（邀请）链接、状态接口都还活着。
 *   node scripts/check.mjs
 * 注册链接挂掉时以非 0 退出，让 CI 直接报警——推广页最怕的就是死链。
 *
 * 例外：403 / 429 / 503 这类「服务器答话了但把我们拦了」的响应不算死链。
 * GitHub Actions 的机房 IP 常被公益站的 WAF 拦，家宽访问同一个链接一切正常，
 * 拿它报警只会天天误报，所以单独计一类「被拦」，只提示不失败。
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { looksFiltered } from './lib/newapi.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { sites } = JSON.parse(await readFile(path.join(ROOT, 'data', 'sites.json'), 'utf8'));

async function probe(url) {
  const t = Date.now();
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'user-agent': 'ai-coding-welfare/1.0 health-check' },
      signal: AbortSignal.timeout(20_000),
    });
    return { ok: res.ok, status: res.status, ms: Date.now() - t };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - t, error: String(err.message || err) };
  }
}

const targets = [];
for (const s of sites) {
  targets.push({ site: s.name, kind: '注册链接', url: s.signupUrl, critical: true });
  targets.push({ site: s.name, kind: '站点首页', url: s.homeUrl, critical: true });
  if (s.statusApi) targets.push({ site: s.name, kind: '状态接口', url: s.statusApi, critical: false });
  if (s.docsUrl) targets.push({ site: s.name, kind: '文档', url: s.docsUrl, critical: false });
  for (const m of s.mirrors ?? []) {
    targets.push({ site: s.name, kind: '备用注册', url: m.signupUrl, critical: false });
  }
}

const results = await Promise.all(targets.map(async (t) => ({ ...t, res: await probe(t.url) })));

let failed = 0;
let warned = 0;
let blocked = 0;
for (const r of results) {
  const filtered = looksFiltered(r.res);
  const mark = r.res.ok ? '✔' : filtered ? '≡' : r.critical ? '✖' : '!';
  if (!r.res.ok) {
    if (filtered) blocked += 1;
    else if (r.critical) failed += 1;
    else warned += 1;
  }
  console.log(
    `${mark} ${r.site.padEnd(13)} ${r.kind.padEnd(10)} HTTP ${String(r.res.status).padEnd(4)} ` +
      `${String(r.res.ms).padStart(5)}ms  ${r.url}${r.res.error ? `  (${r.res.error})` : ''}` +
      `${filtered ? '  ← 被 WAF 拦（本机 IP 的问题，不算死链）' : ''}`,
  );
}

console.log(`\n共 ${results.length} 项：失败 ${failed}，告警 ${warned}，被拦 ${blocked}`);
if (blocked) {
  console.log('被拦的链接请换个网络（非机房 IP）复核一次，站点通常是好的。');
}
if (failed) {
  console.error('\n关键链接不可用，请核对 data/sites.json 里的推广链接是否已失效或换域名。');
  process.exit(1);
}
