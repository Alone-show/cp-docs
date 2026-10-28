/**
 * 数据目录与加载：.cpdocs（会话工作区）→ DSH_CPDOCS_DIR → 默认目录 → cwd。
 * 加载结果按 mtime 缓存。
 */
import fs from 'node:fs';
import path from 'node:path';
import { importData } from './import.js';

const PKG_ROOT = path.resolve(import.meta.dirname, '..');
const BUNDLED_DATA = path.join(PKG_ROOT, 'data');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

const cache = new Map();

export async function resolveDataDir(ctx, agent, signal) {
  const candidates = [];
  if (process.env.DSH_CPDOCS_DIR) candidates.push(path.resolve(process.env.DSH_CPDOCS_DIR));
  const wd = ctx?.get?.('workingDirectory');
  if (wd && agent) {
    try {
      const dir = await wd.ensure(agent, signal);
      if (dir) candidates.push(path.join(dir, '.cpdocs'));
    } catch { /* 继续 */ }
  }
  if (wd?.defaultDirectory) candidates.push(path.join(wd.defaultDirectory, '.cpdocs'));
  candidates.push(path.join(process.cwd(), '.cpdocs'));
  const existing = candidates.find((d) => fs.existsSync(path.join(d, 'models.json')));
  if (existing) return existing;
  const dir = candidates[0];
  // 仓库自带 data/：首次使用复制到会话工作区 .cpdocs（失败则直接只读使用包内数据）
  if (fs.existsSync(path.join(BUNDLED_DATA, 'models.json'))) {
    try {
      copyDir(BUNDLED_DATA, dir);
      return dir;
    } catch {
      return BUNDLED_DATA;
    }
  }
  // 没有自带数据时尝试就地导入（首次使用）
  const src = wd?.defaultDirectory ? path.join(wd.defaultDirectory, 'work', 'cpdoc', 'ai-readable') : path.resolve('work/cpdoc/ai-readable');
  if (fs.existsSync(src)) {
    importData({ src, out: dir });
    return dir;
  }
  throw new Error(`没有本地资料索引（.cpdocs/models.json）。已查找：${candidates.join(' | ')}。请先运行：node plugins/cp-docs/lib/import.js`);
}

function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }

export function loadDataset(dir) {
  const file = path.join(dir, 'models.json');
  const st = fs.statSync(file);
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs) return hit.dataset;
  const dataset = readJson(file);
  cache.set(file, { mtimeMs: st.mtimeMs, dataset });
  return dataset;
}

export function loadModelFiles(dir, entry) {
  const read = (rel) => (rel && fs.existsSync(path.join(dir, rel)) ? readJson(path.join(dir, rel)) : null);
  return { spec: read(entry.spec), programming: read(entry.programming), workpoints: read(entry.workpoints) };
}
