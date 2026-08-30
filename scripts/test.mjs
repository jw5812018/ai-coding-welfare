#!/usr/bin/env node
/**
 * 零依赖单测：node scripts/test.mjs
 * 盯的是线上真实踩过的坑——CI 机房 IP 被 Cloudflare 拦时，页面不能退化成「异常 + 无数据」。
 */
import assert from 'node:assert/strict';
import { mergeSnapshot, meaningful } from './lib/merge.mjs';
import { pickPreferred, staleHours, STALE_WARN_HOURS, blankSnapshot, looksFiltered } from './lib/newapi.mjs';
import { creditPlan, usd, breakdown, perDay, auditCredits, usdTotals, othersNote } from './lib/credits.mjs';
import { PANELS, probeSite } from './lib/panels.mjs';

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    console.error(`  ✘ ${name}\n    ${err.message}`);
    process.exitCode = 1;
  }
}

const HOUR = 3_600_000;
const iso = (msAgo) => new Date(Date.now() - msAgo).toISOString();

const OLD_GOOD = {
  id: 'agentrouter',
  checkedAt: iso(6 * HOUR),
  apiOk: true,
  pricingOk: true,
  latencyMs: 378,
  error: null,
  systemName: 'Agent Router',
  version: 'init-20260820-c6931bb5',
  registerOpen: true,
  checkinEnabled: null,
  loginMethods: ['GitHub', 'LinuxDO'],
  quotaPerUnit: 500000,
  inviteeBonusUsd: 50,
  inviterBonusUsd: 150,
  announcements: [{ id: 1, date: '2026-08-20', text: '公告' }],
  models: [{ name: 'claude-opus-4-8' }, { name: 'claude-opus-5' }, { name: 'gpt-5.6-sol' }],
  modelsSource: 'public-api',
  signup: { status: 200, ok: true, ms: 300 },
  mirrors: [{ homeUrl: 'https://ps.air-outer.com', online: true }],
  defaults: { claude: 'claude-opus-5', openai: 'gpt-5.6-sol' },
  online: true,
};

/** 模拟 Cloudflare 挑战：HTTP 200 但不是 JSON，于是所有内容字段都是空的 */
const FRESH_BLOCKED = {
  id: 'agentrouter',
  checkedAt: iso(0),
  apiOk: false,
  pricingOk: false,
  latencyMs: 1219,
  error: 'invalid json',
  systemName: null,
  version: null,
  registerOpen: null,
  checkinEnabled: null,
  loginMethods: [],
  quotaPerUnit: null,
  inviteeBonusUsd: null,
  inviterBonusUsd: null,
  announcements: [],
  models: [],
  modelsSource: 'login-required',
  defaults: { claude: null, openai: null },
  signup: { status: 200, ok: true, ms: 412 },
  mirrors: [{ homeUrl: 'https://ps.air-outer.com', online: false }],
};

console.log('mergeSnapshot：接口被拦时保住已知数据');
{
  const m = mergeSnapshot(FRESH_BLOCKED, OLD_GOOD);
  test('站名 / 版本 / 邀请额度 沿用旧值，不会变成 null', () => {
    assert.equal(m.systemName, 'Agent Router');
    assert.equal(m.version, 'init-20260820-c6931bb5');
    assert.equal(m.inviteeBonusUsd, 50);
    assert.equal(m.inviterBonusUsd, 150);
    assert.deepEqual(m.loginMethods, ['GitHub', 'LinuxDO']);
  });
  test('模型清单沿用旧值并标注 cached', () => {
    assert.equal(m.models.length, 3);
    assert.equal(m.modelsSource, 'cached');
  });
  test('默认模型按合并后的清单重算（版本最新的赢）', () => {
    assert.equal(m.defaults.claude, 'claude-opus-5');
    assert.equal(m.defaults.openai, 'gpt-5.6-sol');
  });
  test('注册页 200 → 仍算在线，不显示「异常」', () => {
    assert.equal(m.online, true);
  });
  test('探测元信息用本次的真实结果', () => {
    assert.equal(m.apiOk, false);
    assert.equal(m.error, 'invalid json');
    assert.equal(m.latencyMs, 1219);
    assert.equal(m.checkedAt, FRESH_BLOCKED.checkedAt);
    assert.equal(m.mirrors[0].online, false);
  });
  test('标记 dataStale + staleFrom 指向旧快照时间', () => {
    assert.equal(m.dataStale, true);
    assert.equal(m.staleFrom, OLD_GOOD.checkedAt);
    assert.ok(m.staleFields.includes('systemName') && m.staleFields.includes('models'));
  });
  test('6 小时内的快照不在页面上报警', () => {
    assert.equal(staleHours(m), null);
  });
  test(`超过 ${STALE_WARN_HOURS} 小时才报警，并给出小时数`, () => {
    const long = mergeSnapshot(FRESH_BLOCKED, { ...OLD_GOOD, checkedAt: iso(72 * HOUR) });
    assert.equal(staleHours(long), 72);
  });
}

