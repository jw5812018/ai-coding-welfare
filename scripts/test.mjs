#!/usr/bin/env node
/**
 * 零依赖单测：node scripts/test.mjs
 * 盯的是线上真实踩过的坑——CI 机房 IP 被 Cloudflare 拦时，页面不能退化成「异常 + 无数据」。
 */
import assert from 'node:assert/strict';
import { mergeSnapshot, meaningful } from './lib/merge.mjs';
import { pickPreferred, staleHours, STALE_WARN_HOURS, blankSnapshot } from './lib/newapi.mjs';
import { creditPlan, usd, breakdown, perDay, auditCredits } from './lib/credits.mjs';
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
  assert.throws(() => probeSite({ id: 'z', panel: 'nope' }), /未知的面板类型/);
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
