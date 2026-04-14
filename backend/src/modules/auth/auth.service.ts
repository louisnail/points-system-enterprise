import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../user/user.entity';
import { comparePassword } from '../../shared/utils/password.util';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(employeeNo: string, password: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .leftJoinAndSelect('user.department', 'dept')
      .where('user.employeeNo = :employeeNo', { employeeNo })
      .getOne();
    if (!user) {
      throw new UnauthorizedException('工号或密码错误');
    }
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('工号或密码错误');
    }
    if (user.status === 3) {
      throw new UnauthorizedException('该账号已离职，无法登录');
    }
    if (user.status === 2) {
      throw new UnauthorizedException('该账号已禁用，无法登录');
    }
    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      employeeNo: user.employeeNo,
      name: user.name,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        employeeNo: user.employeeNo,
        name: user.name,
        displayName: user.displayName,
        role: user.role,
        departmentId: user.departmentId,
        departmentName: user.department?.name,
        companyBelong: user.companyBelong,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepo.findOne({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }
      const newPayload = {
        sub: user.id,
        employeeNo: user.employeeNo,
        name: user.name,
        role: user.role,
      };
      return {
        accessToken: this.jwtService.sign(newPayload),
      };
    } catch {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }
}
