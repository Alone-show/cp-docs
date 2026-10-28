import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFraming } from '../lib/framing.js';

test('事实块包含问题/机型/数值/规则', () => {
  const text = buildFraming({
    question: 'SPRING2PRO 的屏幕尺寸',
    entry: { id: '1.23', model: 'SPRING 10 PRO 二代', family: 'SPRING', aliases: ['SPRING2-10PRO'], doc_url: 'https://example/doc' },
    facts: { fields: [{ key: 'screen_inch', label: '屏幕尺寸', value: '10.1', unit: '英寸' }], rows: [], nodes: [], workpoints: [], notes: [] },
    sources: ['原图 https://example/img.png'],
  });
  assert.match(text, /命中机型：1\.23 SPRING 10 PRO 二代/);
  assert.match(text, /屏幕尺寸：10\.1 英寸/);
  assert.match(text, /不要补充未列出的数值/);
  assert.match(text, /https:\/\/example\/doc/);
});
