/**
 * 抓取 New API / One API 系列站点的公开信息（零依赖，Node 18+ 自带 fetch）。
 *
 * 只读取站点自己公开暴露的接口：
 *   GET /api/status   —— 站名、版本、注册方式、邀请额度、公告
 *   GET /api/pricing  —— 模型清单与倍率（部分站点要求登录，拿不到就跳过）
 */

const UA = 'ai-coding-welfare/1.0 (+https://github.com/)';
const TIMEOUT_MS = 20_000;

/** 带超时的 JSON 拉取，失败返回 { ok:false }，不抛异常。 */
export async function fetchJson(url) {
  if (!url) return { ok: false, error: 'no url' };
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { 'user-agent': UA, accept: 'application/json' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const ms = Date.now() - started;
    const text = await res.text();
    if (!res.ok) return { ok: false, status: res.status, ms, error: `HTTP ${res.status}` };
    try {
      return { ok: true, status: res.status, ms, json: JSON.parse(text) };
    } catch {
      return { ok: false, status: res.status, ms, error: 'invalid json' };
    }
  } catch (err) {
    return { ok: false, ms: Date.now() - started, error: err.name === 'AbortError' ? 'timeout' : String(err.message || err) };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * New API 的计价约定：倍率 1 == $0.002 / 1K tokens == $2 / 1M tokens。
 * 输出价 = 倍率 * 补全倍率 * $2 / 1M tokens。
 */
export const RATIO_USD_PER_MTOK = 2;

function money(n) {
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 1000) / 1000;
}

function normalizeAnnouncements(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((a) => a && typeof a.content === 'string' && a.content.trim())
    .slice(0, 5)
    .map((a) => ({
      id: a.id ?? null,
      date: typeof a.publishDate === 'string' ? a.publishDate.slice(0, 10) : null,
      text: a.content.replace(/\s*\n\s*/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, 220),
    }));
}

function normalizeModels(pricing) {
  if (!Array.isArray(pricing)) return [];
  return pricing
    .filter((m) => m && m.model_name)
    .map((m) => {
      const ratio = Number(m.model_ratio);
      const compl = Number(m.completion_ratio);
      const fixed = Number(m.model_price) > 0;
      return {
        name: String(m.model_name),
        ratio: Number.isFinite(ratio) ? ratio : null,
        completionRatio: Number.isFinite(compl) ? compl : null,
        fixedPrice: fixed ? Number(m.model_price) : null,
        inputPerMTok: fixed ? null : money(ratio * RATIO_USD_PER_MTOK),
        outputPerMTok: fixed ? null : money(ratio * compl * RATIO_USD_PER_MTOK),
        groups: Array.isArray(m.enable_groups) ? m.enable_groups : [],
        protocols: Array.isArray(m.supported_endpoint_types) ? m.supported_endpoint_types : [],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** 版本号比较用：从模型名里抽出数字序列，claude-opus-5 → [5]，claude-opus-4-8 → [4,8] */
function versionKey(name) {
  return (name.match(/\d+/g) ?? []).map(Number);
}

/** 在候选模型里挑「版本最新」的一个，用于示例配置与一键脚本的默认值 */
export function pickPreferred(models, re) {
  const hits = (models ?? []).filter((m) => re.test(m.name));
  if (!hits.length) return null;
  return hits.sort((a, b) => {
    const [x, y] = [versionKey(a.name), versionKey(b.name)];
    for (let i = 0; i < Math.max(x.length, y.length); i += 1) {
      const d = (y[i] ?? -1) - (x[i] ?? -1);
      if (d) return d;
    }
    return a.name.localeCompare(b.name);
  })[0].name;
}

/** 把 /api/status 与 /api/pricing 合成一条站点实时快照。 */
export async function probeSite(site) {
  const [statusRes, pricingRes] = await Promise.all([
    fetchJson(site.statusApi),
    site.pricingApi ? fetchJson(site.pricingApi) : Promise.resolve({ ok: false, error: 'not public' }),
  ]);

  const snapshot = {
    id: site.id,
    checkedAt: new Date().toISOString(),
    online: Boolean(statusRes.ok),
    latencyMs: statusRes.ms ?? null,
    error: statusRes.ok ? null : statusRes.error ?? null,
    systemName: null,
    version: null,
    registerOpen: null,
    passwordRegister: null,
    checkinEnabled: null,
    loginMethods: [],
    githubMinAccountAgeDays: null,
    quotaPerUnit: null,
    inviteeBonusUsd: null,
    inviterBonusUsd: null,
    topupEnabled: null,
    announcements: [],
    models: normalizeModels(pricingRes.ok ? pricingRes.json?.data : null),
    modelsSource: pricingRes.ok ? 'public-api' : 'login-required',
  };

  const d = statusRes.ok ? statusRes.json?.data ?? {} : {};
  const per = Number(d.quota_per_unit) || null;
  Object.assign(snapshot, {
    systemName: d.system_name ?? null,
    version: d.version ?? null,
    registerOpen: typeof d.register_enabled === 'boolean' ? d.register_enabled : null,
    passwordRegister: typeof d.password_register_enabled === 'boolean' ? d.password_register_enabled : null,
    checkinEnabled: typeof d.checkin_enabled === 'boolean' ? d.checkin_enabled : null,
    githubMinAccountAgeDays: Number(d.github_minimum_account_age_days) || null,
    quotaPerUnit: per,
    inviteeBonusUsd: per && Number(d.quota_for_invitee) ? money(Number(d.quota_for_invitee) / per) : null,
    inviterBonusUsd: per && Number(d.quota_for_inviter) ? money(Number(d.quota_for_inviter) / per) : null,
    topupEnabled: typeof d.enable_online_topup === 'boolean' ? d.enable_online_topup : null,
    announcements: normalizeAnnouncements(d.announcements),
    loginMethods: [
      d.github_oauth && 'GitHub',
      d.linuxdo_oauth && 'LinuxDO',
      d.discord_oauth && 'Discord',
      d.telegram_oauth && 'Telegram',
      d.wechat_login && '微信',
      d.oidc_enabled && 'OIDC',
      d.passkey_login && 'Passkey',
      d.password_login_enabled && '账号密码',
    ].filter(Boolean),
  });

  // 给 README / 落地页 / 一键脚本用的默认模型名，抓不到就留 null 由调用方兜底
  snapshot.defaults = {
    claude: pickPreferred(snapshot.models, /^claude/i),
    openai: pickPreferred(snapshot.models, /^(gpt|o\d|glm|deepseek|qwen|kimi)/i) ?? snapshot.models[0]?.name ?? null,
  };

  return snapshot;
}
