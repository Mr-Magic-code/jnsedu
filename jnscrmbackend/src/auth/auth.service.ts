import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, timingSafeEqual } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async handleManagerRequest(id: number, action: 'approve' | 'reject') {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException('A valid user id is required.');
    }

    if (action === 'approve') {
      const result: any = await this.databaseService.query(
        "UPDATE users SET status = 'approved' WHERE id = ? AND status = 'pending' AND role = 'Manager'",
        [id],
      );

      if (result.affectedRows === 0) {
        throw new NotFoundException('Pending manager request not found.');
      }

      return { success: true, message: 'Manager approved successfully' };
    }

    const result: any = await this.databaseService.query(
      "DELETE FROM users WHERE id = ? AND status = 'pending' AND role = 'Manager'",
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Pending manager request not found.');
    }

    return { success: true, message: 'Request rejected and removed' };
  }

  async getPendingRequests() {
    return this.databaseService.query(
      "SELECT id, full_name, email, role, status, created_at FROM users WHERE status = 'pending' AND role = 'Manager' ORDER BY created_at DESC",
    );
  }

  async register(dto: SignupDto, role: 'super-admin' | 'manager') {
    if (role === 'super-admin') {
      if (!this.secretsMatch(dto.secretKey, process.env.SUPER_ADMIN_SECRET_KEY)) {
        throw new UnauthorizedException('Invalid Super Admin Secret Key!');
      }
    } else if (role === 'manager') {
      if (!this.secretsMatch(dto.secretKey, process.env.MANAGER_SECRET_KEY)) {
        throw new UnauthorizedException(
          'Invalid Manager Secret Key! You are not authorized.',
        );
      }
    }

    const email = dto.email.trim().toLowerCase();

    const existingUsers: any = await this.databaseService.query(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    if (existingUsers.length > 0) {
      throw new ConflictException('A user with this email already exists!');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const accountStatus = role === 'super-admin' ? 'approved' : 'pending';
    const dbRole = role === 'super-admin' ? 'Super-Admin' : 'Manager';

    try {
      await this.databaseService.query(
        `INSERT INTO users (full_name, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
        [dto.full_name.trim(), email, hashedPassword, dbRole, accountStatus],
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A user with this email already exists!');
      }
      throw error;
    }

    return {
      success: true,
      message: `${dbRole} registered successfully!`,
    };
  }

  async deleteUser(id: number, actingUserId: number) {
    if (!Number.isInteger(id) || id < 1) {
      throw new BadRequestException('A valid user id is required.');
    }

    if (id === actingUserId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const users: any = await this.databaseService.query(
      'SELECT id, role FROM users WHERE id = ? LIMIT 1',
      [id],
    );

    const targetUser = users[0];

    if (!targetUser) {
      throw new NotFoundException('User not found.');
    }

    if (targetUser.role === 'Super-Admin') {
      const counts: any = await this.databaseService.query(
        "SELECT COUNT(*) AS total FROM users WHERE role = 'Super-Admin' AND status = 'approved'",
      );
      const totalSuperAdmins = Number(counts[0]?.total ?? 0);

      if (totalSuperAdmins <= 1) {
        throw new BadRequestException(
          'The last Super Admin account cannot be deleted.',
        );
      }
    }

    await this.databaseService.query('DELETE FROM users WHERE id = ?', [id]);

    return { success: true, message: 'User deleted successfully' };
  }

  async getAllUsers() {
    const users = await this.databaseService.query(
      "SELECT id, full_name, email, role, status, created_at FROM users WHERE status = 'approved' ORDER BY created_at DESC",
    );

    return { users };
  }

  async getProfile(userId: number) {
    const users: any = await this.databaseService.query(
      'SELECT id, full_name, email, role, status FROM users WHERE id = ? LIMIT 1',
      [userId],
    );

    if (!users[0]) {
      throw new UnauthorizedException('User no longer exists.');
    }

    return users[0];
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const users: any = await this.databaseService.query(
      'SELECT * FROM users WHERE email = ? LIMIT 1',
      [email],
    );

    const user = users[0];

    if (!user) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    if (user.status !== 'approved') {
      throw new UnauthorizedException(
        'Your account is pending approval from Super Admin.',
      );
    }

    let isPasswordValid = false;

    try {
      isPasswordValid = await bcrypt.compare(dto.password, user.password);
    } catch {
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password!');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      success: true,
      message: 'Login successful!',
      accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  private secretsMatch(input?: string, expected?: string): boolean {
    if (!input || !expected) return false;

    // Hashing both values gives fixed-length buffers, making the comparison
    // constant-time regardless of the supplied key length.
    const inputHash = createHash('sha256').update(input).digest();
    const expectedHash = createHash('sha256').update(expected).digest();

    return timingSafeEqual(inputHash, expectedHash);
  }
}
