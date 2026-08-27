import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ConsentDto, LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: ReturnType<AuthService['toPublicUser']>) {
    return user;
  }

  @Post('consent')
  @UseGuards(JwtAuthGuard)
  consent(@CurrentUser() user: { id: string }, @Body() dto: ConsentDto) {
    return this.auth.consent(user.id, dto.accepted);
  }
}
