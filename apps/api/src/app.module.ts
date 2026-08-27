import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CostingController } from './costing/costing.controller';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './projects/projects.module';
import { ShowcaseModule } from './showcase/showcase.module';
import { UsersModule } from './users/users.module';
import { WorkOrdersModule } from './workorders/workorders.module';
import { MachinesModule } from './machines/machines.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    ShowcaseModule,
    WorkOrdersModule,
    MachinesModule,
  ],
  controllers: [HealthController, CostingController],
})
export class AppModule {}
