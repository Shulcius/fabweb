import { Injectable } from '@nestjs/common';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  getDataDir(): string {
    return process.env.DATA_DIR ?? join(process.cwd(), 'data');
  }

  async ensureProjectDir(projectId: string): Promise<string> {
    const dir = this.projectDir(projectId);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  projectDir(projectId: string): string {
    return join(this.getDataDir(), 'projects', projectId);
  }

  assetPath(projectId: string, assetId: string, filename: string): string {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return join(this.projectDir(projectId), 'assets', assetId, safe);
  }

  relativePath(absolute: string): string {
    const base = this.getDataDir();
    return absolute.startsWith(base) ? absolute.slice(base.length + 1) : absolute;
  }

  absolutePath(relative: string): string {
    return join(this.getDataDir(), relative);
  }

  async saveBuffer(absPath: string, buffer: Buffer): Promise<void> {
    await mkdir(join(absPath, '..'), { recursive: true });
    await writeFile(absPath, buffer);
  }

  async deleteFile(absPath: string): Promise<void> {
    try {
      await unlink(absPath);
    } catch {
      /* ignore missing */
    }
  }

  newAssetId(): string {
    return randomUUID();
  }
}

export const ASSET_EXTENSIONS: Record<string, string[]> = {
  photo: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  document: ['.pdf', '.doc', '.docx', '.txt', '.md', '.csv'],
  model_3d: ['.stl', '.step', '.stp', '.3mf', '.obj', '.dxf'],
  pcb: ['.kicad_pcb', '.kicad_sch', '.gbr', '.gtl', '.gbl', '.zip'],
  firmware: ['.hex', '.bin', '.ino', '.cpp', '.c', '.h', '.py'],
  other: [],
};

export function detectKindByFilename(name: string): string | null {
  const ext = extname(name).toLowerCase();
  for (const [kind, exts] of Object.entries(ASSET_EXTENSIONS)) {
    if (exts.includes(ext)) return kind;
  }
  return null;
}

export function isAllowedExtension(kind: string, filename: string): boolean {
  const ext = extname(filename).toLowerCase();
  const allowed = ASSET_EXTENSIONS[kind];
  if (!allowed?.length) return true;
  return allowed.includes(ext);
}
