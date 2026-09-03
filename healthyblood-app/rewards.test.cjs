const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(Boolean);

test('all app scripts compile', () => {
  for (const script of scripts) new vm.Script(script);
});

function renderRewards(overrides = {}) {
  const context = vm.createContext({
    state: { subs: [{ id: 1 }], email: 'test@example.com', ...overrides },
    esc: String,
    renderOrderHistory: () => 'Order history',
    nextRewardDrawing: () => 'October 8, 2026',
    loyaltyProgram: sub => ({ sub, active: true, orders: 6, months: 12, entryOpen: true, ...overrides.program }),
  });
  vm.runInContext(html.slice(html.indexOf('function viewSubs()'), html.indexOf('function latestRelevantAttempt(')), context);
  vm.runInContext(html.slice(html.indexOf('function renderLoyaltyTracker()'), html.indexOf('async function claimMilestoneReward(')), context);
  return vm.runInContext('viewSubs()', context);
}

test('rewards view has drawing entry but no subscription adjustment controls', () => {
  const output = renderRewards();
  assert.match(output, /Loyalty <span class="accent">Rewards/);
  assert.match(output, /claimMilestoneReward\('1','vacation_entry'\)/);
  assert.match(output, /loyalty rate reward is unlocked/);
  assert.doesNotMatch(output, /subAction|startCancelFlow|startPauseFlow|startSkipFlow|updateSub|claimPaymentRecovery|claimLoyaltyReward|type="date"|<select/);
});

test('claimed drawing entries stay disabled', () => {
  assert.match(renderRewards({ program: { vacationClaimed: true } }), /disabled[^>]*>Wait until next drawing/);
});

test('loading, empty, and error states remain usable', () => {
  assert.match(renderRewards({ subs: null, subsLoading: true }), /Loading your loyalty rewards/);
  assert.match(renderRewards({ subs: [] }), /No active subscriptions/);
  assert.match(renderRewards({ subs: null, subsError: 'Offline' }), /Try Again/);
});
