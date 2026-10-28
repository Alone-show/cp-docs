/**
 * 机型 × 自然语言问题 → 事实（值 + 表格行 + 编程节点 + 工作点 + 出处）。
 * 全部确定性：字段映射 + 关键词/中文 bigram 匹配，不推断。
 */
import { FIELDS, matchFields } from './fields.js';

const LABEL = Object.fromEntries(FIELDS.map((f) => [f.key, f.label]));
const PIN_RE = /(?:pin|第|p)\s*#?\s*(\d{1,2})\s*(?:脚|针|号|位)?/i;
const NODE_RE = /(设备节点|节点|tty|\/dev\/|串口设备)/i;
const HARNESS_RE = /(线束|接线|走线|航空座)/;
const IFACE_RE = /(接口|接插件|航插|连接器|pin|脚|针)/i;
const WP_RE = /(工作点|gpio|input\d|output\d|供电使能|终端电阻|adc|state_)/i;

function norm(s) { return String(s ?? '').toLowerCase().replace(/\s+/g, ''); }

/** 拉丁词（1024p、nvp6158）+ 中文 bigram，用于模糊命中表格行 */
function keywords(q) {
  const raw = String(q ?? '').normalize('NFKC');
  const latin = [...new Set((raw.toLowerCase().match(/[a-z]+\d*[a-z]*|\d+[a-z]*/g) || []).filter((t) => t.length >= 2))];
  const cjk = [];
  for (const run of raw.match(/[\u4e00-\u9fa5]{2,}/g) || []) {
    for (let i = 0; i < run.length - 1; i++) cjk.push(run.slice(i, i + 2));
  }
  return { latin, cjk: [...new Set(cjk)] };
}

/** 一段文本对问题的匹配分：拉丁词命中 +10，中文 bigram 命中 +3 */
function matchScore(haystack, kw) {
  const h = norm(haystack);
  let score = 0;
  for (const t of kw.latin) if (h.includes(norm(t))) score += 10;
  for (const g of kw.cjk) if (h.includes(norm(g))) score += 3;
  return score;
}

function rowHaystack(t, row) {
  return [t.section, t.caption, (t.header || []).join(' '), (row || []).join(' ')].filter(Boolean).join(' ');
}

function pickRows(tables, kinds, kw, limit = 12) {
  const hits = [];
  for (const t of tables || []) {
    if (kinds && !kinds.includes(t.kind)) continue;
    for (const row of t.rows || []) {
      const score = matchScore(rowHaystack(t, row), kw);
      if (score > 0) hits.push({ score, section: t.section, header: t.header, row, src: t.src, caption: t.caption });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

function pickPin(tables, kinds, pin) {
  const want = String(pin);
  for (const t of tables || []) {
    if (kinds && !kinds.includes(t.kind)) continue;
    for (const row of t.rows || []) {
      if (String(row[0] ?? '').trim() === want) return [{ score: 99, section: t.section, header: t.header, row, src: t.src, caption: t.caption }];
    }
  }
  return [];
}

/** 工作点：在 43 列里找问题提到的信号名（INPUT1 / CAN1终端电阻 …） */
function pickWorkpoints(workpoints, question) {
  const out = [];
  if (!workpoints?.entries?.length) return out;
  const cols = workpoints.columns || [];
  const qn = norm(question);
  const hits = cols.filter((c) => { const n = norm(c); return n.length >= 3 && qn.includes(n); });
  const seen = new Set();
  const push = (e, c) => {
    const key = `${c}\u0000${e.values[c]}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ cpCode: e.cpCode, signal: c, value: e.values[c] });
  };
  for (const e of workpoints.entries) {
    if (hits.length) { for (const c of hits) if (e.values[c] && e.values[c] !== '-') push(e, c); }
  }
  return out;
}

/** 编程节点：设备节点表里按名称/行内容匹配 */
function pickNodes(programming, kw, question) {
  const out = [];
  const qn = norm(question);
  for (const page of programming?.pages || []) {
    for (const t of page.tables || []) {
      const header = t.header || [];
      for (const row of t.rows || []) {
        // 只按行内容打分：表头/标题里“设备节点”这类词会让每一行都命中
        const nameIdx = header.findIndex((h) => /名称|信号|功能/.test(h));
        const hay = row.join(' ');
        const score = matchScore(hay, kw);
        const name = norm(row[nameIdx >= 0 ? nameIdx : 0]);
        const direct = !!name && qn.includes(name);
        if (score > 0 || direct) out.push({ score: score + (direct ? 20 : 0), page: page.title, url: page.url, header, row });
      }
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 12);
}

/** 问题意图：pin / harness / node / workpoint / field */
export function detectIntent(q) {
  const text = String(q ?? '');
  const hasPin = PIN_RE.test(text) && /(pin|脚|针|接口|接插件)/i.test(text);
  if (hasPin) return 'pin';
  if (HARNESS_RE.test(text)) return 'harness';
  if (NODE_RE.test(text)) return 'node';
  if (WP_RE.test(text)) return 'workpoint';
  return 'field';
}

/**
 * @returns {{status:'ok'|'empty', intent:string, fields:Array, rows:Array, nodes:Array, workpoints:Array, notes:Array}}
 */
export function buildFacts({ entry, spec, programming, workpoints, question }) {
  const q = String(question ?? '');
  const intent = detectIntent(q);
  const tables = spec?.tables || [];
  const params = spec?.params_flat || {};
  const kw = keywords(q);
  let fields = [];
  let rows = [];
  let nodes = [];
  let wps = [];

  const pushFields = (list, withRelated) => {
    for (const f of list) {
      const v = params[f.key];
      if (v != null && v !== '') fields.push({ key: f.key, label: f.label, value: v, unit: f.unit || '' });
      if (!withRelated) continue;
      for (const rel of f.related || []) {
        if (fields.some((x) => x.key === rel)) continue;
        const rv = params[rel];
        if (rv != null && rv !== '') fields.push({ key: rel, label: LABEL[rel] || rel, value: rv, unit: '' });
      }
    }
  };

  if (intent === 'pin' || intent === 'harness') {
    const kinds = intent === 'harness' ? ['harness'] : ['interface', 'harness'];
    const pinM = q.match(PIN_RE);
    if (pinM) rows = pickPin(tables, kinds, Number(pinM[1]));
    if (!rows.length) rows = pickRows(tables, kinds, kw);
  } else if (intent === 'node') {
    nodes = pickNodes(programming, kw, q);
  } else if (intent === 'workpoint') {
    wps = pickWorkpoints(workpoints, q);
  } else {
    pushFields(matchFields(q), true);
  }

  // 兜底：目标意图没有命中时，退到参数表行 / 字段 / 编程节点
  if (!fields.length && !rows.length && !nodes.length && !wps.length) {
    rows = pickRows(tables.filter((t) => t.kind === 'param'), null, kw);
    if (!rows.length && intent !== 'field') pushFields(matchFields(q), true);
  }

  const notes = [...(spec?.warnings || [])];
  const status = fields.length || rows.length || nodes.length || wps.length ? 'ok' : 'empty';
  return { status, intent, fields, rows, nodes, workpoints: wps, notes };
}

export { matchFields };
