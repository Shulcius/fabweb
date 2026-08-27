import { Module } from '@nestjs/common';
import { WorkOrdersController } from './workorders.controller';
import { WorkOrdersService } from './workorders.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