console.log('mergeSnapshot：其它路径');
test('抓取成功时新值覆盖旧值，且不标 stale', () => {
  const fresh = { ...OLD_GOOD, checkedAt: iso(0), systemName: 'Agent Router 2', inviteeBonusUsd: 30, models: [{ name: 'claude-opus-5' }] };
  const m = mergeSnapshot(fresh, OLD_GOOD);
  assert.equal(m.systemName, 'Agent Router 2');
  assert.equal(m.inviteeBonusUsd, 30);
  assert.equal(m.models.length, 1);
  assert.equal(m.modelsSource, 'public-api');
  assert.equal(m.dataStale, false);
  assert.equal(m.staleFrom, null);
});
test('status 通了但 pricing 被拦：模型沿用旧值，站名用新值', () => {
  const fresh = { ...FRESH_BLOCKED, apiOk: true, error: null, systemName: 'Agent Router', inviteeBonusUsd: 50 };
  const m = mergeSnapshot(fresh, OLD_GOOD);
  assert.equal(m.online, true);
  assert.equal(m.models.length, 3);
  assert.equal(m.modelsSource, 'cached');
  assert.equal(m.dataStale, true);
});
test('首次抓取（没有旧快照）不会因为 old 缺失而炸', () => {
  const m = mergeSnapshot(FRESH_BLOCKED, undefined);
  assert.equal(m.systemName, null);
  assert.equal(m.models.length, 0);
  assert.equal(m.dataStale, false);
  assert.equal(m.defaults.claude, null);
  assert.equal(m.online, true); // 注册页可访问
});
test('注册页也不通 → 如实标记异常', () => {
  const m = mergeSnapshot({ ...FRESH_BLOCKED, signup: { status: 0, ok: false, ms: 20000, error: 'timeout' } }, OLD_GOOD);
  assert.equal(m.online, false);
  assert.equal(m.probeBlocked, false);
});

console.log('mergeSnapshot：区分「被 WAF 拦」和「站点真挂了」');
/** CI 机房 IP 的典型样子：接口和注册页一起吃 403，本机访问同一个域名全是 200 */
const ALL_403 = { ...FRESH_BLOCKED, error: 'HTTP 403', signup: { status: 403, ok: false, ms: 210 } };

