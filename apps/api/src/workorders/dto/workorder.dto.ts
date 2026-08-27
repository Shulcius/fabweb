import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  DeductionMode,
  WorkOrderPriority,
  WorkOrderSource,
  WorkOrderStatus,
  WorkOrderTech,
} from '@prisma/client';

export class CreateWorkOrderDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(WorkOrderSource)
  @IsOptional()
  source?: WorkOrderSource;

  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @IsEnum(WorkOrderTech)
  tech!: WorkOrderTech;

  @IsEnum(DeductionMode)
  @IsOptional()
  deduction_mode?: DeductionMode;

  @IsString()
  @IsOptional()
  project_id?: string;

  @IsString()
  @IsOptional()
  artifact_id?: string;

  @IsObject()
  @IsOptional()
  cost_input?: Record<string, unknown>;

  /** Admin/supervisor: сразу одобрить (fast-track) */
  @IsBoolean()
  @IsOptional()
  fast_track?: boolean;
}

export class UpdateWorkOrderDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(WorkOrderPriority)
  @IsOptional()
  priority?: WorkOrderPriority;

  @IsEnum(DeductionMode)
  @IsOptional()
  deduction_mode?: DeductionMode;

  @IsString()
  @IsOptional()
  project_id?: string | null;

  @IsString()
  @IsOptional()
  artifact_id?: string | null;

  @IsObject()
  @IsOptional()
  cost_input?: Record<string, unknown>;
}

export class UpdateWorkOrderStatusDto {
  @IsEnum(WorkOrderStatus)
  status!: WorkOrderStatus;
}

export class ReviewWorkOrderDto {
  @IsString()
  @IsOptional()
  comment?: string;
}
