import { createClient } from 'redis';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client;

  async onModuleInit() {
    this.client = createClient({
      url: 'redis://localhost:6379', // Change this if your Redis server runs elsewhere
    });

    this.client.on('error', (err) => console.error('Redis error:', err));

    await this.client.connect();
    console.log('✅ Redis connected');
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttl?: number) {
    if (ttl) {
      await this.client.setEx(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async onModuleDestroy() {
    await this.client.quit();
    console.log('🛑 Redis disconnected');
  }
}