test('整站 403 且上次是在线的 → 仍算在线，标 probeBlocked', () => {
  const m = mergeSnapshot(ALL_403, OLD_GOOD);
  assert.equal(m.online, true);
  assert.equal(m.probeBlocked, true);
  assert.equal(m.systemName, 'Agent Router'); // 数据照旧沿用
  assert.equal(m.dataStale, true);
});
test('429 / 503 / 挑战页同样按被拦处理', () => {
  for (const [error, signup] of [
    ['HTTP 429', { status: 429, ok: false, ms: 90 }],
    ['HTTP 503', { status: 503, ok: false, ms: 90 }],
    ['invalid json', { status: 200, ok: false, ms: 90, error: 'invalid json' }],
  ]) {
    const m = mergeSnapshot({ ...ALL_403, error, signup }, OLD_GOOD);
    assert.equal(m.online, true, error);
    assert.equal(m.probeBlocked, true, error);
  }
});
test('超时 / 连不上 / 502 是真下线，不许拿「可能被拦」兜底', () => {
  for (const [error, signup] of [
    ['timeout', { status: 0, ok: false, ms: 20000, error: 'timeout' }],
    ['HTTP 502', { status: 502, ok: false, ms: 90 }],
    ['HTTP 404', { status: 404, ok: false, ms: 90 }],
  ]) {
    const m = mergeSnapshot({ ...ALL_403, error, signup }, OLD_GOOD);
    assert.equal(m.online, false, error);
    assert.equal(m.probeBlocked, false, error);
  }
});
test('接口被拦但注册页超时 → 混着算真下线', () => {
  const m = mergeSnapshot({ ...ALL_403, signup: { status: 0, ok: false, ms: 20000, error: 'timeout' } }, OLD_GOOD);
  assert.equal(m.online, false);
  assert.equal(m.probeBlocked, false);
});
test('旧快照超过 48 小时还是只有 403 → 不再兜底，如实标异常', () => {
  const m = mergeSnapshot(ALL_403, { ...OLD_GOOD, checkedAt: iso(72 * HOUR) });
  assert.equal(m.online, false);
  assert.equal(m.probeBlocked, false);
});
test('连续被拦：staleFrom 粘在最后一次成功的时间，不跟着 checkedAt 往后跑', () => {
  const once = mergeSnapshot(ALL_403, OLD_GOOD);
  const twice = mergeSnapshot({ ...ALL_403, checkedAt: iso(0) }, once);
  assert.equal(once.staleFrom, OLD_GOOD.checkedAt);
  assert.equal(twice.staleFrom, OLD_GOOD.checkedAt);
  assert.equal(twice.online, true);
});
test('连续被拦超过 48 小时（checkedAt 每次都在刷新）→ 依旧会翻成异常', () => {
  const blockedLong = { ...OLD_GOOD, checkedAt: iso(0), online: true, staleFrom: iso(60 * HOUR), dataStale: true };
  const m = mergeSnapshot(ALL_403, blockedLong);
  assert.equal(m.online, false);
  assert.equal(m.probeBlocked, false);
  assert.equal(staleHours(m), 60);
});
test('从没成功过的站点被 403 → 没有「上次在线」可沿用，标异常', () => {
  const m = mergeSnapshot(ALL_403, undefined);
  assert.equal(m.online, false);
  assert.equal(m.probeBlocked, false);
});
test('本次探通了就不该标 probeBlocked', () => {
  assert.equal(mergeSnapshot(FRESH_BLOCKED, OLD_GOOD).probeBlocked, false); // 注册页 200
  assert.equal(mergeSnapshot({ ...OLD_GOOD, checkedAt: iso(0) }, OLD_GOOD).probeBlocked, false);
});
test('looksFiltered 只认「服务器答话了但把我们拦了」', () => {
  for (const r of [{ status: 403 }, { status: 429 }, { status: 451 }, { status: 503 }, { status: 200, error: 'invalid json' }]) {
    assert.equal(looksFiltered(r), true, JSON.stringify(r));
  }
  for (const r of [null, { ok: true, status: 200 }, { status: 0, error: 'timeout' }, { status: 502 }, { status: 404 }]) {
    assert.equal(looksFiltered(r), false, JSON.stringify(r));
  }
});

console.log('额度口径 creditPlan');
const AR = { id: 'agentrouter', name: 'AgentRouter', credits: { signup: 100, invite: 50, dailyCheckin: 25, approx: false } };
const JD = { id: 'justdowork', name: 'JustDoWork', credits: { signup: 70, invite: null, dailyCheckin: 22, approx: true } };
const RC = { id: 'rawchat', name: 'RawChat 公益站', credits: { signup: null, invite: null, dailyCheckin: null, dailyQuota: 50 } };

