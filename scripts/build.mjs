#!/usr/bin/env node
/**
 * 用 data/sites.json + data/live.json 重新生成 README.md 与 docs/index.html。
 *   node scripts/build.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderReadme } from './lib/render-readme.mjs';
import { renderHtml } from './lib/render-html.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const p = (...s) => path.join(ROOT, ...s);

const { meta, sites } = JSON.parse(await readFile(p('data', 'sites.json'), 'utf8'));

let live = { generatedAt: null, sites: [] };
try {
  live = JSON.parse(await readFile(p('data', 'live.json'), 'utf8'));
} catch {
  console.warn('⚠ 找不到 data/live.json，先跑 `npm run refresh` 才有实时数据，本次按空数据生成。');
}

if (!sites.length) throw new Error('data/sites.json 里没有任何站点');

await writeFile(p('README.md'), renderReadme({ meta, sites, live }), 'utf8');

// 样式内联进 HTML：落地页变成单文件，直接丢给别人打开、或转发到社群都不会掉样式
const css = await readFile(p('docs', 'assets', 'style.css'), 'utf8');
await writeFile(p('docs', 'index.html'), renderHtml({ meta, sites, live, css }), 'utf8');
await writeFile(p('docs', '.nojekyll'), '', 'utf8');

// 落地页要被搜到才有推广价值，顺手生成 robots.txt 与 sitemap.xml
const pages = meta.pagesUrl?.replace(/\/?$/, '/') ?? '';
await writeFile(p('docs', 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${pages}sitemap.xml\n`, 'utf8');
await writeFile(
  p('docs', 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${pages}</loc><lastmod>${(live.generatedAt ?? new Date().toISOString()).slice(0, 10)}</lastmod><changefreq>daily</changefreq></url>`,
    '</urlset>',
    '',
  ].join('\n'),
  'utf8',
);

if (/USERNAME/.test(`${meta.repoUrl}${meta.pagesUrl}`)) {
  console.warn('⚠ data/sites.json 的 meta.repoUrl / meta.pagesUrl 还是占位的 USERNAME，推到 GitHub 前记得改成你的用户名。');
}

console.log(`✔ README.md 已生成（${sites.length} 个站点）`);
console.log('✔ docs/index.html 已生成');
