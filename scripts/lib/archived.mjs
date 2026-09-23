/**
 * 归档站点（已挂掉 / 长期下线）的统一口径。
 *
 * 「挂了」和「停注」是两回事，页面必须分开说：
 *   停注（signup.mjs）—— 站点还活着，只是不收新用户；
 *   归档（这里）       —— 用户反馈不可用或维护者确认下线，人工移出推荐列表；不是自动探测判定。
 *
 * 归档站的处理原则：
 *   - 不进主列表、不算任何「首日可得 / 全注册约」合计，死了的站不许再吆喝额度；
 *   - 移到页面底部的「历史挂掉的站点」区块，留名 + 挂掉时间 + 原因，
 *     这是这仓库的诚实记录：曾收录过、后来死了，比悄悄删掉更有信息量；
 *   - refresh / check / quickstart 不再探测它，CI 不为一个死站天天报警。
 *
 * sites.json 里的登记方式：
 *   "archived": { "at": "2026-09-21", "reason": "……" }
 * at 是归档日期；reason 记录归档依据，不能仅凭 WAF 403 就断言域名失效。
 * 旧详情地址生成 noindex 归档说明页，不继续展示过期注册链接和配置。
 */

export const isArchived = (site) => Boolean(site?.archived);

/** 主列表 = 未归档的站点 */
export const activeSites = (sites) => (sites ?? []).filter((s) => !isArchived(s));

/** 坟场 = 已归档的站点，按挂掉日期倒序，最近死的排前面 */
export const archivedSites = (sites) =>
  (sites ?? [])
    .filter(isArchived)
    .sort((a, b) => String(b.archived?.at ?? '').localeCompare(String(a.archived?.at ?? '')));

/** 坟场条目的展示日期：没填 at 就不显示日期，别编一个 */
export const archivedAt = (site) => site?.archived?.at || null;
export const archivedReason = (site) => site?.archived?.reason || '站点已不可用';