test('AgentRouter：100 注册 + 50 邀请 + 25 签到 = 首日 175', () => {
  const p = creditPlan(AR, OLD_GOOD);
  assert.equal(p.base, 150);
  assert.equal(p.firstDay, 175);
  assert.equal(usd(p.firstDay, p.approx), '$175');
  assert.equal(breakdown(p), '注册 $100 + 本页邀请 $50 + 首签 $25');
});
test('AgentRouter：登记的邀请额度与接口实测 $50 一致', () => {
  const p = creditPlan(AR, OLD_GOOD);
  assert.equal(p.apiInvite, 50);
  assert.equal(p.invite, p.apiInvite);
  assert.deepEqual(auditCredits([AR], { sites: [OLD_GOOD] }), []);
});
test('JustDoWork：70 + 约 22 = 首日约 92，带 ≈ 前缀', () => {
  const p = creditPlan(JD, { id: 'justdowork' });
  assert.equal(p.firstDay, 92);
  assert.equal(usd(p.firstDay, p.approx), '≈$92');
  assert.equal(breakdown(p), '注册 $70 + 首签 ≈$22');
});
test('接口把邀请额度改了 → auditCredits 告警，提醒更新登记值', () => {
  const w = auditCredits([AR], { sites: [{ ...OLD_GOOD, inviteeBonusUsd: 30 }] });
  assert.equal(w.length, 1);
  assert.match(w[0], /登记邀请额度 \$50.*返回 \$30/);
});
test('AgentRouter：签到额度是累积的，措辞是「首签」而不是「重置」', () => {
  const p = creditPlan(AR, OLD_GOOD);
  assert.equal(p.resets, false);
  assert.equal(perDay(p), '$25/天');
});
test('RawChat：每日重置额度池 $50 → 首日 $50，且说明不累积', () => {
  const p = creditPlan(RC, null);
  assert.equal(p.firstDay, 50);
  assert.equal(p.daily, 50);
  assert.equal(p.resets, true);
  assert.equal(p.base, null);
  assert.equal(perDay(p), '$50/天（重置）');
  assert.equal(breakdown(p), '每日额度池 $50（每天重置，不累积）');
});
test('dailyCheckin 与 dailyQuota 同时填 → 按签到算并告警', () => {
  const both = { id: 'both', name: 'Both', credits: { signup: 10, dailyCheckin: 5, dailyQuota: 50 } };
  const p = creditPlan(both, null);
  assert.equal(p.daily, 5);
  assert.equal(p.resets, false);
  assert.match(auditCredits([both], { sites: [] }).join(''), /口径不同/);
});
test('没填 credits 的站点不炸，只告警', () => {
  const p = creditPlan({ id: 'x', name: 'X' }, null);
  assert.equal(p.firstDay, null);
  assert.equal(usd(p.firstDay), null);
  assert.equal(breakdown(p), null);
  assert.equal(perDay(p), null);
  assert.equal(auditCredits([{ id: 'x', name: 'X' }], { sites: [] }).length, 1);
});

console.log('计价单位：积分站不能被当成美元站');
const MX = { id: 'matrix', name: 'Matrix', credits: { signup: null, invite: 600, dailyCheckin: null, approx: false, unit: 'point' } };

test('Matrix：600 积分按积分显示，绝不擅自加 $', () => {
  const p = creditPlan(MX, null);
  assert.equal(p.unit, 'point');
  assert.equal(p.firstDay, 600);
  assert.equal(usd(p.firstDay, p.approx, p.unit), '600 积分');
  assert.equal(breakdown(p), '本页邀请 600 积分');
  assert.equal(perDay(p), null); // 没有签到、也没有每日额度池
});
test('sources 数出首日额度由几笔钱凑成，只有一笔时页面不重复说构成', () => {
  assert.equal(creditPlan(AR, OLD_GOOD).sources, 3);
  assert.equal(creditPlan(JD, null).sources, 2);
  assert.equal(creditPlan(RC, null).sources, 1);
  assert.equal(creditPlan(MX, null).sources, 1);
  assert.equal(creditPlan({ id: 'x', name: 'X' }, null).sources, 0);
});
test('跨站合计只算美元站，积分站单独说一句', () => {
  const plans = [creditPlan(AR, OLD_GOOD), creditPlan(JD, null), creditPlan(RC, null), creditPlan(MX, null)];
  const t = usdTotals(plans);
  assert.equal(t.count, 3);
  assert.equal(t.best, 175);
  assert.equal(t.total, 175 + 92 + 50);
  assert.equal(t.resetting, true);
  assert.equal(t.others.length, 1);
  assert.equal(othersNote(t.others), 'Matrix 另发 600 积分');
  assert.equal(othersNote([]), null);
});
test('积分站不拿接口的美元邀请额度对账，避免误报', () => {
  assert.deepEqual(auditCredits([MX], { sites: [{ id: 'matrix', inviteeBonusUsd: 30 }] }), []);
});
test('未登记的单位原样后缀显示，并告警提醒补 UNITS', () => {
  const odd = { id: 'odd', name: 'Odd', credits: { signup: 5, unit: 'credit' } };
  assert.equal(usd(5, false, 'credit'), '5 credit');
  assert.match(auditCredits([odd], { sites: [] }).join(''), /不在已知单位/);
});

