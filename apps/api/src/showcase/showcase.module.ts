import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { ShowcaseController } from './showcase.controller';

@Module({
  imports: [ProjectsModule],
  controllers: [ShowcaseController],
})
export class ShowcaseModule {}
