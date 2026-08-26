/** 生成 docs/index.html（GitHub Pages 落地页）。样式在 docs/assets/style.css，此处只拼结构。 */
import { staleHours } from './newapi.mjs';
import { creditPlan, usd, breakdown, usdTotals, othersNote } from './credits.mjs';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function fmt(iso) {
  if (!iso) return '未知';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

function claudeSnippet(site, snap) {
  const model = snap?.defaults?.claude ?? '在站内模型列表中选择';
  return [
    `export ANTHROPIC_BASE_URL=${site.endpoints.anthropic}`,
    `export ANTHROPIC_AUTH_TOKEN=你的 API Key`,
    `export ANTHROPIC_MODEL=${model}`,
    `claude`,
  ].join('\n');
}

/** 有公开 Base URL 才给可复制的配置；Codex 号池那类站点只能写清楚去后台哪儿领 */
function accessBlock(site, snap) {
  if (site.endpoints?.anthropic) {
    return `<pre><code>${esc(claudeSnippet(site, snap))}</code></pre>
        <button class="copy" type="button">复制配置</button>`;
  }
  const steps = site.setup?.steps ?? [];
  const note = site.setup?.note ?? '注册登录后在站内后台查看接入方式。';
  return `<p class="desc">${esc(note)}</p>${
    steps.length ? `<ol class="hl">${steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>` : ''
  }`;
}

function siteCard(site, snap) {
  const up = Boolean(snap?.online);
  const p = creditPlan(site, snap);
  const facts = [
    p.firstDay != null
      ? ['首日可得', `<b>${usd(p.firstDay, p.approx, p.unit)}</b>${p.sources > 1 && breakdown(p) ? `<small> ${esc(breakdown(p))}</small>` : ''}`]
      : null,
    p.daily != null
      ? ['之后每天', p.resets ? `重置额度池 ${usd(p.daily, p.approx, p.unit)}（不累积）` : `签到 ${usd(p.daily, p.approx, p.unit)}`]
      : snap?.checkinEnabled
        ? ['每日签到', '支持']
        : snap?.checkinEnabled === false
          ? ['每日签到', '不支持']
          : null,
    p.inviter ? ['邀请他人', `$${p.inviter}`] : null,
    snap?.services?.length ? ['已开放服务', esc(snap.services.join(' / '))] : null,
    snap?.loginMethods?.length ? ['登录方式', esc(snap.loginMethods.join(' / '))] : null,
    snap?.githubMinAccountAgeDays ? ['账号门槛', `GitHub 满 ${snap.githubMinAccountAgeDays} 天`] : null,
    snap?.models?.length ? ['可用模型', snap.models.map((m) => esc(m.name)).join('、')] : ['可用模型', '登录后台查看'],
    ['接口延迟', snap?.latencyMs != null ? `${snap.latencyMs} ms` : '—'],
    staleHours(snap) ? ['数据快照', `${fmt(snap.staleFrom)}（接口暂未响应，沿用上次结果）`] : null,
    snap?.probeBlocked && !staleHours(snap)
      ? ['数据快照', `${fmt(snap.staleFrom ?? snap.checkedAt)}（本次探测被站点 WAF 拦下，机房 IP 常见，不影响家宽访问）`]
      : null,
  ].filter(Boolean);

  return `
      <article class="card${site.recommended ? ' featured' : ''}">
        <h3><span class="dot ${up ? 'up' : 'down'}" title="${up ? '在线' : '异常'}"></span>${esc(site.name)}${
          site.recommended ? '<span class="tag">首推</span>' : ''
        }</h3>
        <p class="desc">${esc(site.subtitle)}</p>
        <div class="tags">${(site.tags ?? []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <dl class="kv">${facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
        <ul class="hl">${(site.highlights ?? []).slice(0, 3).map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
        ${accessBlock(site, snap)}
        <div class="mt-auto"></div>
        <a class="btn btn-primary" href="${esc(site.signupUrl)}" target="_blank" rel="noopener">免费注册 ${esc(site.name)} →</a>
        ${(site.mirrors ?? [])
          .map((m) => `<a class="btn btn-ghost" href="${esc(m.signupUrl)}" target="_blank" rel="noopener">${esc(m.label ?? '备用入口')}</a>`)
          .join('')}
      </article>`;
}

function modelsTable(sites, byId) {
  const rows = [];
  for (const s of sites) {
    for (const m of byId.get(s.id)?.models ?? []) {
      rows.push(
        `<tr><td>${esc(s.name)}</td><td><code>${esc(m.name)}</code></td><td>${m.ratio ?? '—'}</td>` +
          `<td>${m.inputPerMTok != null ? `$${m.inputPerMTok}` : '按次'}</td>` +
          `<td>${m.outputPerMTok != null ? `$${m.outputPerMTok}` : '—'}</td>` +
          `<td>${esc((m.protocols ?? []).join(' / '))}</td></tr>`,
      );
    }
  }
  if (!rows.length) return '';
  return `
    <section id="models">
      <h2>可用模型与价格</h2>
      <p class="hint">抓取自各站点公开的定价接口；倍率 1 ≈ $2 / 1M tokens，一切以站内实时公示为准。</p>
      <div class="table-wrap">
      <table>
        <thead><tr><th>站点</th><th>模型</th><th>倍率</th><th>输入 /1M</th><th>输出 /1M</th><th>协议</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
      </div>
    </section>`;
}

const FAQ = [
  ['注册完看不到额度？', '公益站额度多在登录时结算，退出后重新登录一次通常就到账；余额短暂显示 $0 属于展示问题，稍后刷新即可。'],
  ['Claude Code 报 401？', 'Anthropic 协议的 Base URL 不要带 /v1；再确认 Key 完整、模型名在站内可用清单里、客户端属于该站支持的类型。'],
  ['返回 400 content blocked？', '部分站点只放行中 / 英 / 法 / 德 / 俄，提示词混入其它语言会被上游拦截。'],
  ['会不会顶掉我的 Claude 订阅登录？', '会。环境变量优先级更高，想切回订阅登录就 unset ANTHROPIC_BASE_URL / ANTHROPIC_AUTH_TOKEN / ANTHROPIC_MODEL 后重开终端。'],
];

export function renderHtml({ meta, sites, live, css }) {
  const byId = new Map((live?.sites ?? []).map((s) => [s.id, s]));
  const online = sites.filter((s) => byId.get(s.id)?.online).length;
  const plans = sites.map((s) => creditPlan(s, byId.get(s.id)));
  // 合计只算美元站：积分与美元没有公开换算，混着加就是编数字（详见 lib/credits.mjs）
  const { best, total, others } = usdTotals(plans);
  const extra = othersNote(others);
  const first = sites.find((s) => s.recommended) ?? sites[0];
  const desc = `${meta.tagline}。当前收录 ${sites.length} 个站点，${online} 个在线${
    best ? `，单站首日最高可得 $${best} 免费额度，按美元计价的站全部注册约 $${total}` : ''
  }${extra ? `；${extra}` : ''}。`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(meta.title)} — ${esc(meta.tagline)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="keywords" content="${esc((meta.keywords ?? []).join(','))}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(meta.pagesUrl)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="${esc(meta.pagesUrl)}">
${css ? `<style>\n${css}</style>` : '<link rel="stylesheet" href="assets/style.css">'}
</head>
<body>
<div class="wrap">
  <header class="hero">
    <h1>${esc(meta.title)}</h1>
    <p class="sub">${esc(meta.tagline)}</p>
    <div class="pills">
      <span class="pill">收录 <b>${sites.length}</b> 站</span>
      <span class="pill">在线 <b>${online}/${sites.length}</b></span>
      ${best ? `<span class="pill">首日最高 <b>$${best}</b></span>` : ''}
      ${total > best ? `<span class="pill">美元站全注册约 <b>$${total}</b></span>` : ''}
      <span class="pill">数据更新 <b>${esc(fmt(live?.generatedAt))}</b></span>
    </div>
    <div class="cta-row">
      <a class="btn btn-primary" href="${esc(first.signupUrl)}" target="_blank" rel="noopener">立即免费注册 ${esc(first.name)} →</a>
      <a class="btn btn-ghost" href="${esc(meta.repoUrl)}" target="_blank" rel="noopener">GitHub 仓库 ⭐</a>
    </div>
  </header>

  <section id="sites">
    <h2>站点一览</h2>
    <p class="hint">额度、模型、在线状态由脚本定时抓取站点公开接口自动更新。</p>
    ${extra ? `<p class="hint">${esc(extra)}——站内积分与美元没有公开换算关系，未计入上面的美元合计。</p>` : ''}
    <div class="grid">${sites.map((s) => siteCard(s, byId.get(s.id))).join('')}
    </div>
  </section>
${modelsTable(sites, byId)}
  <section id="faq">
    <h2>常见问题</h2>
    <p class="hint">踩坑集中在这四个。</p>
    ${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n    ')}
  </section>

  <footer>
    <ul>
      <li>本页注册链接为<strong>邀请链接</strong>，通过它注册双方都会获得站点发放的额度，不影响你的注册流程。</li>
      <li>本站只做信息聚合，与各站点无隶属关系，不代收费用、不承诺可用性；公益站可能随时改规则或关站。</li>
      <li>请勿把生产密钥、隐私数据、企业代码交给来源不明的中转服务；重要项目请使用官方 API。</li>
      <li>请遵守各站点与上游服务商条款，禁止批量注册、刷量、转售额度。</li>
    </ul>
    <p>数据快照时间：${esc(fmt(live?.generatedAt))} · 由 <a href="${esc(meta.repoUrl)}">${esc(meta.repoUrl.replace(/^https:\/\//, ''))}</a> 自动生成</p>
  </footer>
</div>
<script>
document.querySelectorAll('.copy').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var pre = btn.previousElementSibling;
    navigator.clipboard.writeText(pre.innerText).then(function () {
      btn.textContent = '已复制 ✓';
      setTimeout(function () { btn.textContent = '复制配置'; }, 1800);
    });
  });
});
</script>
</body>
</html>
`;
}