console.log('vibe-code 面板（Codex 公益站，接口不是 New API）');
/** 2026-08-21 从 new.sharedchat.cc 实测抓到的返回体 */
const VC_SITE = { id: 'rawchat', panel: 'vibecode', statusApi: 'https://new.sharedchat.cc/frontend-api/getConfig' };
const VC_CONFIG = {
  code: 1,
  msg: 'success',
  data: { siteName: 'RawChat公益站', siteType: 'codex', isAuth: false, isAuthClaude: false, isAuthCodex: true, isAuthGemini: false },
};
const VC_LOGIN = {
  code: 1,
  msg: 'success',
  data: {
    notice: '  每日 0 点重置额度  ',
    isEnableRegister: true,
    isEnableMailRegister: true,
    isEnableGitHubLogin: false,
    isEnableLinuxDoLogin: false,
    siteName: 'RawChat公益站',
    backendVersion: '1.0.0.0',
  },
};
const vcFetch = (map) => async (url) => map[String(url)] ?? { ok: false, error: 'unreachable' };
const VC_OK = vcFetch({
  'https://new.sharedchat.cc/frontend-api/getConfig': { ok: true, status: 200, ms: 587, json: VC_CONFIG },
  'https://new.sharedchat.cc/frontend-api/getLoginConfig': { ok: true, status: 200, ms: 431, json: VC_LOGIN },
});
const VC_CLOSED = { ok: true, status: 200, ms: 300, json: { code: 0, msg: '该接口未接入公益站独立网关，旧转发链路已关闭', data: null } };

// 探测本身是异步的，先在顶层 await 出结果，断言保持同步，测试运行器就不用管 Promise
const vcGood = await probeSite(VC_SITE, VC_OK);
const vcClosed = await probeSite(VC_SITE, vcFetch({
  'https://new.sharedchat.cc/frontend-api/getConfig': VC_CLOSED,
  'https://new.sharedchat.cc/frontend-api/getLoginConfig': VC_CLOSED,
}));
const vcUnreachable = await probeSite(VC_SITE, vcFetch({}));

