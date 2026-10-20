import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { ManagerRequestDto } from './dto/manager-request.dto.js';
import { Public } from './public.decorator.js';
import { Roles } from './roles.decorator.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    full_name: string;
    email: string;
    role: string;
    status: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Header('Cache-Control', 'no-store')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);

    res.cookie('token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    return {
      success: true,
      message: result.message,
      user: result.user,
    };
  }

  @Public()
  @Post('register-super-admin')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async registerSuperAdmin(@Body() dto: SignupDto) {
    return this.authService.register(dto, 'super-admin');
  }

  @Public()
  @Post('register-manager')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async registerManager(@Body() dto: SignupDto) {
    return this.authService.register(dto, 'manager');
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { success: true, message: 'Logged out successfully' };
  }

  @Get('me')
  @Header('Cache-Control', 'no-store')
  async me(@Req() request: AuthenticatedRequest) {
    return {
      success: true,
      user: await this.authService.getProfile(request.user.id),
    };
  }

  @Get('users')
  @Roles('Super-Admin')
  @HttpCode(HttpStatus.OK)
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  @Get('pending-requests')
  @Roles('Super-Admin')
  @HttpCode(HttpStatus.OK)
  async getPendingRequests() {
    return this.authService.getPendingRequests();
  }

  @Patch('requests')
  @Roles('Super-Admin')
  @HttpCode(HttpStatus.OK)
  async handleManagerRequest(@Body() dto: ManagerRequestDto) {
    return this.authService.handleManagerRequest(dto.id, dto.action);
  }

  @Delete('delete-user')
  @Roles('Super-Admin')
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Query('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.deleteUser(id, request.user.id);
  }
}
