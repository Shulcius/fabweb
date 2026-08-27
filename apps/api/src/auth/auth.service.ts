import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await compare(dto.password, user.password_hash))) {
      throw new UnauthorizedException('Неверный адрес эл. почты или пароль');
    }

    return this.buildAuthResponse(user);
  }

  async consent(userId: string, accepted: boolean) {
    if (!accepted) {
      throw new UnauthorizedException('Согласие на обработку ПД обязательно');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { pd_consent_at: new Date() },
    });

    return this.toPublicUser(user);
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  private buildAuthResponse(user: User) {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwt.sign(payload),
      user: this.toPublicUser(user),
    };
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      micro_roles: user.micro_roles,
      pd_consent_at: user.pd_consent_at?.toISOString() ?? null,
    };
  }
}