test('站名 / 版本 / 注册开关 / 登录方式 / 已开放服务 都取到了', () => {
  assert.equal(vcGood.apiOk, true);
  assert.equal(vcGood.error, null);
  assert.equal(vcGood.systemName, 'RawChat公益站');
  assert.equal(vcGood.version, '1.0.0.0');
  assert.equal(vcGood.registerOpen, true);
  assert.deepEqual(vcGood.loginMethods, ['邮箱']);
  assert.deepEqual(vcGood.services, ['Codex']);
  assert.equal(vcGood.latencyMs, 587);
});
test('站内公告取自 notice，模型清单为空且标注需登录', () => {
  assert.deepEqual(vcGood.announcements, [{ id: null, date: null, text: '每日 0 点重置额度' }]);
  assert.deepEqual(vcGood.models, []);
  assert.equal(vcGood.modelsSource, 'login-required');
});
test('快照字段集合与 New API 面板完全一致（否则 merge 会漏字段）', () => {
  assert.deepEqual(Object.keys(vcGood).sort(), Object.keys(blankSnapshot(VC_SITE, {})).sort());
});
test('HTTP 200 但 code=0（接口未开放）→ 不当数据用，如实报错', () => {
  assert.equal(vcClosed.apiOk, false);
  assert.match(vcClosed.error, /旧转发链路已关闭/);
  assert.equal(vcClosed.systemName, null);
  assert.deepEqual(vcClosed.services, []);
});
test('vibe-code 接口被拦时，也走同一套字段级合并保住旧数据', () => {
  const m = mergeSnapshot({ ...vcUnreachable, signup: { status: 200, ok: true, ms: 210 } }, vcGood);
  assert.equal(m.online, true);
  assert.equal(m.systemName, 'RawChat公益站');
  assert.deepEqual(m.services, ['Codex']);
  assert.equal(m.dataStale, true);
});
test('panel 缺省是 newapi，未知 panel 直接报错而不是静默出空页', () => {
  assert.equal(PANELS.newapi.name, 'probeNewApi');
  assert.equal(PANELS.vibecode.name, 'probeVibeCode');
  assert.equal(PANELS.matrix.name, 'probeMatrix');
  assert.throws(() => probeSite({ id: 'z', panel: 'nope' }), /未知的面板类型/);
});

console.log('matrix 面板（公开接口只有一个健康检查，其余一律不猜）');
/** 2026-08-26 从 matrix.mzsjai.com/api/health 实测抓到的返回体 */
const MX_SITE = { id: 'matrix', panel: 'matrix', statusApi: 'https://matrix.mzsjai.com/api/health' };
const MX_HEALTH = { status: 'ok', timestamp: '2026-08-26T11:19:00.504Z' };
const mxFetch = (res) => async (url) => (String(url) === MX_SITE.statusApi ? res : { ok: false, error: 'unreachable' });

const mxGood = await probeSite(MX_SITE, mxFetch({ ok: true, status: 200, ms: 264, json: MX_HEALTH }));
const mxDegraded = await probeSite(MX_SITE, mxFetch({ ok: true, status: 200, ms: 311, json: { status: 'degraded' } }));
const mxNoField = await probeSite(MX_SITE, mxFetch({ ok: true, status: 200, ms: 120, json: { hello: 1 } }));
const mxDown = await probeSite(MX_SITE, mxFetch({ ok: false, status: 0, ms: 20_000, error: 'timeout' }));

test('health 返回 status=ok → apiOk，延迟如实记录', () => {
  assert.equal(mxGood.apiOk, true);
  assert.equal(mxGood.error, null);
  assert.equal(mxGood.latencyMs, 264);
});
test('接口给不出的字段一律留空，不从 sites.json 倒灌假装是探测结果', () => {
  assert.equal(mxGood.systemName, null);
  assert.equal(mxGood.version, null);
  assert.equal(mxGood.registerOpen, null);
  assert.equal(mxGood.checkinEnabled, null);
  assert.equal(mxGood.inviteeBonusUsd, null);
  assert.deepEqual(mxGood.loginMethods, []);
  assert.deepEqual(mxGood.models, []);
  assert.equal(mxGood.modelsSource, 'login-required');
  assert.equal(mxGood.pricingOk, false);
});
test('后端自报 degraded / 缺 status 字段 → 不当在线用，原因写进 error', () => {
  assert.equal(mxDegraded.apiOk, false);
  assert.match(mxDegraded.error, /degraded/);
  assert.equal(mxNoField.apiOk, false);
  assert.match(mxNoField.error, /没有 status 字段/);
});
test('连不上就是连不上，错误原样带出来', () => {
  assert.equal(mxDown.apiOk, false);
  assert.equal(mxDown.error, 'timeout');
  assert.equal(mxDown.latencyMs, 20_000);
});
test('matrix 快照字段集合与 New API 面板完全一致（否则 merge 会漏字段）', () => {
  assert.deepEqual(Object.keys(mxGood).sort(), Object.keys(blankSnapshot(MX_SITE, {})).sort());
});
test('health 挂了但注册页 200 → 页面仍算在线，不误报异常', () => {
  const m = mergeSnapshot({ ...mxDown, signup: { status: 200, ok: true, ms: 180 } }, mxGood);
  assert.equal(m.online, true);
  assert.equal(m.apiOk, false);
  assert.equal(m.error, 'timeout');
});

