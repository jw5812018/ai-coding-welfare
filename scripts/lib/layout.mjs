/**
 * 落地页公用外壳：head / 导航 / 页脚 / JSON-LD。
 *
 * 站点详情页在 docs/sites/<id>/，比根目录深两层，所以站内链接一律用 base 前缀拼，
 * 别在各个渲染器里各写一套相对路径。样式沿用「内联进 HTML」的做法：
 * 单文件转发到社群不掉样式，也省掉一次请求。
 */
import { language, languageNav, languageAlternates } from './locales.mjs';

export const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function fmt(iso) {
  if (!iso) return '未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/** 站内导航：新页面只有被链接到才有 SEO 价值，六个页面互相链上 */
export const NAV = [
  { href: '', label: '站点总览' },
  { href: 'compare/', label: '按次 vs 按量' },
  { href: 'status/', label: '可用性' },
  { href: 'changelog/', label: '变动日志' },
];

function navBar(base, current, locale, copy) {
  const links = copy ? [
    { href: language(locale).path, label: copy.overview },
    { href: 'compare/', label: copy.compareZh },
    { href: 'status/', label: copy.statusZh },
    { href: 'changelog/', label: copy.historyZh },
  ] : NAV;
  const items = links.map((n) => {
    const active = n.href === current;
    return `<a class="navlink${active ? ' active' : ''}" href="${esc(base + n.href)}">${esc(n.label)}</a>`;
  });
  return `<nav class="nav${copy ? ' localized-nav' : ''}"><div class="wrap navrow">${items.join('')}<span class="navspace"></span><a class="navlink" href="${esc(
    `${base}feed.xml`,
  )}">${esc(copy?.feedZh ?? 'Atom 订阅')}</a></div></nav>`;
}

/**
 * JSON-LD：把 < > & 转成 \uXXXX。
 * 一是防止正文里的 </script> 提前闭合脚本块（整页结构化数据会静默失效），
 * 二是站点名 / 公告里的尖括号不会以原样 HTML 出现在页面源码里。转义后仍是合法 JSON，值不变。
 */
const ld = (data) =>
  JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export function pageShell({ meta, css, title, desc, canonical, base = '', current = '', jsonLd = [], body, live, noindex = false, locale = 'zh-CN', copy = null, languagePath = null }) {
  language(locale); // Reject invalid locale metadata instead of silently rendering the wrong language.
  const feed = `${meta.pagesUrl}feed.xml`;
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? '<meta name="robots" content="noindex,follow">' : ''}
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc(copy ? [copy.title, 'Claude Code', 'Codex', 'Cursor', 'API'].join(',') : (meta.keywords ?? []).join(','))}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(canonical)}">
<link rel="alternate" type="application/atom+xml" title="${esc(copy?.historyZh ?? '变动日志')}" href="${esc(feed)}">
${languagePath !== null ? languageAlternates(meta.pagesUrl, languagePath) : ''}
${jsonLd.length ? `<script type="application/ld+json">${ld(jsonLd.length === 1 ? jsonLd[0] : jsonLd)}</script>` : ''}
${css ? `<style>\n${css}</style>` : `<link rel="stylesheet" href="${esc(base)}assets/style.css">`}
</head>
<body>
${navBar(base, current, locale, copy)}
<div class="wrap">
${languageNav({ locale, base, path: languagePath ?? '', label: copy?.language })}
${body}
  <footer>
    ${copy ? `<h2>${esc(copy.safety)}</h2><ul>${copy.disclaimer.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    <p>${esc(copy.updated)}: ${esc(live?.generatedAt ? fmt(live.generatedAt) : copy.unknown)} · <a href="${esc(meta.repoUrl)}">${esc(copy.repository)}</a> · <a href="${esc(feed)}">${esc(copy.feedZh)}</a></p>` : `
    <ul>
      <li>本页包含<strong>邀请链接</strong>，邀请奖励、领取条件与免费范围以各站活动规则为准，不保证注册即有奖励。</li>
      <li>本站只做信息聚合，与各站点无隶属关系，不代收费用、不承诺可用性；公益站可能随时改规则或关站。</li>
      <li>请勿把生产密钥、隐私数据、企业代码交给来源不明的中转服务；重要项目请使用官方 API。</li>
      <li>请遵守各站点与上游服务商条款，禁止批量注册、刷量、转售额度。</li>
    </ul>
    <p>数据快照时间：${esc(fmt(live?.generatedAt))} · 由 <a href="${esc(meta.repoUrl)}">${esc(
      meta.repoUrl.replace(/^https:\/\//, ''),
    )}</a> 自动生成 · <a href="${esc(feed)}">Atom 订阅</a></p>`}
  </footer>
</div>
</body>
</html>
`;
}

/** 面包屑的结构化数据，让搜索结果里显示层级而不是一串裸 URL */
export function breadcrumb(meta, trail) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: t.url,
    })),
  };
}

export function faqLd(pairs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: pairs.map(([q, a]) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}
