import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UrlModule } from './url/url.module';
import { Url } from './url/entity/Url.entity';
import { AuthModule } from './auth/auth.module';
import { User } from './auth/entity/User.entity';
import { AnalyticsModule } from './analytics/analytics.module';
import { AudienceData } from './url/entity/audience.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'root',
      database: 'url_shortner',
      entities: [Url, User, AudienceData],
      synchronize: true,
    }),

    ThrottlerModule.forRootAsync({
      useFactory: () => [
        {
          ttl: 6000,
          limit: 2,
          storage: new ThrottlerStorageRedisService('redis://localhost:6379'),
        },
      ],
    }),
    AuthModule,
    UrlModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