console.log('tabitoken：按次计费的 New API 站（model_price，不是倍率）');
/**
 * 2026-08-30 从 tabitoken.com 实测抓到的返回体（status 只留探测会读的字段）。
 * 这个站是「按次计费」的典型：quota_type=1 + model_price，model_ratio 与 completion_ratio 全是 0，
 * 倍率照抄接口就等于在页面上写「免费」，所以这里把 fixedPrice 钉死。
 */
const TB_SITE = {
  id: 'tabitoken',
  name: 'TaBiAI',
  panel: 'newapi',
  statusApi: 'https://tabitoken.com/api/status',
  pricingApi: 'https://tabitoken.com/api/pricing',
  credits: { signup: 100, invite: 20, dailyCheckin: null, approx: false },
};
const TB_STATUS = {
  success: true,
  data: {
    system_name: 'TaBiAI',
    version: 'init-20260817-f880a343',
    register_enabled: true,
    password_register_enabled: false,
    password_login_enabled: true,
    github_oauth: true,
    linuxdo_oauth: false,
    discord_oauth: false,
    telegram_oauth: false,
    wechat_login: false,
    oidc_enabled: false,
    passkey_login: false,
    checkin_enabled: true,
    quota_per_unit: 500000,
    turnstile_check: true,
    price: 7.3,
    announcements: [],
  },
};
const tbModel = (name, price) => ({
  model_name: name,
  quota_type: 1,
  model_ratio: 0,
  model_price: price,
  completion_ratio: 0,
  enable_groups: ['vip', 'default'],
  supported_endpoint_types: ['anthropic', 'openai'],
});
const TB_PRICING = {
  success: true,
  data: [
    tbModel('claude-opus-5-thinking', 0.8),
    tbModel('claude-opus-5', 0.8),
    tbModel('claude-opus-4-8', 0.5),
    tbModel('claude-opus-4-8-thinking', 0.5),
  ],
};
const tb = await probeSite(
  TB_SITE,
  vcFetch({
    'https://tabitoken.com/api/status': { ok: true, status: 200, ms: 431, json: TB_STATUS },
    'https://tabitoken.com/api/pricing': { ok: true, status: 200, ms: 288, json: TB_PRICING },
  }),
);

