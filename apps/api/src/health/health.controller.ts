import { Controller, Get } from '@nestjs/common';
import { APP_VERSION } from '@fabweb/shared';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'fabweb-api',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    };
  }
}
