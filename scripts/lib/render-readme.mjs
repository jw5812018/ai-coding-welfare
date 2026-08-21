/** 生成 README.md：全部内容由 data/sites.json + data/live.json 渲染，请勿手改 README。 */

/** shields.io 转义：- → --，_ → __，其余走 URI 编码 */
const shield = (s) => encodeURIComponent(String(s).replace(/-/g, '--').replace(/_/g, '__'));
const B = (label, msg, color) => `https://img.shields.io/badge/${shield(label)}-${shield(msg)}-${color}`;

const yes = (v) => (v === true ? '✅' : v === false ? '❌' : '—');

function fmtDate(iso) {
  if (!iso) return '未知';
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
}

/** 挑一个用于示例配置的 Claude 模型名 */
function claudeModel(snap) {
  return snap?.defaults?.claude ?? '<登录后台查看可用模型名>';
}

/** 挑一个用于示例配置的 OpenAI 协议模型名 */
function openaiModel(snap) {
  return snap?.defaults?.openai ?? '<登录后台查看可用模型名>';
}

function overviewTable(sites, liveById) {
  const rows = sites.map((s) => {
    const l = liveById.get(s.id) ?? {};
    const state = l.online ? '🟢 在线' : '🔴 异常';
    const bonus = l.inviteeBonusUsd ? `**$${l.inviteeBonusUsd}**` : '站内公示';
    const checkin = l.checkinEnabled ? '每日签到 ✅' : s.dailyBonus ? `${s.dailyBonus} ✅` : l.checkinEnabled === false ? '无签到' : '—';
    const models = l.models?.length ? `${l.models.length} 个可查` : '需登录查看';
    const proto = [s.endpoints?.anthropic && 'Anthropic', s.endpoints?.openai && 'OpenAI'].filter(Boolean).join(' + ');
    return `| **${s.name}**${s.recommended ? ' 🔥' : ''} | ${state} | ${bonus} | ${checkin} | ${proto} | ${models} | [点此注册 →](${s.signupUrl}) |`;
  });
  return [
    '| 站点 | 状态 | 新用户额度 | 持续领取 | 兼容协议 | 模型 | 注册 |',
    '| :-- | :--: | :--: | :--: | :--: | :--: | :--: |',
    ...rows,
  ].join('\n');
}

function modelTable(snap) {
  if (!snap?.models?.length) return null;
  const rows = snap.models.map((m) => {
    const inp = m.inputPerMTok != null ? `$${m.inputPerMTok}` : '按次计费';
    const out = m.outputPerMTok != null ? `$${m.outputPerMTok}` : '—';
    return `| \`${m.name}\` | ${m.ratio ?? '—'} | ${inp} | ${out} | ${(m.protocols ?? []).join(' / ') || '—'} |`;
  });
  return [
    '| 模型 | 倍率 | 输入 / 1M tokens | 输出 / 1M tokens | 协议 |',
    '| :-- | :--: | :--: | :--: | :--: |',
    ...rows,
  ].join('\n');
}

function liveFacts(snap) {
  if (!snap) return '_暂无实时数据_';
  const items = [
    `站点名称：**${snap.systemName ?? '—'}**`,
    `面板版本：\`${snap.version ?? '—'}\``,
    snap.inviteeBonusUsd ? `邀请注册到账：**$${snap.inviteeBonusUsd}**` : null,
    snap.inviterBonusUsd ? `邀请他人可得：**$${snap.inviterBonusUsd}**` : null,
    snap.checkinEnabled != null ? `每日签到：${yes(snap.checkinEnabled)}` : null,
    snap.registerOpen != null ? `开放注册：${yes(snap.registerOpen)}` : null,
    snap.loginMethods?.length ? `登录方式：${snap.loginMethods.join(' / ')}` : null,
    snap.githubMinAccountAgeDays ? `GitHub 账号需满 **${snap.githubMinAccountAgeDays} 天**` : null,
    snap.latencyMs != null ? `接口延迟：${snap.latencyMs} ms` : null,
  ].filter(Boolean);
  return items.map((t) => `- ${t}`).join('\n');
}

