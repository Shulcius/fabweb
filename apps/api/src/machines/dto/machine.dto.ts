import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ConnectorType, MachineStatus, MachineType } from '@prisma/client';

export class MachineCapabilitiesDto {
  @IsOptional()
  materials?: string[];

  @IsOptional()
  @IsNumber()
  max_temp_c?: number;

  @IsOptional()
  @IsObject()
  bed_size?: { x: number; y: number; z: number };

  @IsOptional()
  @IsNumber()
  max_power_pct?: number;
}

export class CreateMachineDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(MachineType)
  type!: MachineType;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsObject()
  capabilities!: MachineCapabilitiesDto;

  @IsString()
  @IsOptional()
  loaded_material?: string;

  @IsEnum(MachineStatus)
  @IsOptional()
  status?: MachineStatus;

  @IsString()
  @IsOptional()
  integration_status?: string;

  @IsEnum(ConnectorType)
  @IsOptional()
  connector_type?: ConnectorType;

  @IsString()
  @IsOptional()
  connector_host?: string;

  @IsInt()
  @IsOptional()
  connector_port?: number;

  @IsObject()
  @IsOptional()
  connector_config?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  camera_url?: string;

  @IsString()
  @IsOptional()
  image_url?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsInt()
  @IsOptional()
  sort_order?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateMachineDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @IsEnum(MachineType)
  @IsOptional()
  type?: MachineType;

  @IsString()
  @IsOptional()
  model?: string;

  @IsString()
  @IsOptional()
  purpose?: string;

  @IsObject()
  @IsOptional()
  capabilities?: MachineCapabilitiesDto;

  @IsString()
  @IsOptional()
  loaded_material?: string | null;

  @IsEnum(MachineStatus)
  @IsOptional()
  status?: MachineStatus;

  @IsString()
  @IsOptional()
  integration_status?: string;

  @IsEnum(ConnectorType)
  @IsOptional()
  connector_type?: ConnectorType;

  @IsString()
  @IsOptional()
  connector_host?: string | null;

  @IsInt()
  @IsOptional()
  connector_port?: number | null;

  @IsObject()
  @IsOptional()
  connector_config?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  camera_url?: string | null;

  @IsString()
  @IsOptional()
  image_url?: string | null;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  motor_hours?: number;

  @IsInt()
  @IsOptional()
  sort_order?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateMachineStatusDto {
  @IsEnum(MachineStatus)
  status!: MachineStatus;
}
