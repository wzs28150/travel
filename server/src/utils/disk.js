import fs from 'fs';
import path from 'path';
import { config } from '../config.js';

// 读取某目录所在文件系统的「可用空间」（字节）
// 返回非特权用户可用的剩余字节数（bavail * bsize）；出错兜底返回 0。
export function getFreeDiskBytes(dir) {
  try {
    const abs = path.isAbsolute(dir) ? dir : path.resolve(process.cwd(), dir);
    try {
      fs.accessSync(abs);
    } catch (e) {
      fs.mkdirSync(abs, { recursive: true });
    }
    const st = fs.statfsSync(abs);
    if (!st || !st.bavail || !st.bsize) return 0;
    return Number(st.bavail) * Number(st.bsize);
  } catch (e) {
    console.error('[disk] 读取可用空间失败：', e.message);
    return 0;
  }
}
