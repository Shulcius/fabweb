import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  WorkOrderPriority,
  WorkOrderStatus,
  WorkOrderTech,
  UserRole,
} from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateWorkOrderDto,
  ReviewWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
} from './dto/workorder.dto';
import { WorkOrdersService } from './workorders.service';

type AuthUser = { id: string; role: UserRole };

@Controller('workorders')
@UseGuards(JwtAuthGuard)
export class WorkOrdersController {
  constructor(private readonly workorders: WorkOrdersService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: WorkOrderStatus,
    @Query('priority') priority?: WorkOrderPriority,
    @Query('tech') tech?: WorkOrderTech,
  ) {
    return this.workorders.findAll(user, { status, priority, tech });
  }

  @Get('queue')
  getQueue(@CurrentUser() user: AuthUser) {
    return this.workorders.getQueue(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workorders.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateWorkOrderDto, @CurrentUser() user: AuthUser) {
    return this.workorders.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workorders.update(id, dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workorders.updateStatus(id, dto, user);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workorders.submit(id, user);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewWorkOrderDto,
  ) {
    return this.workorders.approve(id, user, dto);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReviewWorkOrderDto,
  ) {
    return this.workorders.reject(id, user, dto);
  }

  @Post(':id/enqueue')
  enqueue(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.workorders.enqueue(id, user);
  }
}
