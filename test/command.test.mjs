import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import { apply } from '../index.js';

const dataDir = path.resolve(import.meta.dirname, '../../../.cpdocs');
const has = fs.existsSync(path.join(dataDir, 'models.json'));
if (has) process.env.DSH_CPDOCS_DIR = dataDir;

function harness() {
  const registered = [];
  const messages = [];
  const ctx = { commands: { register: (d) => registered.push(d) }, get: () => undefined };
  apply(ctx);
  const def = registered.find((d) => d.name === 'cp-docs');
  const agent = { followup: (m) => messages.push(m) };
  const run = (rawInput) => def.handler({ commandId: 'c1', agent, rawInput, attachments: [], signal: new AbortController().signal });
  return { def, run, messages };
}

test('命令已注册且带说明', () => {
  const { def } = harness();
  assert.ok(def);
  assert.equal(typeof def.handler, 'function');
  assert.match(def.description, /机型/);
});

test('SPRING2PRO 屏幕尺寸 → 事实块交给模型', { skip: !has }, async () => {
  const h = harness();
  const res = await h.run(' SPRING2PRO 的屏幕尺寸是多少');
  assert.equal(res.kind, 'success');
  assert.match(res.text, /1\.23 SPRING 10 PRO 二代/);
  assert.equal(h.messages.length, 1);
  const text = h.messages[0].content[0].text;
  assert.match(text, /屏幕尺寸：10\.1 英寸/);
  assert.match(text, /分辨率：1024\*600/);
  assert.match(text, /不要补充未列出的数值/);
});

test('族名 → 列候选、不触发模型', { skip: !has }, async () => {
  const h = harness();
  const res = await h.run(' SPRING2 屏幕尺寸');
  assert.equal(res.kind, 'success');
  assert.match(res.text, /不唯一/);
  assert.equal(h.messages.length, 0);
});

test('CP023 两个机型取值相同 → 合并作答', { skip: !has }, async () => {
  const h = harness();
  const res = await h.run(' CP023 的 INPUT1 接到哪个 GPIO');
  assert.equal(res.kind, 'success');
  assert.equal(h.messages.length, 1);
  assert.match(h.messages[0].content[0].text, /\[MCU\] PC0/);
});

test('目录问题 → 机型清单交给模型', { skip: !has }, async () => {
  const h = harness();
  const res = await h.run(' 支持哪些机型');
  assert.equal(res.kind, 'success');
  assert.equal(h.messages.length, 1);
  assert.match(h.messages[0].content[0].text, /SPRING 10 PRO 二代/);
});