test('站名 / 版本 / 签到开关 / 登录方式 都按接口原样取到', () => {
  assert.equal(tb.apiOk, true);
  assert.equal(tb.pricingOk, true);
  assert.equal(tb.systemName, 'TaBiAI');
  assert.equal(tb.version, 'init-20260817-f880a343');
  assert.equal(tb.registerOpen, true);
  assert.equal(tb.passwordRegister, false); // 只能 GitHub 授权注册
  assert.equal(tb.checkinEnabled, true);
  assert.deepEqual(tb.loginMethods, ['GitHub', '账号密码']);
  assert.equal(tb.quotaPerUnit, 500000);
  assert.equal(tb.latencyMs, 431);
});
test('接口没给 quota_for_invitee → 邀请额度留 null，不拿 sites.json 的 $20 冒充探测值', () => {
  assert.equal(tb.inviteeBonusUsd, null);
  assert.equal(tb.inviterBonusUsd, null);
  assert.equal(creditPlan(TB_SITE, tb).apiInvite, null);
  assert.deepEqual(auditCredits([TB_SITE], { sites: [tb] }), []); // 拿不到实测值就不该报「不一致」
});
test('注册 $100 + 本页邀请 $20 = 首日 $120，签到金额未公示所以不进合计', () => {
  const p = creditPlan(TB_SITE, tb);
  assert.equal(p.firstDay, 120);
  assert.equal(usd(p.firstDay, p.approx), '$120');
  assert.equal(breakdown(p), '注册 $100 + 本页邀请 $20');
  assert.equal(p.daily, null);
  assert.equal(perDay(p), null);
});
test('4 个模型都是按次计价：fixedPrice 有值，per-1M 单价一律 null', () => {
  assert.equal(tb.models.length, 4);
  const byName = new Map(tb.models.map((m) => [m.name, m]));
  assert.deepEqual([...byName.keys()], ['claude-opus-4-8', 'claude-opus-4-8-thinking', 'claude-opus-5', 'claude-opus-5-thinking']);
  for (const [name, price] of [
    ['claude-opus-5', 0.8],
    ['claude-opus-5-thinking', 0.8],
    ['claude-opus-4-8', 0.5],
    ['claude-opus-4-8-thinking', 0.5],
  ]) {
    const m = byName.get(name);
    assert.equal(m.fixedPrice, price, name);
    assert.equal(m.inputPerMTok, null, name); // ratio 0 换算出的 $0 是假的，必须留空
    assert.equal(m.outputPerMTok, null, name);
    assert.equal(m.ratio, 0, name);
    assert.deepEqual(m.protocols, ['anthropic', 'openai'], name);
    assert.deepEqual(m.groups, ['vip', 'default'], name);
  }
});
test('示例配置的默认模型取版本最新的 opus-5，两个协议都不许退回字母序第一个', () => {
  assert.equal(tb.defaults.claude, 'claude-opus-5');
  // 全站只有 claude-*，OpenAI 协议没有 gpt 系可挑；兜底若用 models[0] 会得到 claude-opus-4-8
  assert.equal(tb.defaults.openai, 'claude-opus-5');
});
test('tabitoken 快照字段集合与面板骨架完全一致', () => {
  assert.deepEqual(Object.keys(tb).sort(), Object.keys(blankSnapshot(TB_SITE, {})).sort());
});

// 只有 /api/pricing 吃了 403（机房 IP 的常见样子），status 照常通
const tbPricingBlocked = await probeSite(
  TB_SITE,
  vcFetch({
    'https://tabitoken.com/api/status': { ok: true, status: 200, ms: 402, json: TB_STATUS },
    'https://tabitoken.com/api/pricing': { ok: false, status: 403, ms: 190, error: 'HTTP 403' },
  }),
);
const TB_OLD = { ...tb, checkedAt: iso(6 * HOUR), online: true, signup: { status: 200, ok: true, ms: 240 } };
const tbMerged = mergeSnapshot({ ...tbPricingBlocked, signup: { status: 200, ok: true, ms: 260 } }, TB_OLD);

test('pricing 被拦时，按次价格沿用旧快照而不是变成空表', () => {
  assert.equal(tbMerged.models.length, 4);
  assert.equal(tbMerged.models[0].name, 'claude-opus-4-8');
  assert.equal(tbMerged.models[0].fixedPrice, 0.5);
  assert.equal(tbMerged.modelsSource, 'cached');
  assert.equal(tbMerged.online, true);
  assert.equal(tbMerged.dataStale, true);
  assert.equal(tbMerged.staleFrom, TB_OLD.checkedAt);
});
test('合并后重算默认模型，仍然是 opus-5（merge 的兜底也不许退回字母序）', () => {
  assert.equal(tbMerged.defaults.claude, 'claude-opus-5');
  assert.equal(tbMerged.defaults.openai, 'claude-opus-5');
});

console.log('工具函数');
test('meaningful 认得空值', () => {
  for (const v of [null, undefined, '', '   ', [], {}, { a: null }]) assert.equal(meaningful(v), false, JSON.stringify(v));
  for (const v of [0, false, 'x', [1], { a: 1 }]) assert.equal(meaningful(v), true, JSON.stringify(v));
});
test('pickPreferred 按数字段比大小，不是字典序', () => {
  const ms = [{ name: 'claude-opus-4-8' }, { name: 'claude-opus-5' }, { name: 'claude-sonnet-4-5' }];
  assert.equal(pickPreferred(ms, /^claude/i), 'claude-opus-5');
  assert.equal(pickPreferred([], /^claude/i), null);
});

console.log(`\n${process.exitCode ? '✘ 有用例失败' : `✔ 全部通过（${passed} 项）`}`);
