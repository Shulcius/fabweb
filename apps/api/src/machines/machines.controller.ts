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
import { MachineStatus, MachineType, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateMachineDto,
  UpdateMachineDto,
  UpdateMachineStatusDto,
} from './dto/machine.dto';
import { MachinesService } from './machines.service';

type AuthUser = { id: string; role: UserRole };

@Controller('machines')
@UseGuards(JwtAuthGuard)
export class MachinesController {
  constructor(private readonly machines: MachinesService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('type') type?: MachineType,
    @Query('status') status?: MachineStatus,
    @Query('enabled') enabled?: string,
  ) {
    return this.machines.findAll(user, {
      type,
      status,
      enabled: enabled === undefined ? undefined : enabled === 'true',
    });
  }

  @Get(':id/live-status')
  liveStatus(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.machines.getLiveStatus(id, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.machines.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateMachineDto, @CurrentUser() user: AuthUser) {
    return this.machines.create(dto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMachineDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.machines.update(id, dto, user);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMachineStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.machines.updateStatus(id, dto, user);
  }
}
