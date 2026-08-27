import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DeductionMode,
  Prisma,
  UserRole,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
  WorkOrderTech,
  type UserRole as PrismaUserRole,
} from '@prisma/client';
import { calculateCost, type CostInput } from '@fabweb/costing';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateWorkOrderDto,
  ReviewWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
} from './dto/workorder.dto';

type AuthUser = { id: string; role: PrismaUserRole };

const PRIORITY_RANK: Record<WorkOrderPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const workOrderSelect = {
  id: true,
  title: true,
  notes: true,
  source: true,
  priority: true,
  status: true,
  tech: true,
  deduction_mode: true,
  project_id: true,
  artifact_id: true,
  requested_by: true,
  approved_by: true,
  machine_id: true,
  queue_position: true,
  cost_input: true,
  cost_breakdown: true,
  sub_jobs: true,
  created_at: true,
  updated_at: true,
  requester: { select: { id: true, full_name: true, email: true } },
  approver: { select: { id: true, full_name: true, email: true } },
  project: { select: { id: true, title: true } },
} as const;

/** Allowed transitions: from → to[] */
const TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  draft: [WorkOrderStatus.pending_approval, WorkOrderStatus.approved, WorkOrderStatus.cancelled],
  pending_approval: [
    WorkOrderStatus.approved,
    WorkOrderStatus.draft,
    WorkOrderStatus.cancelled,
  ],
  approved: [WorkOrderStatus.queued, WorkOrderStatus.cancelled],
  queued: [
    WorkOrderStatus.assigned,
    WorkOrderStatus.in_progress,
    WorkOrderStatus.cancelled,
  ],
  assigned: [WorkOrderStatus.in_progress, WorkOrderStatus.queued, WorkOrderStatus.cancelled],
  in_progress: [
    WorkOrderStatus.post_process,
    WorkOrderStatus.done,
    WorkOrderStatus.failed,
    WorkOrderStatus.cancelled,
  ],
  post_process: [WorkOrderStatus.done, WorkOrderStatus.failed],
  done: [],
  failed: [WorkOrderStatus.queued],
  cancelled: [],
};

