/**
 * 把「这一次的探测结果」和「上一次的快照」合成一条站点数据。
 *
 * 为什么需要它：公益站前面普遍挂 Cloudflare，CI 的机房 IP 偶发拿到挑战页，
 * 一次失败就会把 systemName / 邀请额度 / 模型清单全清成 null，
 * 页面随即退化成「🔴 异常 + 登录后台查看」。这里做字段级合并：
 *   - 探测元信息（时间、延迟、错误）永远用新值
 *   - 内容字段只在「这次真的探到了」时才覆盖旧值
 *   - online 以注册页可访问性为准：接口被拦不等于站点挂了
 */
import { pickPreferred } from './newapi.mjs';

/** 探测结果本身，必须反映这一次的真实情况，不能沿用旧值 */
export const FRESH_ALWAYS = new Set([
  'id',
  'checkedAt',
  'apiOk',
  'pricingOk',
  'latencyMs',
  'error',
  'signup',
  'mirrors',
]);

/** 值是否「有内容」：null / '' / [] / 全空对象都算没抓到 */
export function meaningful(v) {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'object') return Object.values(v).some(meaningful);
  return true;
}

export function mergeSnapshot(fresh, old) {
  const out = { ...(old ?? {}) };
  const reused = [];

  for (const [k, v] of Object.entries(fresh)) {
    if (FRESH_ALWAYS.has(k) || meaningful(v) || !meaningful(old?.[k])) out[k] = v;
    else reused.push(k);
  }

  // 模型清单是页面主体内容，沿用旧数据时如实标注来源
  if (reused.includes('models')) out.modelsSource = 'cached';
  // 默认模型名按「最终生效的模型清单」重算，否则示例配置会退化成占位符
  out.defaults = {
    claude: pickPreferred(out.models, /^claude/i),
    openai: pickPreferred(out.models, /^(gpt|o\d|glm|deepseek|qwen|kimi)/i) ?? out.models?.[0]?.name ?? null,
  };
  out.online = Boolean(fresh.apiOk || fresh.signup?.ok);
  out.dataStale = reused.length > 0;
  out.staleFrom = reused.length ? old?.checkedAt ?? null : null;
  out.staleFields = reused;
  return out;
}
