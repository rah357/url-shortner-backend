import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entity/User.entity';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { GoogleStrategy } from './google-strategy/google.strategy';
import { JwtAuthGuard } from './jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '4h' },
    }),
    AuthModule,
  ],
  providers: [AuthService, GoogleStrategy, JwtAuthGuard],
  controllers: [AuthController],
  exports: [AuthService, JwtAuthGuard, JwtModule], // Export Guard and AuthService

})
export class AuthModule { }


