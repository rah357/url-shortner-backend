import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './entity/Url.entity';
import { AuthModule } from 'src/auth/auth.module';
import { AudienceData } from './entity/audience.entity';
import { User } from 'src/auth/entity/User.entity';
import { RedisService } from 'src/cache/redis.provider';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Url]),
    TypeOrmModule.forFeature([AudienceData]),
    TypeOrmModule.forFeature([User]),
  ],
  providers: [UrlService, RedisService],
  controllers: [UrlController],
})
export class UrlModule {}
