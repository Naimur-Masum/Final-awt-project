import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';

import { JwtService } from '@nestjs/jwt';

import { User } from '../users/entities/user.entity';
import { Otp } from '../otp/entities/otp.entity';

import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { OtpType } from '../otp/enums/otp-type.enum';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(Otp)
    private readonly otpRepository: Repository<Otp>,

    private readonly jwtService: JwtService,
  ) {}

  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  private generateOtp(): string {
    return Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
  }

  async sendOtpEmail(email: string, otp: string) {
    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'OTP Verification',
      text: `Your OTP is ${otp}`,
    });
  }

  async register(dto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email },
    });

     if (existingUser && !existingUser.isVerified) {
        await this.userRepository.delete({ email: dto.email });
    
        await this.otpRepository.delete({
        email: dto.email,
        type: OtpType.REGISTER,
        });
    }

    if (existingUser) {
      throw new BadRequestException(
        'Email already exists',
      );
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      10,
    );

    const user = this.userRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });


    await this.userRepository.save(user);

    await this.otpRepository.delete({
      email: dto.email,
      type: OtpType.REGISTER,
    });

    const otp = this.generateOtp();

    const otpEntity = this.otpRepository.create({
      email: dto.email,
      code: otp,
      type: OtpType.REGISTER,
      expiresAt: new Date(
        Date.now() + 5 * 60 * 1000,
      ),
    });

    await this.otpRepository.save(otpEntity);

    await this.sendOtpEmail(dto.email, otp);

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const otpRecord = await this.otpRepository.findOne({
      where: {
        email: dto.email,
        
        type: OtpType.REGISTER,
      },
    });

    if (!otpRecord) {
      throw new BadRequestException('Invalid OTP');
    }

    if (otpRecord.expiresAt < new Date()) {
      throw new BadRequestException('OTP expired');
    }

    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.isVerified = true;

    await this.userRepository.save(user);

    await this.otpRepository.delete({
      email: dto.email,
      type: OtpType.REGISTER,
    });

    return {
      success: true,
      message: 'Account verified successfully',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        password: true,
        role: true,
        isVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    const isPasswordMatched = await bcrypt.compare(
      dto.password,
      user.password,
    );

    if (!isPasswordMatched) {
      throw new UnauthorizedException(
        'Invalid credentials',
      );
    }

    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Please verify your account',
      );
    }

    const token = this.jwtService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      success: true,
      accessToken: token,
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException(
        'User not found',
      );
    }

    await this.otpRepository.delete({
      email: dto.email,
      type: OtpType.RESET_PASSWORD,
    });

    const otp = this.generateOtp();

    const otpEntity = this.otpRepository.create({
      email: dto.email,
      code: otp,
      type: OtpType.RESET_PASSWORD,
      expiresAt: new Date(
        Date.now() + 5 * 60 * 1000,
      ),
    });

    await this.otpRepository.save(otpEntity);

    await this.sendOtpEmail(dto.email, otp);

    return {
      success: true,
      message: 'Reset OTP sent successfully',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const hashedPassword = await bcrypt.hash(
      dto.newPassword,
      10,
    );

    user.password = hashedPassword;

    await this.userRepository.save(user);

    await this.otpRepository.delete({
      email: dto.email,
      type: OtpType.RESET_PASSWORD,
    });

    return {
      success: true,
      message: 'Password reset successful',
    };
  }
}