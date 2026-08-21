<h1 align="center">AI Coding 福利站导航</h1>

<p align="center">免费额度 · 白嫖 Claude Code / Codex / Cursor 的中转与公益站合集</p>

<p align="center">
  <img src="https://img.shields.io/badge/%E6%94%B6%E5%BD%95%E7%AB%99%E7%82%B9-2%20%E4%B8%AA-blue" alt="收录站点">
  <img src="https://img.shields.io/badge/%E5%9C%A8%E7%BA%BF-2%2F2-brightgreen" alt="在线">
  <img src="https://img.shields.io/badge/%E9%A6%96%E6%97%A5%E5%8F%AF%E5%BE%97-%E6%9C%80%E9%AB%98%20%24175-success" alt="首日可得">
  <img src="https://img.shields.io/badge/%E6%95%B0%E6%8D%AE%E6%9B%B4%E6%96%B0-2026--08--21%2009.19%20UTC-informational" alt="数据更新">
</p>

<p align="center">
  <a href="https://agentrouter.org/register?aff=szt3"><b>AgentRouter 注册</b></a> ·
  <a href="https://api.justwoker.icu/sign-up?aff=VTrz"><b>JustDoWork 注册</b></a>
</p>

---

## 🚀 一分钟上车

| 站点 | 状态 | 首日可得 | 额度构成 | 之后每天 | 兼容协议 | 模型 | 注册 |
| :-- | :--: | :--: | :-- | :--: | :--: | :--: | :--: |
| **AgentRouter** 🔥 | 🟢 在线 | **$175** | 注册 $100 + 本页邀请 $50 + 首签 $25 | $25/天 | Anthropic + OpenAI | 3 个可查 | [点此注册 →](https://agentrouter.org/register?aff=szt3) |
| **JustDoWork** | 🟢 在线 | **≈$92** | 注册 $70 + 首签 ≈$22 | ≈$22/天 | Anthropic + OpenAI | 需登录查看 | [点此注册 →](https://api.justwoker.icu/sign-up?aff=VTrz) |

> 「首日可得」= 注册基础额度 + 本页邀请链接额度 + 当天签到额度；模型、价格、在线状态由脚本抓取站点公开接口自动生成，最后更新：`2026-08-21 09:19 UTC`。
>
> 2 个站全注册一遍，第一天手上大约有 **$267** 额度可用。

**只想快点用上 Claude Code？** 三步：

1. 点上表的注册链接 → GitHub 授权登录（额度是按邀请链接发放的，别走裸链）
2. 后台「令牌 / API Keys」新建一个 Key
3. 跑一键脚本，或手抄下面对应站点的环境变量

```bash
# 交互式写好 Claude Code 的环境变量（macOS / Linux）
bash scripts/quickstart.sh
```

```powershell
# Windows PowerShell
powershell -ExecutionPolicy Bypass -File scripts/quickstart.ps1
```

## 📚 站点详情


### 🟢 AgentRouter 🔥 首推

> AI Coding 公益站 · 注册即送额度，签到每日续命

<a href="https://agentrouter.org/register?aff=szt3"><img src="https://img.shields.io/badge/%E7%AB%8B%E5%8D%B3%E6%B3%A8%E5%86%8C-AgentRouter-brightgreen?style=for-the-badge" alt="注册 AgentRouter"></a>

**为什么值得注册**

- 注册即送 $100，从本页邀请链接进入再多 $50，不需要充值、不需要信用卡
- 每日签到再领 $25，首日合计最高 $175，长期白嫖不断供
- 同时提供 Anthropic 与 OpenAI 两种兼容协议，Claude Code / Codex / Cline / Cursor 都能直连
- 官方文档覆盖十几种客户端，照着抄配置即可

**能拿多少额度**

- 注册即送：**$100**
- 从本页邀请链接注册额外：**$50**（站点接口实测一致）
- 每日签到：**$25/天**（长期续命的关键）
- 首日合计：**$175**　（注册 $100 + 本页邀请 $50 + 首签 $25）

**实时数据**（自动抓取站点公开接口）

- 站点名称：**Agent Router**
- 面板版本：`init-20260820-c6931bb5`
- 邀请他人可得：**$150**
- 登录方式：GitHub / LinuxDO
- 接口延迟：309 ms

**镜像 / 备用入口**

- 大陆备用域名：<https://ps.air-outer.com> · [从备用域名注册](https://ps.air-outer.com/register?aff=szt3)

**当前可用模型**

| 模型 | 倍率 | 输入 / 1M tokens | 输出 / 1M tokens | 协议 |
| :-- | :--: | :--: | :--: | :--: |
| `claude-opus-4-8` | 1.5 | $3 | $15 | anthropic / openai |
| `claude-opus-5` | 1 | $2 | $10 | anthropic / openai |
| `gpt-5.6-sol` | 2 | $4 | $20 | openai |

<sub>倍率 1 ≈ $2 / 1M tokens，输出价 = 倍率 × 补全倍率 × $2；以站内实时价格为准。</sub>

**注册要求**

- 务必从本页的邀请链接进入注册，否则拿不到邀请额度
- 注册成功后退出再重新登录一次，额度才会显示到账

**接入配置**

<details open><summary><b>Claude Code</b>（Anthropic 兼容，Base URL 不带 <code>/v1</code>）</summary>

```bash
# macOS / Linux
export ANTHROPIC_BASE_URL=https://agentrouter.org
export ANTHROPIC_AUTH_TOKEN=你在站点后台创建的 Key
export ANTHROPIC_MODEL=claude-opus-5
npm install -g @anthropic-ai/claude-code@latest && claude
```

```powershell
# Windows PowerShell
$env:ANTHROPIC_BASE_URL = "https://agentrouter.org"
$env:ANTHROPIC_AUTH_TOKEN = "你在站点后台创建的 Key"
$env:ANTHROPIC_MODEL = "claude-opus-5"
claude
```

</details>

<details><summary><b>Codex CLI</b>（OpenAI 兼容，写入 <code>~/.codex/config.toml</code>）</summary>

```toml
model = "gpt-5.6-sol"
model_provider = "agentrouter"

[model_providers.agentrouter]
name = "AgentRouter"
base_url = "https://agentrouter.org/v1"
env_key = "AGENTROUTER_API_KEY"
wire_api = "chat"
```

</details>

<details><summary><b>OpenAI SDK / Cherry Studio / Cursor 等通用客户端</b></summary>

```python
from openai import OpenAI

client = OpenAI(api_key="你的 Key", base_url="https://agentrouter.org/v1")
resp = client.chat.completions.create(model="gpt-5.6-sol", messages=[{"role": "user", "content": "ping"}])
print(resp.choices[0].message.content)
```

通用客户端只需填两项：**Base URL** = `https://agentrouter.org/v1`，**API Key** = 站点后台创建的 Key。

</details>

<details><summary><b>连通性自测</b></summary>

```bash
curl -s https://agentrouter.org/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"gpt-5.6-sol","messages":[{"role":"user","content":"只回复 OK"}]}'
```

</details>

**如何继续拿额度**

- 每日签到领额度（登录后台点签到）
- 绑定邮箱参与官方不定期抽奖兑换码
- 邀请他人注册，邀请人同样得额度

**⚠️ 使用前必读**

- 官方定位是公益站，不承诺 SLA、不支持充值；上游波动时可能临时停用某些模型
- 请求内容仅支持中 / 英 / 法 / 德 / 俄，其它语言会被拦截并返回 400
- 严禁批量注册、刷量、转售额度、虚假邀请，官方会直接封号

**官方渠道**

- Discord: https://discord.gg/aYq5B4RW3
- X: https://x.com/AgentRouter_0
- 邮箱: agent_router_org@163.com

<details><summary><b>站点最新公告</b>（自动同步）</summary>

- `2026-07-28` 📢 备用域名正式上线 为进一步提升服务可用性，本站现已推出备用域名：🔗 https://ps.air-outer.com 访问不了原域名的中国大陆用户可使用此域名，备用域名支持 API 接口调用 与 官网访问，与原域名功能完全一致。 原域名 https://agentrouter.org 可继续使用。
- `2026-07-16` 🎁 官方社区平台汇总 欢迎加入或关注以下官方渠道，获取最新动态与支持： 📱 QQ 群 · 1群：1054950616 · 2群：1091388133 · 3群：700583832 💬 Discord https://discord.gg/SXEhNMXsn 🐦 X（Twitter） https://x.com/AgentRouter_0
- `2026-06-30` 📢 不当使用行为封禁说明 为维护服务公平，平台禁止以下不当行为： · 批量注册/获取额度 · 自动化刷量套利 · 转售、共享账号及额度 · 虚假邀请欺诈 · 恶意绕过限制、干扰服务 违规账号将封禁，名单见 Discord 🚫blocked-history 频道。 申诉请联系：agent_router_org@163.com

</details>

---

### 🟢 JustDoWork

> New API 中转站 · GitHub 一键登录，支持签到与绘图

<a href="https://api.justwoker.icu/sign-up?aff=VTrz"><img src="https://img.shields.io/badge/%E7%AB%8B%E5%8D%B3%E6%B3%A8%E5%86%8C-JustDoWork-brightgreen?style=for-the-badge" alt="注册 JustDoWork"></a>

**为什么值得注册**

- 注册即得约 $70 额度，GitHub 一键登录，不用充值
- 基于开源 New API 面板，控制台熟悉、日志与用量一目了然
- 每日签到再领约 $22，首日合计约 $92
- 支持对话之外的绘图 / 异步任务接口
- 一键把 Key 推送到 Cherry Studio、DeepChat、CC Switch 等客户端

**能拿多少额度**

- 注册即送：**$70**
- 每日签到：**≈$22/天**（长期续命的关键）
- 首日合计：**≈$92**　（注册 $70 + 首签 ≈$22）

**实时数据**（自动抓取站点公开接口）

- 站点名称：**JustDoWork**
- 面板版本：`test-rc23-20260816-f7eb9fe`
- 每日签到：✅
- 开放注册：✅
- 登录方式：GitHub / 账号密码
- GitHub 账号需满 **365 天**
- 接口延迟：4584 ms

> 该站模型清单需登录后台查看，注册后在「模型价格」页确认。

**注册要求**

- 已关闭账号密码注册，只能用 GitHub 授权登录
- GitHub 账号注册满 365 天才允许绑定，小号会被拒绝
- 注册页有 Turnstile 人机校验，需要能正常加载 Cloudflare 脚本
- 务必从本页邀请链接进入，注册后邀请额度才会算到位

**接入配置**

<details open><summary><b>Claude Code</b>（Anthropic 兼容，Base URL 不带 <code>/v1</code>）</summary>

```bash
# macOS / Linux
export ANTHROPIC_BASE_URL=https://api.justwoker.icu
export ANTHROPIC_AUTH_TOKEN=你在站点后台创建的 Key
export ANTHROPIC_MODEL=<登录后台查看可用模型名>
npm install -g @anthropic-ai/claude-code@latest && claude
```

```powershell
# Windows PowerShell
$env:ANTHROPIC_BASE_URL = "https://api.justwoker.icu"
$env:ANTHROPIC_AUTH_TOKEN = "你在站点后台创建的 Key"
$env:ANTHROPIC_MODEL = "<登录后台查看可用模型名>"
claude
```

</details>

<details><summary><b>Codex CLI</b>（OpenAI 兼容，写入 <code>~/.codex/config.toml</code>）</summary>

```toml
model = "<登录后台查看可用模型名>"
model_provider = "justdowork"

[model_providers.justdowork]
name = "JustDoWork"
base_url = "https://api.justwoker.icu/v1"
env_key = "JUSTDOWORK_API_KEY"
wire_api = "chat"
```

</details>

<details><summary><b>OpenAI SDK / Cherry Studio / Cursor 等通用客户端</b></summary>

```python
from openai import OpenAI

client = OpenAI(api_key="你的 Key", base_url="https://api.justwoker.icu/v1")
resp = client.chat.completions.create(model="<登录后台查看可用模型名>", messages=[{"role": "user", "content": "ping"}])
print(resp.choices[0].message.content)
```

通用客户端只需填两项：**Base URL** = `https://api.justwoker.icu/v1`，**API Key** = 站点后台创建的 Key。

</details>

<details><summary><b>连通性自测</b></summary>

```bash
curl -s https://api.justwoker.icu/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"model":"<登录后台查看可用模型名>","messages":[{"role":"user","content":"只回复 OK"}]}'
```

</details>

**如何继续拿额度**

- 每日签到领约 $22
- 关注站点公告获取活动兑换码

**⚠️ 使用前必读**

- 模型清单与价格需要登录后台才能查看，本页不做承诺
- 中转站上游随时可能调整，请以站内实际价格与可用模型为准

---

## 🧰 仓库里有什么

| 文件 | 作用 |
| :-- | :-- |
| [`data/sites.json`](data/sites.json) | 唯一数据源：站点信息与推广链接 |
| [`data/live.json`](data/live.json) | 自动抓取的实时快照（额度 / 模型 / 在线状态） |
| [`scripts/refresh.mjs`](scripts/refresh.mjs) | 抓取站点公开接口 |
| [`scripts/lib/merge.mjs`](scripts/lib/merge.mjs) | 抓取失败时沿用上次快照，页面不会被刷空 |
| [`scripts/lib/credits.mjs`](scripts/lib/credits.mjs) | 额度口径：注册 + 邀请 + 签到 = 首日可得 |
| [`scripts/build.mjs`](scripts/build.mjs) | 用数据重新生成 README 与落地页 |
| [`scripts/check.mjs`](scripts/check.mjs) | 链接与站点健康检查，失效即 CI 报警 |
| [`scripts/test.mjs`](scripts/test.mjs) | 合并逻辑与额度口径的单测（零依赖，`npm test`） |
| [`scripts/quickstart.sh`](scripts/quickstart.sh) / [`.ps1`](scripts/quickstart.ps1) | 交互式配置 Claude Code 环境变量 |

本地跑一遍：

```bash
npm test          # 单测（不联网）
npm run refresh   # 抓最新数据
npm run build     # 重新生成 README + docs/
npm run check     # 校验链接是否还活着
```

## ❓ 常见问题

<details><summary><b>注册完为什么看不到额度？</b></summary>

公益站的额度多在登录时结算，**退出登录再重新登录一次**通常就会到账；余额偶尔显示 $0 是前端展示问题，稍后刷新即可。

</details>

<details><summary><b>Claude Code 报 401 / Unauthorized？</b></summary>

按顺序排查：Base URL 是否误加了 `/v1`（Anthropic 协议不要加）、Key 是否复制完整、模型名是否在站内可用清单里、当前客户端是否属于该站支持的客户端。

</details>

<details><summary><b>请求返回 400 content blocked？</b></summary>

部分站点只放行中 / 英 / 法 / 德 / 俄，提示词里混入其它语言会被上游拦截，换语言重试即可。

</details>

<details><summary><b>之前登录过 Claude Pro / Max，切过来会冲突吗？</b></summary>

会。环境变量优先级高于订阅登录，想切回官方订阅就 `unset ANTHROPIC_BASE_URL ANTHROPIC_AUTH_TOKEN ANTHROPIC_MODEL` 后重开终端。

</details>

## 🤝 收录新的福利站

发现好用的公益站 / 中转站？两种方式：

- 提 [Issue](https://github.com/panxunying/ai-coding-welfare/issues/new?template=new-site.yml) 填个表单，我来收录
- 或者直接 PR：往 `data/sites.json` 加一条，跑 `npm run refresh && npm run build` 后提交

收录标准：**能免费拿到额度**、注册流程不套娃、站点公开接口可探测。

## ⚠️ 免责声明

- 本页注册链接为**邀请链接**，通过它注册双方都会获得站点发放的额度；不影响你的注册流程与额度多少。
- 本仓库只做信息聚合，**与各站点无隶属关系**，不代收费用、不承诺可用性。公益站随时可能改规则、限速或关站。
- 请勿把生产密钥、隐私数据、企业代码丢给来源不明的中转服务；重要项目请用官方 API。
- 请遵守各站点与上游模型服务商的使用条款，禁止批量注册、刷量、转售额度等行为，封号自负。
- 页面上的额度 / 模型 / 价格由脚本自动抓取，仅代表抓取那一刻的状态，**一切以站内实时公示为准**。

---

<p align="center"><b>觉得有用点个 ⭐ Star</b>，福利站有变动时这里会自动更新。</p>

<sub>关键词：Claude Code 免费 · Claude Code 中转 · Codex 中转 · AI API 中转站 · 公益站 · 免费 API 额度 · claude-opus-5 API · New API · AgentRouter</sub>

<!-- 本文件由 scripts/build.mjs 自动生成，请修改 data/sites.json 或 scripts/lib/render-readme.mjs -->