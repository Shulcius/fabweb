import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetKind, ProjectStatus, UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { createReadStream, existsSync } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { isAllowedExtension, StorageService } from '../files/storage.service';
import type { UploadAssetDto } from './dto/project.dto';

type AuthUser = { id: string; role: PrismaUserRole };

@Injectable()
export class ProjectAssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    projectId: string,
    dto: UploadAssetDto,
    file: Express.Multer.File,
    user: AuthUser,
  ) {
    await this.getProjectForEdit(projectId, user);
    if (!file) throw new BadRequestException('Файл не передан');
    if (!isAllowedExtension(dto.kind, file.originalname)) {
      throw new BadRequestException(`Недопустимое расширение для типа ${dto.kind}`);
    }

    const assetId = this.storage.newAssetId();
    const absPath = this.storage.assetPath(projectId, assetId, file.originalname);
    await this.storage.saveBuffer(absPath, file.buffer);

    if (dto.is_cover && dto.kind === AssetKind.photo) {
      await this.prisma.projectAsset.updateMany({
        where: { project_id: projectId, is_cover: true },
        data: { is_cover: false },
      });
    }

    return this.prisma.projectAsset.create({
      data: {
        id: assetId,
        project_id: projectId,
        kind: dto.kind,
        title: dto.title,
        description: dto.description ?? '',
        filename: file.originalname,
        storage_path: this.storage.relativePath(absPath),
        mime_type: file.mimetype || 'application/octet-stream',
        size_bytes: file.size,
        is_cover: dto.is_cover ?? false,
        uploaded_by: user.id,
      },
    });
  }

  async download(projectId: string, assetId: string, user: AuthUser) {
    await this.assertCanAccessProject(projectId, user);
    const asset = await this.prisma.projectAsset.findFirst({
      where: { id: assetId, project_id: projectId },
    });
    if (!asset) throw new NotFoundException('Файл не найден');

    const abs = this.storage.absolutePath(asset.storage_path);
    if (!existsSync(abs)) throw new NotFoundException('Файл отсутствует на диске');

    return { stream: createReadStream(abs), asset };
  }

  async remove(projectId: string, assetId: string, user: AuthUser) {
    await this.getProjectForEdit(projectId, user);
    const asset = await this.prisma.projectAsset.findFirst({
      where: { id: assetId, project_id: projectId },
    });
    if (!asset) throw new NotFoundException('Файл не найден');

    await this.storage.deleteFile(this.storage.absolutePath(asset.storage_path));
    await this.prisma.projectAsset.delete({ where: { id: assetId } });
    return { ok: true };
  }

  private async getProjectForEdit(projectId: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Проект не найден');
    if (user.role === UserRole.guest) throw new ForbiddenException('Нет доступа');
    if (user.role !== UserRole.admin && project.owner_id !== user.id) {
      throw new ForbiddenException('Нет прав');
    }
    if (project.status !== ProjectStatus.draft && user.role === UserRole.worker) {
      throw new ForbiddenException('Файлы можно менять только в черновике');
    }
    return project;
  }

  private async assertCanAccessProject(projectId: string, user: AuthUser) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { status: true, showcase_published: true },
    });
    if (!project) throw new NotFoundException('Проект не найден');
    if (user.role === UserRole.guest) {
      if (project.status !== ProjectStatus.completed || !project.showcase_published) {
        throw new ForbiddenException('Нет доступа');
      }
    }
  }
}
