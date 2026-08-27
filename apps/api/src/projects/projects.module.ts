import { Module } from '@nestjs/common';
import { FilesModule } from '../files/files.module';
import { ProjectAssetsService } from './project-assets.service';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [FilesModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectAssetsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
