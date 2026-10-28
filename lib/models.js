/**
 * 机型归一：直接移植 @local/firmware-finder 的 canonModel / queryCores /
 * gapScore / scoreCore / resolveModel 判定规则（阈值一致），
 * 差别只在分组：这里按「文档机型」分组，每组挂多个 core（文档名/业务写法/CP 编码）。
 */

/** 去符号 + 小写；二代→gen2；apollo2→apollo（与 firmware-finder 一致） */
export function nz(s) {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** 中文标记转 token：二代/特别版/电台/客户名，避免「特别版」被 nz 抹掉后与基础机型撞车 */
const ZH_TOKENS = [
  [/二代|2代/g, 'gen2'],
  [/特别版/g, 'special'],
  [/电台/g, 'radio'],
  [/雷沃/g, 'lovol'],
  [/华测/g, 'huace'],
];

export function canonCore(name) {
  let base = String(name ?? '');
  for (const [re, rep] of ZH_TOKENS) base = base.replace(re, rep);
  return nz(base).replace(/apollo2/g, 'apollo');
}

const VENDOR = {
  rk: 'rk', 瑞芯微: 'rk', t3: 't3', sc60: 'sc60', 全志: 'allwinner', 高通: 'qualcomm',
};
function vendorKey(t) { return VENDOR[String(t ?? '').trim().toLowerCase()] ?? VENDOR[String(t ?? '').trim()] ?? ''; }

/** 厂商前缀（RK /、T3 /、瑞芯微 /、(RK) 等）；只认已知厂商 */
export function splitVendor(raw) {
  const s = String(raw ?? '').trim();
  const paren = s.match(/^(.+?)\s*[（(]\s*([^)）]+?)\s*[)）]$/);
  if (paren) { const v = vendorKey(paren[2]); if (v) return { vendor: v, rest: paren[1].trim() }; }
  const parts = s.split(/[/／]/);
  if (parts.length >= 2) { const v = vendorKey(parts[0]); if (v) return { vendor: v, rest: parts.slice(1).join('/').trim() }; }
  const dashed = s.match(/^([A-Za-z0-9\u4e00-\u9fa5]{2,7})\s*[-_\s]\s*(.+)$/);
  if (dashed) { const v = vendorKey(dashed[1]); if (v) return { vendor: v, rest: dashed[2].trim() }; }
  return { vendor: '', rest: s };
}

export function canonModel(raw) {
  const { vendor, rest } = splitVendor(raw);
  return { vendor, core: canonCore(rest) };
}

/** 查询侧缩写展开 */
export function queryCores(qc) {
  const cores = new Set([qc]);
  for (const [a, b] of [['sp2', 'spring2'], ['spring2', 'sp2'], ['apollo2', 'apollo'], ['apollo', 'apollo2']]) {
    if (qc.includes(a)) cores.add(qc.replaceAll(a, b));
  }
  return [...cores];
}

/** 省略尺寸段：spring2pro -> spring210pro（字母骨架相同且候选数字更多） */
export function gapScore(qc, core) {
  if (!/[a-z]$/.test(qc)) return 0;
  const qLetters = qc.replace(/\d/g, '');
  const cLetters = core.replace(/\d/g, '');
  if (!qLetters || qLetters !== cLetters) return 0;
  const qDigits = (qc.match(/\d/g) ?? []).length;
  const cDigits = (core.match(/\d/g) ?? []).length;
  return cDigits > qDigits ? 85 : 0;
}

export function scoreCore(qc, core) {
  if (core === qc) return 100;
  if (core.startsWith(qc)) return 70;
  if (core.includes(qc)) return 50;
  if (qc.includes(core)) {
    if (/[a-z]/.test(qc.split(core).join(''))) return 40;
  }
  const gap = gapScore(qc, core);
  if (gap) return gap;
  const qt = new Set(qc.match(/[a-z]+|\d+/g) ?? []);
  const gt = new Set(core.match(/[a-z]+|\d+/g) ?? []);
  const inter = [...qt].filter((x) => gt.has(x));
  return inter.length >= 2 ? 20 + 5 * inter.length : 0;
}

/**
 * @param {string} query 用户写的机型串
 * @param {Array} groups models.json 的 models（每组有 cores）
 * @returns {{hit: object|null, scored: Array<[number, object]>}}
 */
export function resolveModel(query, groups) {
  const { vendor: qv, core: qc } = canonModel(query);
  if (!qc) return { hit: null, scored: [] };
  const cores = queryCores(qc);
  const scored = [];
  for (const g of groups) {
    let score = 0;
    for (const c of g.cores ?? []) {
      for (const q of cores) score = Math.max(score, scoreCore(q, c));
    }
    if (qv && g.vendor === qv) score += 10;
    else if (qv && g.vendor && g.vendor !== qv) score -= 10;
    if (score >= 40) scored.push([score, g]);
  }
  scored.sort((a, b) => b[0] - a[0] || a[1].name.localeCompare(b[1].name));
  const top = scored[0];
  if (top) {
    // 精确命中(≥95)只被另一个精确命中阻断；gap 命中(85)才被同级 gap 阻断。
    // 这一处比 firmware-finder 略严：避免 "APOLLO X"(精确) 被 "APOLLO 12X"(gap 85) 拖成歧义。
    const strong = top[0] >= 95 ? 95 : 85;
    const rivals = scored.slice(1).filter(([sc]) => sc >= strong);
    // 文档机型没有厂商维度：查询带厂商前缀时不作为阻断条件（g.vendor 为空视为通配）
    if (rivals.length === 0 && top[0] >= strong && (!qv || !top[1].vendor || top[1].vendor === qv)) return { hit: top[1], scored };
  }
  return { hit: null, scored };
}

export function modelVariants(model) {
  const base = nz(model);
  const v = new Set([base]);
  if (base.includes('apollo2')) v.add(base.replaceAll('apollo2', 'apollo'));
  else if (base.includes('apollo')) v.add(base.replaceAll('apollo', 'apollo2'));
  if (base.includes('spring2')) v.add(base.replaceAll('spring2', 'sp2'));
  if (base.includes('sp2')) v.add(base.replaceAll('sp2', 'spring2'));
  return [...v].filter(Boolean);
}
