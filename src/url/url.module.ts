import { Module } from '@nestjs/common';
import { UrlService } from './url.service';
import { UrlController } from './url.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Url } from './entity/Url.entity';
import { AuthModule } from 'src/auth/auth.module';
import { AudienceData } from './entity/audience.entity';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Url]), TypeOrmModule.forFeature([AudienceData])],
  providers: [UrlService],
  controllers: [UrlController]
})
export class UrlModule {}
