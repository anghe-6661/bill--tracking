import test from 'node:test';
import assert from 'node:assert/strict';
import { connectSync, getSyncConfig, pullFromCloud } from '../src/sync.js';

const FILE = 'bill-app-data.json';
function setup(local, cloud, fail = false) {
  const data = new Map(Object.entries(local));
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
  globalThis.CustomEvent = class { constructor(type) { this.type = type; } };
  globalThis.window = { dispatchEvent() {} };
  let remote = cloud;
  const response = (body, ok = true) => ({ ok, status: ok ? 200 : 401, json: async () => body });
  globalThis.fetch = async (url, options = {}) => {
    if (fail) return response({ message: 'Bad credentials' }, false);
    if (url.endsWith('?per_page=100')) return response([{ id: 'g1', files: { [FILE]: {} } }]);
    if (options.method === 'PATCH') {
      remote = JSON.parse(JSON.parse(options.body).files[FILE].content);
      return response({ id: 'g1' });
    }
    return response({ files: { [FILE]: { content: JSON.stringify(remote) } } });
  };
  return { data, remote: () => remote };
}
const item = (id) => ({ id, name: id, price: 1 });

test('first connection merges separate Safari and installed-app records', async () => {
  const local = {
    bill_items: JSON.stringify([item('safari')]),
    bill_bills: JSON.stringify([]),
    bill_settings: JSON.stringify({ dailyBudget: 100 }),
    bill_last_updated: '100',
  };
  const cloud = { items: [item('installed')], bills: [], settings: { dailyBudget: 90 }, updatedAt: 90 };
  const state = setup(local, cloud);
  await connectSync('sample-token');
  assert.deepEqual(JSON.parse(state.data.get('bill_items')).map((x) => x.id), ['installed', 'safari']);
  assert.deepEqual(state.remote().items.map((x) => x.id), ['installed', 'safari']);
  assert.equal(getSyncConfig().gistId, 'g1');
  assert.equal(state.remote().settings.dailyBudget, 100);
});

test('bad token cannot activate sync or replace local records', async () => {
  const local = { bill_items: JSON.stringify([item('safari')]) };
  const state = setup(local, null, true);
  await assert.rejects(connectSync('bad-token'), /Bad credentials/);
  assert.equal(getSyncConfig().token, '');
  assert.deepEqual(JSON.parse(state.data.get('bill_items')), [item('safari')]);
});

test('later cloud change arrives without rewriting the cloud', async () => {
  const cloud = { items: [item('first')], bills: [], settings: {}, updatedAt: Date.now() - 10000 };
  const state = setup({ bill_items: '[]', bill_bills: '[]', bill_settings: '{}' }, cloud);
  await connectSync('sample-token');
  const next = state.remote();
  next.items.push(item('second'));
  next.updatedAt += 1000;
  const result = await pullFromCloud();
  assert.equal(result.updated, true);
  assert.deepEqual(JSON.parse(state.data.get('bill_items')).map((x) => x.id), ['first', 'second']);
});

test('simultaneous additions on two devices are kept', async () => {
  const cloud = { items: [item('first')], bills: [], settings: {}, updatedAt: Date.now() - 10000 };
  const state = setup({ bill_items: '[]', bill_bills: '[]', bill_settings: '{}' }, cloud);
  await connectSync('sample-token');
  const syncTime = state.remote().updatedAt;
  state.data.set('bill_items', JSON.stringify([item('first'), item('local')]));
  state.data.set('bill_last_updated', String(syncTime + 1));
  state.remote().items.push(item('cloud'));
  state.remote().updatedAt = syncTime + 2;
  const result = await pullFromCloud();
  assert.equal(result.pushed, true);
  assert.deepEqual(new Set(state.remote().items.map((x) => x.id)), new Set(['first', 'cloud', 'local']));
});

test('a concurrent deletion does not bring the removed item back', async () => {
  const cloud = { items: [item('removed')], bills: [], settings: {}, updatedAt: Date.now() - 10000 };
  const state = setup({ bill_items: '[]', bill_bills: '[]', bill_settings: '{}' }, cloud);
  await connectSync('sample-token');
  const syncTime = state.remote().updatedAt;
  state.data.set('bill_items', '[]');
  state.data.set('bill_deleted_item_ids', '["removed"]');
  state.data.set('bill_last_updated', String(syncTime + 1));
  state.remote().items.push(item('other-device'));
  state.remote().updatedAt = syncTime + 2;
  await pullFromCloud();
  assert.deepEqual(state.remote().items.map((x) => x.id), ['other-device']);
});