function siteSection(site, snap) {
  const cm = claudeModel(snap);
  const om = openaiModel(snap);
  const models = modelTable(snap);
  const mirror = (site.mirrors ?? [])
    .map((m) => `- ${m.label ?? '备用域名'}：<${m.homeUrl}> · [从备用域名注册](${m.signupUrl})`)
    .join('\n');

  const parts = [
    `### ${snap?.online ? '🟢' : '🔴'} ${site.name}${site.recommended ? ' 🔥 首推' : ''}`,
    '',
    `> ${site.subtitle}`,
    '',
    `<a href="${site.signupUrl}"><img src="${B('立即注册', site.name, 'brightgreen?style=for-the-badge')}" alt="注册 ${site.name}"></a>`,
    '',
    `**为什么值得注册**`,
    '',
    site.highlights.map((h) => `- ${h}`).join('\n'),
    '',
    '**实时数据**（自动抓取站点公开接口）',
    '',
    liveFacts(snap),
  ];

  if (mirror) parts.push('', '**镜像 / 备用入口**', '', mirror);
  if (models) parts.push('', '**当前可用模型**', '', models, '', `<sub>倍率 1 ≈ $2 / 1M tokens，输出价 = 倍率 × 补全倍率 × $2；以站内实时价格为准。</sub>`);
  else parts.push('', '> 该站模型清单需登录后台查看，注册后在「模型价格」页确认。');

  parts.push(
    '',
    '**注册要求**',
    '',
    [...(site.register?.requirements ?? []).map((r) => `- ${r}`)].join('\n') || '- 无特殊限制',
    '',
    '**接入配置**',
    '',
    codeBlocks(site, cm, om),
  );

  if (site.earnMore?.length) parts.push('', '**如何继续拿额度**', '', site.earnMore.map((t) => `- ${t}`).join('\n'));
  if (site.caveats?.length) parts.push('', '**⚠️ 使用前必读**', '', site.caveats.map((t) => `- ${t}`).join('\n'));
  if (site.community?.length) parts.push('', '**官方渠道**', '', site.community.map((t) => `- ${t}`).join('\n'));

  const ann = (snap?.announcements ?? []).slice(0, 3);
  if (ann.length) {
    parts.push('', '<details><summary><b>站点最新公告</b>（自动同步）</summary>', '');
    parts.push(ann.map((a) => `- ${a.date ? `\`${a.date}\` ` : ''}${a.text}`).join('\n'));
    parts.push('', '</details>');
  }
  return parts.join('\n');
}

const F = '```';

function codeBlocks(site, claude, openai) {
  const anth = site.endpoints?.anthropic;
  const oai = site.endpoints?.openai;
  const out = [];

  if (anth) {
    out.push(
      '<details open><summary><b>Claude Code</b>（Anthropic 兼容，Base URL 不带 <code>/v1</code>）</summary>',
      '',
      `${F}bash`,
      '# macOS / Linux',
      `export ANTHROPIC_BASE_URL=${anth}`,
      'export ANTHROPIC_AUTH_TOKEN=你在站点后台创建的 Key',
      `export ANTHROPIC_MODEL=${claude}`,
      'npm install -g @anthropic-ai/claude-code@latest && claude',
      F,
      '',
      `${F}powershell`,
      '# Windows PowerShell',
      `$env:ANTHROPIC_BASE_URL = "${anth}"`,
      '$env:ANTHROPIC_AUTH_TOKEN = "你在站点后台创建的 Key"',
      `$env:ANTHROPIC_MODEL = "${claude}"`,
      'claude',
      F,
      '',
      '</details>',
      '',
    );
  }

  if (oai) {
    out.push(
      '<details><summary><b>Codex CLI</b>（OpenAI 兼容，写入 <code>~/.codex/config.toml</code>）</summary>',
      '',
      `${F}toml`,
      `model = "${openai}"`,
      `model_provider = "${site.id}"`,
      '',
      `[model_providers.${site.id}]`,
      `name = "${site.name}"`,
      `base_url = "${oai}"`,
      `env_key = "${site.id.toUpperCase()}_API_KEY"`,
      'wire_api = "chat"',
      F,
      '',
      '</details>',
      '',
      '<details><summary><b>OpenAI SDK / Cherry Studio / Cursor 等通用客户端</b></summary>',
      '',
      `${F}python`,
      'from openai import OpenAI',
      '',
      `client = OpenAI(api_key="你的 Key", base_url="${oai}")`,
      `resp = client.chat.completions.create(model="${openai}", messages=[{"role": "user", "content": "ping"}])`,
      'print(resp.choices[0].message.content)',
      F,
      '',
      '通用客户端只需填两项：**Base URL** = `' + oai + '`，**API Key** = 站点后台创建的 Key。',
      '',
      '</details>',
      '',
      '<details><summary><b>连通性自测</b></summary>',
      '',
      `${F}bash`,
      `curl -s ${oai}/chat/completions \\`,
      '  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \\',
      `  -d '{"model":"${openai}","messages":[{"role":"user","content":"只回复 OK"}]}'`,
      F,
      '',
      '</details>',
    );
  }
  return out.join('\n');
}

export function renderReadme({ meta, sites, live }) {
  const byId = new Map((live?.sites ?? []).map((s) => [s.id, s]));
  const onlineCount = sites.filter((s) => byId.get(s.id)?.online).length;
  const best = Math.max(0, ...sites.map((s) => byId.get(s.id)?.inviteeBonusUsd ?? 0));

  const head = [
    `<h1 align="center">${meta.title}</h1>`,
    '',
    `<p align="center">${meta.tagline}</p>`,
    '',
    '<p align="center">',
    `  <img src="${B('收录站点', `${sites.length} 个`, 'blue')}" alt="收录站点">`,
    `  <img src="${B('在线', `${onlineCount}/${sites.length}`, onlineCount === sites.length ? 'brightgreen' : 'orange')}" alt="在线">`,
    best > 0 ? `  <img src="${B('注册可得', `$${best}`, 'success')}" alt="注册可得">` : null,
    `  <img src="${B('数据更新', fmtDate(live?.generatedAt).replace(/:/g, '.'), 'informational')}" alt="数据更新">`,
    '</p>',
    '',
    '<p align="center">',
    sites.map((s) => `  <a href="${s.signupUrl}"><b>${s.name} 注册</b></a>`).join(' ·\n'),
    '</p>',
    '',
    '---',
    '',
    '## 🚀 一分钟上车',
    '',
    overviewTable(sites, byId),
    '',
    `> 表格里的额度、模型、在线状态**全部由脚本抓取站点公开接口自动生成**，最后更新：\`${fmtDate(live?.generatedAt)}\`。`,
    '',
    '**只想快点用上 Claude Code？** 三步：',
    '',
    `1. 点上表的注册链接 → GitHub 授权登录（额度是按邀请链接发放的，别走裸链）`,
    '2. 后台「令牌 / API Keys」新建一个 Key',
    '3. 跑一键脚本，或手抄下面对应站点的环境变量',
    '',
    `${F}bash`,
    '# 交互式写好 Claude Code 的环境变量（macOS / Linux）',
    'bash scripts/quickstart.sh',
    F,
    '',
    `${F}powershell`,
    '# Windows PowerShell',
    'powershell -ExecutionPolicy Bypass -File scripts/quickstart.ps1',
    F,
    '',
    '## 📚 站点详情',
    '',
  ];

  const body = sites.map((s) => siteSection(s, byId.get(s.id))).join('\n\n---\n\n');
  return [head.filter((l) => l !== null).join('\n'), body, tail(meta, sites, live)].join('\n\n');
}

function tail(meta, sites, live) {
  return [
    '---',
    '',
    '## 🧰 仓库里有什么',
    '',
    '| 文件 | 作用 |',
    '| :-- | :-- |',
    '| [`data/sites.json`](data/sites.json) | 唯一数据源：站点信息与推广链接 |',
    '| [`data/live.json`](data/live.json) | 自动抓取的实时快照（额度 / 模型 / 在线状态） |',
    '| [`scripts/refresh.mjs`](scripts/refresh.mjs) | 抓取站点公开接口 |',
    '| [`scripts/build.mjs`](scripts/build.mjs) | 用数据重新生成 README 与落地页 |',
    '| [`scripts/check.mjs`](scripts/check.mjs) | 链接与站点健康检查，失效即 CI 报警 |',
    '| [`scripts/quickstart.sh`](scripts/quickstart.sh) / [`.ps1`](scripts/quickstart.ps1) | 交互式配置 Claude Code 环境变量 |',
    '',
    '本地跑一遍：',
    '',
    `${F}bash`,
    'npm run refresh   # 抓最新数据',
    'npm run build     # 重新生成 README + docs/',
    'npm run check     # 校验链接是否还活着',
    F,
    '',
    '## ❓ 常见问题',
    '',
    '<details><summary><b>注册完为什么看不到额度？</b></summary>',
    '',
    '公益站的额度多在登录时结算，**退出登录再重新登录一次**通常就会到账；余额偶尔显示 $0 是前端展示问题，稍后刷新即可。',
    '',
    '</details>',
    '',
    '<details><summary><b>Claude Code 报 401 / Unauthorized？</b></summary>',
    '',
    '按顺序排查：Base URL 是否误加了 `/v1`（Anthropic 协议不要加）、Key 是否复制完整、模型名是否在站内可用清单里、当前客户端是否属于该站支持的客户端。',
    '',
    '</details>',
    '',
    '<details><summary><b>请求返回 400 content blocked？</b></summary>',
    '',
    '部分站点只放行中 / 英 / 法 / 德 / 俄，提示词里混入其它语言会被上游拦截，换语言重试即可。',
    '',
    '</details>',
    '',
    '<details><summary><b>之前登录过 Claude Pro / Max，切过来会冲突吗？</b></summary>',
    '',
    '会。环境变量优先级高于订阅登录，想切回官方订阅就 `unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL` 后重开终端。',
    '',
    '</details>',
    '',
    tailFooter(meta, sites),
  ].join('\n');
}

function tailFooter(meta, sites) {
  return [
    '## 🤝 收录新的福利站',
    '',
    '发现好用的公益站 / 中转站？两种方式：',
    '',
    `- 提 [Issue](${meta.repoUrl}/issues/new?template=new-site.yml) 填个表单，我来收录`,
    '- 或者直接 PR：往 `data/sites.json` 加一条，跑 `npm run refresh && npm run build` 后提交',
    '',
    '收录标准：**能免费拿到额度**、注册流程不套娃、站点公开接口可探测。',
    '',
    '## ⚠️ 免责声明',
    '',
    '- 本页注册链接为**邀请链接**，通过它注册双方都会获得站点发放的额度；不影响你的注册流程与额度多少。',
    '- 本仓库只做信息聚合，**与各站点无隶属关系**，不代收费用、不承诺可用性。公益站随时可能改规则、限速或关站。',
    '- 请勿把生产密钥、隐私数据、企业代码丢给来源不明的中转服务；重要项目请用官方 API。',
    '- 请遵守各站点与上游模型服务商的使用条款，禁止批量注册、刷量、转售额度等行为，封号自负。',
    '- 页面上的额度 / 模型 / 价格由脚本自动抓取，仅代表抓取那一刻的状态，**一切以站内实时公示为准**。',
    '',
    '---',
    '',
    `<p align="center"><b>觉得有用点个 ⭐ Star</b>，福利站有变动时这里会自动更新。</p>`,
    '',
    `<sub>关键词：${(meta.keywords ?? []).join(' · ')}</sub>`,
    '',
    `<!-- 本文件由 scripts/build.mjs 自动生成，请修改 data/sites.json 或 scripts/lib/render-readme.mjs -->`,
  ].join('\n');
}
