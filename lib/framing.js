/**
 * 把事实块渲染成给模型看的用户消息。
 */
const RULE = '以上数值必须原样使用，不要改写、不要补充未列出的参数；资料未收录的字段请直接回答“文档未收录”，不要推测。';

function fmtFields(fields) {
  return fields.map((f) => `- ${f.label}：${f.value}${f.unit && !String(f.value).includes(f.unit) ? ' ' + f.unit : ''}`);
}

function fmtRow(r) {
  const cells = (r.header || []).map((h, i) => `${h}=${(r.row || [])[i] ?? ''}`).join(' | ');
  const where = [r.section, r.caption].filter(Boolean).join(' / ');
  return `- ${where ? where + '：' : ''}${cells}`;
}

export function buildFraming({ question, entry, facts, extraNotes = [], sources = [] }) {
  const lines = [];
  lines.push('【cp-docs 检索结果 · 请只依据以下事实回答，不要补充未列出的数值】');
  lines.push(`用户问题：${question || '（未提供）'}`);
  lines.push(`命中机型：${entry.id} ${entry.model}（系列 ${entry.family || '-'}）`);
  if (entry.aliases?.length) lines.push(`同机型写法：${entry.aliases.join(' / ')}`);
  if (facts.fields?.length) {
    lines.push('参数：');
    lines.push(...fmtFields(facts.fields));
  }
  if (facts.rows?.length) {
    lines.push('表格定义：');
    for (const r of facts.rows.slice(0, 12)) lines.push(fmtRow(r));
  }
  if (facts.nodes?.length) {
    lines.push('编程节点（设备节点）：');
    for (const n of facts.nodes.slice(0, 12)) {
      lines.push(`- ${(n.row || []).join(' | ')}（${n.page}）`);
    }
  }
  if (facts.workpoints?.length) {
    lines.push('硬件工作点：');
    for (const w of facts.workpoints.slice(0, 12)) lines.push(`- ${w.signal} → ${w.value}（${w.cpCode}）`);
  }
  const notes = [...(facts.notes || []), ...extraNotes];
  if (notes.length) {
    lines.push('数据提示：');
    for (const n of notes) lines.push(`- ${n}`);
  }
  const src = [];
  if (entry.doc_url) src.push(`文档页 ${entry.doc_url}`);
  for (const s of sources) if (s) src.push(s);
  if (src.length) lines.push(`来源：${src.join('；')}`);
  lines.push(RULE);
  return lines.join('\n');
}

export function renderCandidates({ query, scored }) {
  const lines = [`机型「${query}」不唯一，请用更精确的写法重发 /cp-docs：`, ''];
  for (const [score, g] of scored.slice(0, 6)) {
    lines.push(`- ${g.id} ${g.model}${g.aliases?.length ? `（${g.aliases.slice(0, 2).join(' / ')}）` : ''}`);
  }
  lines.push('', '例：/cp-docs SPRING 10 PRO 二代 的屏幕尺寸');
  return lines.join('\n');
}

export function renderCatalog(models) {
  const families = new Map();
  for (const m of models) {
    const k = m.family || '其他';
    if (!families.has(k)) families.set(k, []);
    families.get(k).push(m);
  }
  const lines = [`共 ${models.length} 款机型：`];
  for (const [family, list] of families) {
    lines.push('', `【${family}】`);
    for (const m of list) lines.push(`- ${m.id} ${m.model}`);
  }
  return lines.join('\n');
}
