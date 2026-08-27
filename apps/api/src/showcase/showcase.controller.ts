import { Controller, Get } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';

@Controller('showcase')
export class ShowcaseController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list() {
    return this.projects.getShowcase();
  }
}
