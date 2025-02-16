import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.provider';

@Global() // This makes it available globally
@Module({
  providers: [RedisService],
})
export class CacheConfigModule {
  constructor() {
    console.log('✅ Redis Cache Enabled');
  }
}