@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    filters?: {
      status?: WorkOrderStatus;
      priority?: WorkOrderPriority;
      tech?: WorkOrderTech;
    },
  ) {
    this.assertCanAccess(user);
    return this.prisma.workOrder.findMany({
      where: {
        ...(filters?.status && { status: filters.status }),
        ...(filters?.priority && { priority: filters.priority }),
        ...(filters?.tech && { tech: filters.tech }),
      },
      select: workOrderSelect,
      orderBy: [{ updated_at: 'desc' }],
    });
  }

  async getQueue(user: AuthUser) {
    this.assertCanAccess(user);
    const items = await this.prisma.workOrder.findMany({
      where: {
        status: {
          in: [
            WorkOrderStatus.queued,
            WorkOrderStatus.assigned,
            WorkOrderStatus.in_progress,
            WorkOrderStatus.post_process,
          ],
        },
      },
      select: workOrderSelect,
    });

    return items.sort((a, b) => {
      const pr = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
      if (pr !== 0) return pr;
      const qa = a.queue_position ?? Number.MAX_SAFE_INTEGER;
      const qb = b.queue_position ?? Number.MAX_SAFE_INTEGER;
      return qa - qb;
    });
  }

  async findOne(id: string, user: AuthUser) {
    this.assertCanAccess(user);
    return this.getOrThrow(id);
  }

  async create(dto: CreateWorkOrderDto, user: AuthUser) {
    this.assertCanCreate(user);

    if (dto.project_id) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.project_id } });
      if (!project) throw new BadRequestException('Проект не найден');
    }

    const cost_breakdown = dto.cost_input
      ? this.calcBreakdown(dto.tech, dto.cost_input)
      : undefined;

    const fastTrack =
      dto.fast_track === true &&
      (user.role === UserRole.admin || user.role === UserRole.supervisor);

    const status = fastTrack ? WorkOrderStatus.approved : WorkOrderStatus.draft;

    return this.prisma.workOrder.create({
      data: {
        title: dto.title,
        notes: dto.notes ?? '',
        source: dto.source ?? WorkOrderSource.commercial,
        priority: dto.priority ?? WorkOrderPriority.normal,
        tech: dto.tech,
        deduction_mode: dto.deduction_mode ?? DeductionMode.manual,
        project_id: dto.project_id,
        artifact_id: dto.artifact_id,
        requested_by: user.id,
        approved_by: fastTrack ? user.id : undefined,
        status,
        cost_input: dto.cost_input
          ? (dto.cost_input as Prisma.InputJsonValue)
          : undefined,
        cost_breakdown: cost_breakdown
          ? (cost_breakdown as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      select: workOrderSelect,
    });
  }

  async update(id: string, dto: UpdateWorkOrderDto, user: AuthUser) {
    const wo = await this.getOrThrow(id);
    this.assertCanEdit(wo, user);

    if (wo.status !== WorkOrderStatus.draft && user.role === UserRole.worker) {
      throw new ForbiddenException('Редактировать можно только черновик');
    }

    const cost_breakdown = dto.cost_input
      ? this.calcBreakdown(wo.tech, dto.cost_input)
      : undefined;

    const data: Prisma.WorkOrderUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.notes !== undefined && { notes: dto.notes }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.deduction_mode !== undefined && { deduction_mode: dto.deduction_mode }),
      ...(dto.cost_input !== undefined && {
        cost_input: dto.cost_input as Prisma.InputJsonValue,
        cost_breakdown: cost_breakdown as unknown as Prisma.InputJsonValue,
      }),
    };

    if (dto.project_id !== undefined) {
      data.project = dto.project_id
        ? { connect: { id: dto.project_id } }
        : { disconnect: true };
    }
    if (dto.artifact_id !== undefined) {
      data.artifact_id = dto.artifact_id;
    }

    return this.prisma.workOrder.update({
      where: { id },
      data,
      select: workOrderSelect,
    });
  }

  async submit(id: string, user: AuthUser) {
    const wo = await this.getOrThrow(id);
    this.assertCanEdit(wo, user);
    if (wo.status !== WorkOrderStatus.draft) {
      throw new BadRequestException('На согласование можно отправить только черновик');
    }
    return this.prisma.workOrder.update({
      where: { id },
      data: { status: WorkOrderStatus.pending_approval },
      select: workOrderSelect,
    });
  }

  async approve(id: string, user: AuthUser, _dto?: ReviewWorkOrderDto) {
    this.assertCanApprove(user);
    const wo = await this.getOrThrow(id);
    if (
      wo.status !== WorkOrderStatus.pending_approval &&
      wo.status !== WorkOrderStatus.draft
    ) {
      throw new BadRequestException('Нельзя одобрить заказ в текущем статусе');
    }
    // Only admin may approve commercial pending; supervisor may fast-track draft
    if (
      wo.status === WorkOrderStatus.pending_approval &&
      user.role !== UserRole.admin
    ) {
      throw new ForbiddenException('Согласование коммерческого заказа — только администратор');
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.approved,
        approved_by: user.id,
      },
      select: workOrderSelect,
    });
  }

  async reject(id: string, user: AuthUser, _dto?: ReviewWorkOrderDto) {
    if (user.role !== UserRole.admin) {
      throw new ForbiddenException('Отклонить может только администратор');
    }
    const wo = await this.getOrThrow(id);
    if (wo.status !== WorkOrderStatus.pending_approval) {
      throw new BadRequestException('Отклонить можно только заявку на согласовании');
    }
    return this.prisma.workOrder.update({
      where: { id },
      data: { status: WorkOrderStatus.draft },
      select: workOrderSelect,
    });
  }

  async enqueue(id: string, user: AuthUser) {
    this.assertCanAccess(user);
    if (user.role === UserRole.guest) throw new ForbiddenException('Нет доступа');
    const wo = await this.getOrThrow(id);
    if (wo.status !== WorkOrderStatus.approved) {
      throw new BadRequestException('В очередь можно поставить только одобренный заказ');
    }

    const maxPos = await this.prisma.workOrder.aggregate({
      where: { status: WorkOrderStatus.queued },
      _max: { queue_position: true },
    });
    const nextPos = (maxPos._max.queue_position ?? 0) + 1;

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        status: WorkOrderStatus.queued,
        queue_position: nextPos,
      },
      select: workOrderSelect,
    });
  }

  async updateStatus(id: string, dto: UpdateWorkOrderStatusDto, user: AuthUser) {
    this.assertCanAccess(user);
    const wo = await this.getOrThrow(id);
    const next = dto.status;

    if (!TRANSITIONS[wo.status].includes(next)) {
      throw new BadRequestException(`Переход ${wo.status} → ${next} запрещён`);
    }

    this.assertStatusChange(wo, next, user);

    const data: {
      status: WorkOrderStatus;
      approved_by?: string;
      queue_position?: number | null;
    } = { status: next };

    if (next === WorkOrderStatus.approved) {
      data.approved_by = user.id;
    }
    if (next === WorkOrderStatus.queued && wo.queue_position == null) {
      const maxPos = await this.prisma.workOrder.aggregate({
        where: { status: WorkOrderStatus.queued },
        _max: { queue_position: true },
      });
      data.queue_position = (maxPos._max.queue_position ?? 0) + 1;
    }
    if (next === WorkOrderStatus.cancelled || next === WorkOrderStatus.done) {
      data.queue_position = null;
    }

    return this.prisma.workOrder.update({
      where: { id },
      data,
      select: workOrderSelect,
    });
  }

  private calcBreakdown(tech: WorkOrderTech, raw: Record<string, unknown>) {
    try {
      const input = { ...raw, tech } as CostInput;
      return calculateCost(input);
    } catch {
      throw new BadRequestException('Некорректные параметры калькулятора');
    }
  }

  private async getOrThrow(id: string) {
    const wo = await this.prisma.workOrder.findUnique({
      where: { id },
      select: workOrderSelect,
    });
    if (!wo) throw new NotFoundException('Заказ не найден');
    return wo;
  }

  private assertCanAccess(user: AuthUser) {
    if (user.role === UserRole.guest) throw new ForbiddenException('Нет доступа');
  }

  private assertCanCreate(user: AuthUser) {
    if (user.role === UserRole.guest) throw new ForbiddenException('Нет доступа');
  }

  private assertCanEdit(
    wo: { requested_by: string; status: WorkOrderStatus },
    user: AuthUser,
  ) {
    if (user.role === UserRole.admin || user.role === UserRole.supervisor) return;
    if (user.role === UserRole.worker && wo.requested_by === user.id) return;
    throw new ForbiddenException('Нет прав на изменение');
  }

  private assertCanApprove(user: AuthUser) {
    if (user.role !== UserRole.admin && user.role !== UserRole.supervisor) {
      throw new ForbiddenException('Нет прав на согласование');
    }
  }

  private assertStatusChange(
    wo: { requested_by: string; status: WorkOrderStatus },
    next: WorkOrderStatus,
    user: AuthUser,
  ) {
    if (user.role === UserRole.admin) return;

    if (next === WorkOrderStatus.approved) {
      if (user.role === UserRole.supervisor && wo.status === WorkOrderStatus.draft) return;
      throw new ForbiddenException('Нет прав на одобрение');
    }

    if (next === WorkOrderStatus.pending_approval || next === WorkOrderStatus.cancelled) {
      if (wo.requested_by === user.id || user.role === UserRole.supervisor) return;
      throw new ForbiddenException('Нет прав');
    }

    const floor: WorkOrderStatus[] = [
      WorkOrderStatus.queued,
      WorkOrderStatus.assigned,
      WorkOrderStatus.in_progress,
      WorkOrderStatus.post_process,
      WorkOrderStatus.done,
      WorkOrderStatus.failed,
    ];
    if (floor.includes(next)) {
      if (user.role === UserRole.worker || user.role === UserRole.supervisor) return;
      throw new ForbiddenException('Нет прав');
    }
  }
}
