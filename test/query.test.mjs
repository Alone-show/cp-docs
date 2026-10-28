import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildFacts, detectIntent } from '../lib/query.js';

const dir = path.resolve(import.meta.dirname, '../../../.cpdocs');
const has = fs.existsSync(path.join(dir, 'models.json'));
const models = has ? JSON.parse(fs.readFileSync(path.join(dir, 'models.json'), 'utf8')).models : [];
const entry = models.find((m) => m.id === '1.23');
const load = (rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const spec = has ? load(entry.spec) : null;
const programming = has ? load(entry.programming) : null;
const workpoints = has ? load(entry.workpoints) : null;
const facts = (q) => buildFacts({ entry, spec, programming, workpoints, question: q });

test('字段意图', { skip: !has }, () => {
  const f = facts('的屏幕尺寸是多少');
  assert.equal(f.intent, 'field');
  const screen = f.fields.find((x) => x.key === 'screen_inch');
  assert.equal(screen.value, '10.1');
  assert.ok(f.fields.some((x) => x.key === 'resolution'));
  assert.equal(facts('工作温度').fields[0].value, '-30℃~+70℃');
});

test('接口 PIN', { skip: !has }, () => {
  const f = facts('26P 接口第5脚');
  assert.equal(f.intent, 'pin');
  assert.equal(f.rows.length, 1);
  assert.equal(String(f.rows[0].row[0]), '5');
});

test('线束定义表', { skip: !has }, () => {
  const f = facts('摄像头航空插座线束');
  assert.equal(f.intent, 'harness');
  assert.ok(f.rows.length >= 1);
});

test('编程节点', { skip: !has }, () => {
  const f = facts('RS485 设备节点');
  assert.equal(f.intent, 'node');
  const rows = f.nodes.map((n) => n.row.join(' ')).join(' | ');
  assert.match(rows, /tty/);
});

test('硬件工作点', { skip: !has }, () => {
  const f = facts('INPUT1 接到哪个 GPIO');
  assert.equal(f.intent, 'workpoint');
  assert.ok(f.workpoints.some((w) => w.signal === 'INPUT1' && w.value === '[MCU] PC0'));
});

test('意图识别', () => {
  assert.equal(detectIntent('26P 接口第5脚'), 'pin');
  assert.equal(detectIntent('RS485 设备节点'), 'node');
  assert.equal(detectIntent('INPUT1 接到哪个 GPIO'), 'workpoint');
  assert.equal(detectIntent('工作温度'), 'field');
});
