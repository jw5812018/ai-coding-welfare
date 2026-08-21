/**
 * 额度口径的唯一出处。
 *
 * 站点接口只暴露「邀请额度」（quota_for_invitee），注册基础额度和签到额度是站内公示、
 * 接口拿不到，只能登记在 data/sites.json 的 credits 里。页面上要展示的是用户实际关心的
 * 「首日能拿多少」= 注册 + 邀请 + 首次签到，所以统一在这里算，避免三个渲染器各写一套。
 */

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);

export function creditPlan(site, snap) {
  const c = site?.credits ?? {};
  const signup = num(c.signup);
  const invite = num(c.invite);
  const daily = num(c.dailyCheckin);
  const approx = Boolean(c.approx);

  const parts = [signup, invite].filter((n) => n != null);
  const base = parts.length ? parts.reduce((a, b) => a + b, 0) : null;
  const firstDay = base != null || daily != null ? (base ?? 0) + (daily ?? 0) : null;

  return {
    signup,
    invite,
    daily,
    approx,
    base,
    firstDay,
    // 接口实测的邀请额度，用来和登记值对账（build 时不一致会告警）
    apiInvite: snap?.inviteeBonusUsd ?? null,
    inviter: snap?.inviterBonusUsd ?? null,
  };
}

/** $175 / ≈$92 / null */
export function usd(n, approx = false) {
  if (n == null) return null;
  return `${approx ? '≈' : ''}$${n}`;
}

/** 「注册 $100 + 本页邀请 $50 + 首签 $25」 */
export function breakdown(plan) {
  const items = [
    plan.signup != null ? `注册 ${usd(plan.signup)}` : null,
    plan.invite != null ? `本页邀请 ${usd(plan.invite)}` : null,
    plan.daily != null ? `首签 ${usd(plan.daily, plan.approx)}` : null,
  ].filter(Boolean);
  return items.length > 1 ? items.join(' + ') : null;
}

/** 登记值与接口实测值不一致时提醒维护者更新，别让页面上的数字烂掉 */
export function auditCredits(sites, live) {
  const byId = new Map((live?.sites ?? []).map((s) => [s.id, s]));
  const warns = [];
  for (const site of sites) {
    const plan = creditPlan(site, byId.get(site.id));
    if (plan.invite != null && plan.apiInvite != null && plan.invite !== plan.apiInvite) {
      warns.push(`${site.name}：sites.json 登记邀请额度 $${plan.invite}，但站点接口现在返回 $${plan.apiInvite}`);
    }
    if (plan.firstDay == null) warns.push(`${site.name}：credits 没填，页面只能显示「站内公示」`);
  }
  return warns;
}
