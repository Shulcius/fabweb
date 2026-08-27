import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles('admin', 'supervisor')
  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        full_name: true,
        role: true,
        micro_roles: true,
        created_at: true,
      },
      orderBy: { created_at: 'asc' },
    });
  }
}
