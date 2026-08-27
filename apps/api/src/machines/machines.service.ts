import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ConnectorType,
  MachineStatus,
  MachineType,
  Prisma,
  UserRole,
  type UserRole as PrismaUserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateMachineDto,
  UpdateMachineDto,
  UpdateMachineStatusDto,
} from './dto/machine.dto';

type AuthUser = { id: string; role: PrismaUserRole };

@Injectable()
export class MachinesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    user: AuthUser,
    filters?: { type?: MachineType; status?: MachineStatus; enabled?: boolean },
  ) {
    this.assertCanView(user);
    const rows = await this.prisma.machine.findMany({
      where: {
        ...(filters?.type && { type: filters.type }),
        ...(filters?.status && { status: filters.status }),
        ...(filters?.enabled !== undefined && { enabled: filters.enabled }),
      },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
    return rows.map((m) => this.toDto(m));
  }

  async findOne(id: string, user: AuthUser) {
    this.assertCanView(user);
    const m = await this.prisma.machine.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Станок не найден');
    return this.toDto(m);
  }

  /** Заглушка live-status до подключения gateway */
  async getLiveStatus(id: string, user: AuthUser) {
    const m = await this.findOne(id, user);
    if (m.integration_status !== 'connected' || !m.connector.enabled) {
      return {
        connected: false,
        status: m.status,
        live_status: {
          message:
            'Коннектор ещё не подключён. Статус задаётся вручную. Интеграция — позже.',
          camera_url: m.camera_url,
          last_seen: null,
        },
      };
    }
    return {
      connected: true,
      status: m.status,
      live_status: m.live_status ?? {
        message: 'Ожидание данных от шлюза станка',
        last_seen: new Date().toISOString(),
      },
    };
  }

  async create(dto: CreateMachineDto, user: AuthUser) {
    this.assertAdmin(user);
    const created = await this.prisma.machine.create({
      data: {
        name: dto.name,
        type: dto.type,
        model: dto.model,
        purpose: dto.purpose ?? '',
        capabilities: dto.capabilities as Prisma.InputJsonValue,
        loaded_material: dto.loaded_material,
        status: dto.status ?? MachineStatus.offline,
        integration_status: dto.integration_status ?? 'stub',
        connector_type: dto.connector_type ?? ConnectorType.manual,
        connector_host: dto.connector_host,
        connector_port: dto.connector_port,
        connector_config: (dto.connector_config ?? {}) as Prisma.InputJsonValue,
        camera_url: dto.camera_url,
        image_url: dto.image_url,
        notes: dto.notes ?? '',
        sort_order: dto.sort_order ?? 0,
        enabled: dto.enabled ?? true,
      },
    });
    return this.toDto(created);
  }

  async update(id: string, dto: UpdateMachineDto, user: AuthUser) {
    await this.getRawOrThrow(id);
    if (user.role !== UserRole.admin && user.role !== UserRole.worker) {
      throw new ForbiddenException('Нет прав');
    }
    // worker может только статус / материал / motor_hours
    if (user.role === UserRole.worker) {
      const updated = await this.prisma.machine.update({
        where: { id },
        data: {
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.loaded_material !== undefined && {
            loaded_material: dto.loaded_material,
          }),
          ...(dto.motor_hours !== undefined && { motor_hours: dto.motor_hours }),
        },
      });
      return this.toDto(updated);
    }

    const updated = await this.prisma.machine.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.model !== undefined && { model: dto.model }),
        ...(dto.purpose !== undefined && { purpose: dto.purpose }),
        ...(dto.capabilities !== undefined && {
          capabilities: dto.capabilities as Prisma.InputJsonValue,
        }),
        ...(dto.loaded_material !== undefined && {
          loaded_material: dto.loaded_material,
        }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.integration_status !== undefined && {
          integration_status: dto.integration_status,
        }),
        ...(dto.connector_type !== undefined && {
          connector_type: dto.connector_type,
        }),
        ...(dto.connector_host !== undefined && {
          connector_host: dto.connector_host,
        }),
        ...(dto.connector_port !== undefined && {
          connector_port: dto.connector_port,
        }),
        ...(dto.connector_config !== undefined && {
          connector_config: dto.connector_config as Prisma.InputJsonValue,
        }),
        ...(dto.camera_url !== undefined && { camera_url: dto.camera_url }),
        ...(dto.image_url !== undefined && { image_url: dto.image_url }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.motor_hours !== undefined && { motor_hours: dto.motor_hours }),
        ...(dto.sort_order !== undefined && { sort_order: dto.sort_order }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    });
    return this.toDto(updated);
  }

  async updateStatus(id: string, dto: UpdateMachineStatusDto, user: AuthUser) {
    await this.getRawOrThrow(id);
    if (
      user.role !== UserRole.admin &&
      user.role !== UserRole.worker &&
      user.role !== UserRole.supervisor
    ) {
      throw new ForbiddenException('Нет прав');
    }
    const updated = await this.prisma.machine.update({
      where: { id },
      data: { status: dto.status },
    });
    return this.toDto(updated);
  }

  private async getRawOrThrow(id: string) {
    const m = await this.prisma.machine.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Станок не найден');
    return m;
  }

  private assertCanView(user: AuthUser) {
    if (user.role === UserRole.guest) throw new ForbiddenException('Нет доступа');
  }

  private assertAdmin(user: AuthUser) {
    if (user.role !== UserRole.admin) throw new ForbiddenException('Только администратор');
  }

  private toDto(m: {
    id: string;
    name: string;
    type: MachineType;
    model: string;
    purpose: string;
    capabilities: Prisma.JsonValue;
    loaded_material: string | null;
    motor_hours: number;
    status: MachineStatus;
    integration_status: string;
    connector_type: ConnectorType;
    connector_host: string | null;
    connector_port: number | null;
    connector_config: Prisma.JsonValue;
    live_status: Prisma.JsonValue | null;
    camera_url: string | null;
    image_url: string | null;
    notes: string;
    sort_order: number;
    enabled: boolean;
    created_at: Date;
    updated_at: Date;
  }) {
    return {
      id: m.id,
      name: m.name,
      type: m.type,
      model: m.model,
      purpose: m.purpose,
      capabilities: m.capabilities,
      loaded_material: m.loaded_material,
      motor_hours: m.motor_hours,
      status: m.status,
      integration_status: m.integration_status,
      connector: {
        type: m.connector_type,
        host: m.connector_host ?? undefined,
        port: m.connector_port ?? undefined,
        enabled: m.integration_status === 'connected',
        config: (m.connector_config as Record<string, unknown>) ?? {},
      },
      live_status: m.live_status,
      camera_url: m.camera_url,
      image_url: m.image_url,
      notes: m.notes,
      sort_order: m.sort_order,
      enabled: m.enabled,
      created_at: m.created_at.toISOString(),
      updated_at: m.updated_at.toISOString(),
    };
  }
}
