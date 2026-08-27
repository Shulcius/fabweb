import { Body, Controller, Post } from '@nestjs/common';
import { calculateCost, type CostInput } from '@fabweb/costing';

@Controller('costing')
export class CostingController {
  @Post('calculate')
  calculate(@Body() input: CostInput) {
    return calculateCost(input);
  }
}
