import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { AssetKind, ProjectDomain, ProjectType } from '@prisma/client';

export class ProjectSettingsDto {
  @IsOptional()
  @IsString()
  intended_use?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplines?: string[];

  @IsOptional()
  @IsBoolean()
  needs_3d_print?: boolean;

  @IsOptional()
  @IsString()
  material_notes?: string;

  @IsOptional()
  @IsString()
  target_platform?: string;
}

export class CreateProjectDto {
  @IsString()
  @MinLength(2)
  title!: string;

  @IsString()
  @MinLength(10)
  summary!: string;

  @IsString()
  @MinLength(20)
  description!: string;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  settings?: ProjectSettingsDto;

  @IsEnum(ProjectType)
  type!: ProjectType;

  @IsEnum(ProjectDomain)
  @IsOptional()
  domain?: ProjectDomain;

  @IsString()
  @IsOptional()
  parent_project_id?: string;
}

export class UpdateProjectDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @IsString()
  @MinLength(10)
  @IsOptional()
  summary?: string;

  @IsString()
  @MinLength(20)
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  goals?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsObject()
  @IsOptional()
  settings?: ProjectSettingsDto;

  @IsEnum(ProjectType)
  @IsOptional()
  type?: ProjectType;
}

export class UploadAssetDto {
  @IsEnum(AssetKind)
  kind!: AssetKind;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  is_cover?: boolean;
}

export class PublishShowcaseDto {
  @IsBoolean()
  published!: boolean;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  photos?: string[];

  @IsString()
  @IsOptional()
  public_description?: string;
}

export class ReviewProjectDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
