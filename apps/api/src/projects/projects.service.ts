import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetKind, ProjectStatus, UserRole, type UserRole as PrismaUserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../files/storage.service';
import type { CreateProjectDto, PublishShowcaseDto, UpdateProjectDto } from './dto/project.dto';

type AuthUser = { id: string; role: PrismaUserRole };

const projectSelect = {
  id: true,
  title: true,
  summary: true,
  description: true,
  goals: true,
  tags: true,
  settings: true,
  type: true,
  domain: true,
  status: true,
  parent_project_id: true,
  owner_id: true,
  showcase_published: true,
  showcase_photos: true,
  showcase_description: true,
  created_at: true,
  updated_at: true,
  owner: { select: { id: true, full_name: true, email: true } },
  assets: {
    orderBy: { created_at: 'asc' as const },
    select: {
      id: true,
      kind: true,
      title: true,
      description: true,
      filename: true,
      mime_type: true,
      size_bytes: true,
      is_cover: true,
      version: true,
      created_at: true,
      uploaded_by: true,
    },
  },
} as const;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async findAll(user: AuthUser, filters?: { status?: ProjectStatus; domain?: string }) {
    if (user.role === UserRole.guest) {
      return this.prisma.project.findMany({
        where: { status: ProjectStatus.completed, showcase_published: true },
        select: projectSelect,
        orderBy: { updated_at: 'desc' },
      });
    }
    return this.prisma.project.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.domain && { domain: filters.domain as never }),
      },
      select: projectSelect,
      orderBy: { updated_at: 'desc' },
    });
  }

  async findOne(id: string, user: AuthUser) {
    const project = await this.getProjectOrThrow(id);
    this.assertCanView(project, user);
    return project;
  }

  async create(dto: CreateProjectDto, user: AuthUser) {
    this.assertNotGuest(user);
    if (dto.parent_project_id) {
      const parent = await this.getProjectOrThrow(dto.parent_project_id);
      if (parent.status === ProjectStatus.archived) {
        throw new BadRequestException('Нельзя создать ветку от архивного проекта');
      }
    }

    const project = await this.prisma.project.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        description: dto.description,
        goals: dto.goals ?? '',
        tags: dto.tags ?? [],
        settings: (dto.settings ?? {}) as object,
        type: dto.type,
        domain: dto.domain ?? 'design_bureau',
        owner_id: user.id,
        parent_project_id: dto.parent_project_id,
      },
      select: projectSelect,
    });

    await this.storage.ensureProjectDir(project.id);
    return project;
  }

  async update(id: string, dto: UpdateProjectDto, user: AuthUser) {
    const project = await this.getProjectOrThrow(id);
    this.assertCanEdit(project, user);
    if (project.status !== ProjectStatus.draft && user.role === UserRole.worker) {
      throw new ForbiddenException('Редактировать можно только черновики');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.goals !== undefined && { goals: dto.goals }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.settings !== undefined && { settings: dto.settings as object }),
        ...(dto.type !== undefined && { type: dto.type }),
      },
      select: projectSelect,
    });
  }

  async submitForReview(id: string, user: AuthUser) {
    const project = await this.getProjectOrThrow(id);
    this.assertCanEdit(project, user);
    this.assertStatus(project, ProjectStatus.draft, 'Только черновик можно отправить на проверку');
    this.assertProjectComplete(project);

    return this.transition(id, ProjectStatus.pending_review);
  }

  async approve(id: string, user: AuthUser) {
    this.assertReviewer(user);
    const project = await this.getProjectOrThrow(id);
    if (project.status === ProjectStatus.draft) {
      this.assertProjectComplete(project);
      return this.transition(id, ProjectStatus.active);
    }
    this.assertStatus(project, ProjectStatus.pending_review, 'Проект не на проверке');
    return this.transition(id, ProjectStatus.active);
  }

  async reject(id: string, user: AuthUser) {
    this.assertReviewer(user);
    const project = await this.getProjectOrThrow(id);
    this.assertStatus(project, ProjectStatus.pending_review, 'Проект не на проверке');
    return this.transition(id, ProjectStatus.draft);
  }

  async complete(id: string, user: AuthUser) {
    const project = await this.getProjectOrThrow(id);
    this.assertCanEdit(project, user);
    this.assertStatus(project, ProjectStatus.active, 'Завершить можно только активный проект');
    return this.transition(id, ProjectStatus.completed);
  }

  async archive(id: string, user: AuthUser) {
    const project = await this.getProjectOrThrow(id);
    if (user.role !== UserRole.admin && project.owner_id !== user.id) {
      throw new ForbiddenException('Нет прав на архивацию');
    }
    this.assertStatus(project, ProjectStatus.completed, 'Архивировать можно только завершённый проект');
    return this.transition(id, ProjectStatus.archived);
  }

  async getTree(id: string, user: AuthUser) {
    const root = await this.findOne(id, user);
    const branches = await this.prisma.project.findMany({
      where: { OR: [{ id }, { parent_project_id: id }] },
      select: projectSelect,
      orderBy: { created_at: 'asc' },
    });
    return { root, branches };
  }

  async publishShowcase(id: string, dto: PublishShowcaseDto, user: AuthUser) {
    const project = await this.getProjectOrThrow(id);
    if (user.role === UserRole.guest) throw new ForbiddenException('Нет доступа');
    if (project.status !== ProjectStatus.completed) {
      throw new BadRequestException('Витрина доступна только для завершённых проектов');
    }
    if (user.role === UserRole.worker && project.owner_id !== user.id) {
      throw new ForbiddenException('Только владелец, администратор или научный руководитель');
    }

    const photoUrls =
      dto.photos ??
      project.assets
        .filter((a) => a.kind === AssetKind.photo)
        .map((a) => `/api/v1/projects/${id}/assets/${a.id}/file`);

    return this.prisma.project.update({
      where: { id },
      data: {
        showcase_published: dto.published,
        showcase_photos: photoUrls,
        showcase_description: dto.public_description ?? project.showcase_description,
      },
      select: projectSelect,
    });
  }

  async getShowcase() {
    const projects = await this.prisma.project.findMany({
      where: { status: ProjectStatus.completed, showcase_published: true },
      select: projectSelect,
      orderBy: { updated_at: 'desc' },
    });
    return projects.map((p) => ({
      id: p.id,
      title: p.title,
      showcase_description: p.showcase_description || p.summary,
      showcase_photos: p.showcase_photos,
      type: p.type,
      tags: p.tags,
      owner: p.owner,
      updated_at: p.updated_at,
      cover_asset: p.assets.find((a) => a.is_cover) ?? p.assets.find((a) => a.kind === AssetKind.photo),
    }));
  }

  private assertProjectComplete(project: {
    summary: string;
    description: string;
    assets: { kind: string }[];
  }) {
    if (project.summary.trim().length < 10) {
      throw new BadRequestException('Краткое описание — минимум 10 символов');
    }
    if (project.description.trim().length < 20) {
      throw new BadRequestException('Полное описание — минимум 20 символов');
    }
    if (project.assets.length === 0) {
      throw new BadRequestException('Добавьте хотя бы один файл (фото, документ, модель)');
    }
    const hasPhoto = project.assets.some((a) => a.kind === AssetKind.photo);
    if (!hasPhoto) {
      throw new BadRequestException('Добавьте хотя бы одно фото проекта');
    }
  }

  private async transition(id: string, status: ProjectStatus) {
    return this.prisma.project.update({
      where: { id },
      data: { status },
      select: projectSelect,
    });
  }

  private async getProjectOrThrow(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: projectSelect,
    });
    if (!project) throw new NotFoundException('Проект не найден');
    return project;
  }

  private assertNotGuest(user: AuthUser) {
    if (user.role === UserRole.guest) {
      throw new ForbiddenException('Гостям недоступно создание проектов');
    }
  }

  private assertReviewer(user: AuthUser) {
    if (user.role !== UserRole.admin && user.role !== UserRole.supervisor) {
      throw new ForbiddenException('Согласование доступно администратору и научному руководителю');
    }
  }

  private assertCanView(
    project: { status: ProjectStatus; showcase_published: boolean; owner_id: string },
    user: AuthUser,
  ) {
    if (user.role === UserRole.guest) {
      if (project.status !== ProjectStatus.completed || !project.showcase_published) {
        throw new ForbiddenException('Проект недоступен');
      }
    }
  }

  private assertCanEdit(project: { owner_id: string }, user: AuthUser) {
    this.assertNotGuest(user);
    if (user.role !== UserRole.admin && project.owner_id !== user.id) {
      throw new ForbiddenException('Нет прав на редактирование');
    }
  }

  private assertStatus(
    project: { status: ProjectStatus },
    expected: ProjectStatus,
    message: string,
  ) {
    if (project.status !== expected) throw new BadRequestException(message);
  }
}
