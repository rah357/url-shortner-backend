import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get analytics for a short URL
   * @param topic
   * @returns
   * @example GET /api/analytics/abc123
   *
   */
  @Get('topic/:topic')
  @UseGuards(JwtAuthGuard)
  async getAnalyticsByTopic(@Param('topic') topic: string) {
    console.log(`Request received for topic: ${topic}`);
    return this.analyticsService.getAnalyticsByTopic(topic);
  }

  @Get('overall')
  @UseGuards(JwtAuthGuard)
  async getOverallAnalytics(@Req() req: any) {
    const userId = req.user?.id;
    console.log(`Request received for user: ${userId}`);
    return this.analyticsService.getOverallAnalytics(req);
  }

  /**
   * Get analytics for a short URL
   * @param shortCode
   * @returns
   * @example GET /api/analytics/abc123
   *
   */
  @Get(':shortCode')
  @UseGuards(JwtAuthGuard)
  async getAnalytics(@Param('shortCode') shortCode: string) {
    console.log(`Request received for shortCode: ${shortCode}`);
    return this.analyticsService.getUrlAnalytics(shortCode);
  }
}
