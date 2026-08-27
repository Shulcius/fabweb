import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ProjectStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateProjectDto,
  PublishShowcaseDto,
  ReviewProjectDto,
  UpdateProjectDto,
  UploadAssetDto,
} from './dto/project.dto';
import { ProjectAssetsService } from './project-assets.service';
import { ProjectsService } from './projects.service';

type AuthUser = { id: string; role: UserRole };

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly assets: ProjectAssetsService,
  ) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: ProjectStatus,
    @Query('domain') domain?: string,
  ) {
    return this.projects.findAll(user, { status, domain });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.findOne(id, user);
  }

  @Get(':id/tree')
  getTree(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.getTree(id, user);
  }

  @Post()
  create(@Body() dto: CreateProjectDto, @CurrentUser() user: AuthUser) {
    return this.projects.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projects.update(id, dto, user);
  }

  @Post(':id/assets')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  uploadAsset(
    @Param('id') id: string,
    @Body() dto: UploadAssetDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.upload(id, dto, file, user);
  }

  @Get(':id/assets/:assetId/file')
  @Header('Cache-Control', 'private, max-age=3600')
  async downloadAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: AuthUser,
  ) {
    const { stream, asset } = await this.assets.download(id, assetId, user);
    return new StreamableFile(stream, {
      type: asset.mime_type,
      disposition: `inline; filename="${encodeURIComponent(asset.filename)}"`,
    });
  }

  @Delete(':id/assets/:assetId')
  removeAsset(
    @Param('id') id: string,
    @Param('assetId') assetId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.assets.remove(id, assetId, user);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.submitForReview(id, user);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.approve(id, user);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() _dto: ReviewProjectDto,
  ) {
    return this.projects.reject(id, user);
  }

  @Post(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.complete(id, user);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.projects.archive(id, user);
  }

  @Post(':id/showcase')
  publishShowcase(
    @Param('id') id: string,
    @Body() dto: PublishShowcaseDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projects.publishShowcase(id, dto, user);
  }
}
