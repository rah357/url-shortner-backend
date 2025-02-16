import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { AuthModule } from 'src/auth/auth.module';
import { Url } from 'src/url/entity/Url.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudienceData } from 'src/url/entity/audience.entity';
import { User } from 'src/auth/entity/User.entity';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Url]),
    TypeOrmModule.forFeature([AudienceData]),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [AnalyticsService],
  controllers: [AnalyticsController],
})
export class AnalyticsModule {}
