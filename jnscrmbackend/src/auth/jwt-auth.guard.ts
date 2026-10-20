import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Response } from 'express';
import { DatabaseService } from '../database/database.service.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly databaseService: DatabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    const authHeader = request.headers?.authorization;
    const bearerToken =
      typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7).trim()
        : undefined;

    const token: string | undefined = request.cookies?.token || bearerToken;

    if (!token) {
      throw new UnauthorizedException('Authentication token missing.');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);

      const users: any = await this.databaseService.query(
        'SELECT id, full_name, email, role, status FROM users WHERE id = ?',
        [payload.sub],
      );

      const user = Array.isArray(users) ? users[0] : undefined;

      if (!user || user.status !== 'approved') {
        this.clearAuthCookie(response);
        throw new UnauthorizedException('This session is no longer valid.');
      }

      request.user = user;
      return true;
    } catch (error) {
      this.clearAuthCookie(response);

      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired session.');
    }
  }

  private clearAuthCookie(response: Response) {
    const isProduction = process.env.NODE_ENV === 'production';

    response.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }
}
