# 贡献指南

这个仓库只有一条铁律：**README.md 和 docs/index.html 是生成物，不要手改。**
所有内容都来自 `data/sites.json`，改完跑一遍脚本即可。

## 加一个新站点

1. 在 `data/sites.json` 的 `sites` 数组里追加一条：

```jsonc
{
  "id": "example",                       // 唯一标识，会用在 Codex provider 名里
  "name": "Example",
  "subtitle": "一句话卖点",
  "recommended": false,                  // true 会被标成「首推」
  "dailyBonus": "签到 $10/天",           // 可选：站点接口不暴露签到开关时的兜底文案
  "signupUrl": "https://example.com/register?aff=xxx",
  "homeUrl": "https://example.com",
  "docsUrl": "https://example.com/docs",
  "statusApi": "https://example.com/api/status",   // New API / One API 系都有
  "pricingApi": "https://example.com/api/pricing", // 需登录就填 null
  "mirrors": [{ "label": "备用域名", "homeUrl": "...", "signupUrl": "..." }],
  "tags": ["公益站", "免费额度"],
  "highlights": ["卖点一", "卖点二"],
  "endpoints": {
    "anthropic": "https://example.com",     // Claude Code 用，末尾不要 /v1
    "openai": "https://example.com/v1"      // Codex / SDK 用
  },
  "register": { "methods": ["GitHub OAuth"], "requirements": ["注意事项"] },
  "earnMore": ["每日签到"],
  "caveats": ["风险提示"],
  "community": []
}
```

2. 重新生成并自检：

```bash
npm test          # 单测：抓取失败时的合并逻辑（不联网）
npm run refresh   # 抓 /api/status 与 /api/pricing，写入 data/live.json
npm run build     # 重新生成 README.md 与 docs/index.html
npm run check     # 确认新链接可访问
```

3. 提交时把 `data/sites.json`、`data/live.json`、`README.md`、`docs/` 一起带上。

## 改版式 / 改文案

- README 的结构在 [`scripts/lib/render-readme.mjs`](scripts/lib/render-readme.mjs)
- 落地页结构在 [`scripts/lib/render-html.mjs`](scripts/lib/render-html.mjs)，样式在 [`docs/assets/style.css`](docs/assets/style.css)（这个是手写文件，可以直接改）
- 抓取字段的解析在 [`scripts/lib/newapi.mjs`](scripts/lib/newapi.mjs)
- 抓取失败时的降级策略在 [`scripts/lib/merge.mjs`](scripts/lib/merge.mjs)：内容字段沿用上一次成功的快照，`online` 以注册页能否访问为准（接口被 Cloudflare 拦不等于站点挂了），超过 48 小时还没抓到新数据才在页面上标注。改这里请一并跑 `npm test`。

改完同样跑 `npm run build`，把生成物一起提交，CI 才不会又把它刷回去。

## 收录标准

- 能**免费**拿到额度，注册流程不强制付费、不套娃
- 有可探测的公开接口（能自动更新的站点才好长期维护）
- 不收录纯付费中转、需要邀请码倒卖的站点

## 第一次推到 GitHub

1. 把 `data/sites.json` 里 `meta.repoUrl` / `meta.pagesUrl` 换成你自己的用户名，重新 `npm run build`。
2. 建好空仓库后推上去：

```bash
git remote add origin https://github.com/panxunying/ai-coding-welfare.git
git branch -M main
git push -u origin main
```

3. 仓库 Settings → Pages → Source 选 **Deploy from a branch**，分支 `main`、目录 `/docs`，保存后落地页就上线了。
4. Settings → Actions → General → Workflow permissions 勾 **Read and write permissions**，否则定时刷新的自动提交会被拒。
5. 仓库简介与 Topics 建议填上 `claude-code`、`codex`、`free-api`、`new-api` 之类的关键词，这是 GitHub 站内搜索的主要抓手。

## 一点分寸

推广页面写实话就够了：额度、门槛、限制照抄站点公示，不夸大、不承诺稳定性。
公益站是别人自掏腰包做的，别引导批量注册和刷额度——把站刷没了大家都用不上。
