/**
 * @local/cp-docs —— /cp-docs + 自然语言的产品资料检索。
 *
 * 只注册一个斜杠命令（不注册模型工具）：用户输入 /cp-docs SPRING2PRO 的屏幕尺寸，
 * 插件做机型归一（移植 firmware-finder）+ 本地资料检索，把「问题 + 事实 + 出处」
 * 作为一条用户消息 followup 给会话，由模型生成最终回答。检索全程离线。
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { resolveDataDir, loadDataset, loadModelFiles } from './lib/store.js';
import { parseQuery } from './lib/parse.js';
import { buildFacts } from './lib/query.js';
import { buildFraming, renderCandidates, renderCatalog } from './lib/framing.js';

export const name = 'cp-docs';
export const inject = ['commands'];

const USAGE = [
  '用法：/cp-docs <自然语言>',
  '例：',
  '  /cp-docs SPRING2PRO 的屏幕尺寸',
  '  /cp-docs APOLLO2 12PRO 的工作温度范围',
  '  /cp-docs SPRING2PRO 26P 接口第 5 脚是什么',
  '  /cp-docs CP023 的 INPUT1 接到哪个 GPIO',
  '  /cp-docs APOLLO 7 PRO 的 RS485 设备节点',
  '  /cp-docs 支持哪些机型',
].join('\n');

function userMessage(text) {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content: [{ type: 'text', text }],
    source: { kind: 'user' },
  };
}

function collectSources(facts, spec) {
  const out = new Set();
  for (const r of facts.rows || []) if (r.src) out.add(`原图 ${r.src}`);
  for (const t of spec?.tables || []) if (t.kind === 'param' && t.src) out.add(`参数表原图 ${t.src}`);
  return [...out].slice(0, 3);
}

function factsKey(facts) {
  return JSON.stringify({
    f: (facts.fields || []).map((x) => [x.key, x.value]),
    r: (facts.rows || []).map((x) => x.row),
    n: (facts.nodes || []).map((x) => x.row),
    w: (facts.workpoints || []).map((x) => [x.signal, x.value]),
  });
}

async function handleCommand(ctx, inv) {
  const text = String(inv.rawInput || '').trim();
  if (!text) return { kind: 'error', text: USAGE };

  let dir;
  try {
    dir = await resolveDataDir(ctx, inv.agent, inv.signal);
  } catch (err) {
    return { kind: 'error', text: `cp-docs 没有本地资料：${err.message}` };
  }
  const dataset = loadDataset(dir);
  const parsed = parseQuery(text, dataset.models);

  if (parsed.intent === 'sync') {
    return {
      kind: 'success',
      text: '资料快照更新需要文档站登录态，这一步尚未启用；日常检索不受影响（全部读本地 .cpdocs）。',
    };
  }

  if (parsed.intent === 'help') {
    return { kind: 'error', text: `${USAGE}\n\n没有从问题里认出机型。` };
  }

  if (parsed.intent === 'catalog') {
    const framing = [
      '【cp-docs 检索结果 · 机型清单】',
      `用户问题：${text}`,
      renderCatalog(dataset.models),
      '请基于以上清单回答用户（不要补充清单之外的机型）。',
    ].join('\n');
    inv.agent.followup(userMessage(framing));
    return { kind: 'success', text: `已列出 ${dataset.models.length} 款机型，正在生成回答…` };
  }

  // 歧义：同值合并；不同值则让用户选
  if (parsed.intent === 'ambiguous') {
    const scored = parsed.candidates || [];
    if (scored.length) {
      const evaluate = (g) => {
        const files = loadModelFiles(dir, g);
        return buildFacts({ entry: g, spec: files.spec, programming: files.programming, workpoints: files.workpoints, question: parsed.question });
      };
      const first = evaluate(scored[0][1]);
      if (first.status === 'ok' && scored.length > 1) {
        const same = scored.every(([, g]) => factsKey(evaluate(g)) === factsKey(first));
        if (same) {
          const g = scored[0][1];
          const files = loadModelFiles(dir, g);
          const sources = collectSources(first, files.spec);
          const framing = buildFraming({
            question: text, entry: g, facts: first,
            extraNotes: [`问题里的机型写法「${parsed.modelText}」对应多个机型，它们的该字段取值相同：${scored.map(([, x]) => x.model).join(' / ')}`],
            sources,
          });
          inv.agent.followup(userMessage(framing));
          return { kind: 'success', text: `命中 ${g.id} ${g.model} 等机型（该字段取值相同），正在生成回答…` };
        }
      }
      return { kind: 'success', text: renderCandidates({ query: parsed.modelText || text, scored }) };
    }
    return { kind: 'error', text: `${USAGE}\n\n没能唯一确定机型。` };
  }

  // 唯一命中
  const entry = parsed.hit;
  const files = loadModelFiles(dir, entry);
  const facts = buildFacts({ entry, spec: files.spec, programming: files.programming, workpoints: files.workpoints, question: parsed.question });

  if (facts.status === 'empty') {
    return {
      kind: 'error',
      text: [
        `已命中机型 ${entry.id} ${entry.model}，但这条问题没有匹配到资料。`,
        '可以换个问法，例如：屏幕尺寸 / 分辨率 / 工作温度 / 26P 接口第 5 脚 / RS485 设备节点 / INPUT1 工作点。',
      ].join('\n'),
    };
  }

  const sources = collectSources(facts, files.spec);
  const framing = buildFraming({ question: text, entry, facts, sources });
  inv.agent.followup(userMessage(framing));
  return {
    kind: 'success',
    text: `已检索：${entry.id} ${entry.model}${facts.intent === 'field' ? '' : `（${facts.intent}）`}，正在生成回答…`,
  };
}

export function apply(ctx) {
  ctx.commands.register({
    name: 'cp-docs',
    description: '按机型检索本地产品资料（参数/接口/线束/编程节点/工作点），把事实交给模型作答',
    input: { hint: '用自然语言问，如：SPRING2PRO 的屏幕尺寸' },
    handler: async (inv) => {
      try {
        return await handleCommand(ctx, inv);
      } catch (err) {
        return { kind: 'error', text: `cp-docs 出错：${err?.stack || err}` };
      }
    },
  });
}
