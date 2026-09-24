/** 付费套餐独立于 credits：月费和请求量估算不参与免费额度合计。 */
import { esc } from './layout.mjs';

export function subscriptionPlan(site) {
  const s = site?.subscription;
  if (!s) return null;
  return {
    ...s,
    price: `$${s.monthlyUsd}/月`,
    label: `${s.name}套餐 $${s.monthlyUsd}/月`,
    listPrice: s.listMonthlyUsd != null ? `$${s.listMonthlyUsd}/月` : null,
    window: `每 ${s.windowHours} 小时`,
    estimates: s.estimates.map((e) => ({ ...e, amount: `≈${e.requests.toLocaleString('en-US')} 次` })),
    note: '官网估算，共享额度按模型折算，各模型次数不可相加；实际用量以站内为准。',
  };
}

/** 卡片与详情页复用同一块价量信息，避免只把卖点藏在长段落里。 */
export function renderSubscription(site) {
  const s = subscriptionPlan(site);
  if (!s) return '';
  return `<div class="subscription" role="group" aria-label="${esc(s.name)} 套餐价格与用量">
    <p class="subscription-price"><b>${esc(s.label)}</b>${s.listPrice ? ` <span>官网标价 ${esc(s.listPrice)}</span>` : ''}</p>
    <p class="subscription-window">${esc(s.window)} · 官网请求量估算</p>
    <dl class="kv">${s.estimates.map((e) => `<dt>${esc(e.model)}</dt><dd><b>${esc(e.amount)}</b></dd>`).join('')}</dl>
    <p class="subscription-note">${esc(s.note)}<br><a href="${esc(s.sourceUrl)}" target="_blank" rel="noopener">官网定价</a> · ${esc(s.verifiedAt)} 核对</p>
  </div>`;
}
