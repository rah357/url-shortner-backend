import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Url } from '../url/entity/Url.entity';
import { AudienceData } from 'src/url/entity/audience.entity';
import { User } from 'src/auth/entity/User.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AudienceData) private logRepo: Repository<AudienceData>,
    @InjectRepository(Url) private urlRepo: Repository<Url>,
    @InjectRepository(User) private userRepo: Repository<User>,

    private dataSource: DataSource,
  ) {}
  async getUrlAnalytics(shortCode: string) {
    const url = await this.urlRepo.findOne({ where: { shortCode } });
    if (!url) throw new NotFoundException('Short URL not found');

    const totalClicks = await this.urlRepo.findOne({
      select: ['clicks'],
      where: { shortCode },
    });

    console.log(url.id);

    const uniqueUsers = await this.logRepo
      .createQueryBuilder('log')
      .select('COUNT(DISTINCT log.ip)', 'count')
      .where('log.urlId = :urlId', { urlId: url.id })
      .getRawOne();

    const clicksByDate = await this.logRepo
      .createQueryBuilder('log')
      .select('Date(accessedAt) as date, count(*) clicks')
      .where('accessedAt>= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
      .andWhere('log.urlId = :urlId', { urlId: url.id })
      .groupBy('date')
      .getRawMany();
    /**
        uniqueClicks and uniqueUsers will be same as we are counting distinct ip addresses for any
        particular url if they both have same OS
        lets see in linux os one ip is trying to access same shortCode more than once we will count that as 
        uniqueClicks because one user(ip) is trying to access the same shortCode more than once so it will be one click
        same goes for uniqueUsers
         */
    const osType = await this.logRepo
      .createQueryBuilder('log')
      .select('log.os', 'osName')
      .addSelect('COUNT(DISTINCT log.ip)', 'uniqueClicks')
      .addSelect('COUNT(DISTINCT log.ip)', 'uniqueUsers')
      .where('log.urlId = :urlId', { urlId: url.id })
      .groupBy('log.os')
      .getRawMany();

    const deviceType = await this.logRepo
      .createQueryBuilder('log')
      .select('log.device', 'deviceName')
      .addSelect('COUNT(DISTINCT log.ip)', 'uniqueClicks')
      .addSelect('COUNT(DISTINCT log.ip)', 'uniqueUsers')
      .where('log.urlId = :urlId', { urlId: url.id })
      .groupBy('log.device')
      .getRawMany();

    return {
      totalClicks: totalClicks?.clicks,
      uniqueUsers: uniqueUsers.count || 0,
      clicksByDate,
      osType,
      deviceType,
    };
  }

  /**
   * Get analytics for a short URL based on topic
   * @param topic
   * @returns
   */
  async getAnalyticsByTopic(topic: string) {
    const totalClicks = await this.urlRepo
      .createQueryBuilder('url')
      .select('SUM(url.clicks)', 'totalClicks')
      .where('url.topic = :topic', { topic })
      .getRawOne();
    const sumOfClicks = totalClicks?.totalClicks || 0; // Handle null case

    const uniqueUsers = await this.logRepo
      .createQueryBuilder('audience')
      .select('COUNT(DISTINCT audience.ip)', 'uniqueUsers')
      .innerJoin('audience.url', 'url')
      .where('url.topic = :topic', { topic })
      .getRawOne();

    const totalUniqueUsers = uniqueUsers?.uniqueUsers || 0; // Handle null case

    const clicksByDate = await this.logRepo
      .createQueryBuilder('audience')
      .select('DATE(audience.accessedAt)', 'date')
      .addSelect('COUNT(*)', 'clickCount')
      .innerJoin('audience.url', 'url')
      .where('url.topic = :topic', { topic })
      .groupBy('DATE(audience.accessedAt)')
      .orderBy('DATE(audience.accessedAt)', 'ASC')
      .getRawMany();

    let urls = await this.urlRepo
      .createQueryBuilder('url')
      .select([
        'url.shortCode as urlShortCode',
        'COUNT(audience.id) AS totalClicks',
        'COUNT(DISTINCT audience.ip) AS uniqueUsers',
      ])
      .leftJoin('url.audienceData', 'audience') // Join with AudienceData to get clicks
      .where('url.topic = :topic', { topic }) // Filter URLs by topic
      .groupBy('url.id') // Group by URL to get stats per URL
      .orderBy('totalClicks', 'DESC') // Optional: Order by most clicked
      .getRawMany();

    urls = urls.map(
      (url: {
        urlShortCode: string;
        totalClicks: string;
        uniqueUsers: string;
      }) => {
        return {
          shortUrl: `${process.env.BASE_URL}/${url.urlShortCode}`,
          totalClicks: parseInt(url.totalClicks),
          uniqueUsers: parseInt(url.uniqueUsers),
        };
      },
    );
    return {
      totalClicks: sumOfClicks,
      uniqueUsers: totalUniqueUsers,
      clicksByDate,
      urls,
    };
  }

  /**
   * Get overall analytics for a user
   * @param req
   * @returns
   */
  async getOverallAnalytics(req: any) {
    const userId = req.user.id; // Get authenticated user ID

    // Total number of URLs created by the user
    const totalUrls = await this.urlRepo.count({
      where: { user: { id: userId } },
    });

    // Total number of clicks across all URLs created by the user
    const totalClicks = await this.urlRepo
      .createQueryBuilder('url')
      .innerJoin('url.user', 'user')
      .where('user.id = :userId', { userId })
      .getCount();

    // Total number of unique users who accessed any of the user's short URLs
    const uniqueUsersResult = await this.logRepo
      .createQueryBuilder('audience')
      .innerJoin('audience.url', 'url')
      .where('url.userId = :userId', { userId })
      .select('COUNT(DISTINCT audience.ip)', 'uniqueUsers')
      .getRawOne();
    const uniqueUsers = uniqueUsersResult?.uniqueUsers || 0;

    // // Clicks by date (last 7 days)
    const clicksByDate = await this.logRepo
      .createQueryBuilder('audience')
      .select('DATE(audience.accessedAt)', 'date')
      .addSelect('COUNT(*)', 'clickCount')
      .innerJoin('audience.url', 'url')
      .where('url.userId = :userId', { userId })
      .where('accessedAt>= DATE_SUB(CURDATE(), INTERVAL 7 DAY)')
      .groupBy('DATE(audience.accessedAt)')
      .orderBy('DATE(audience.accessedAt)', 'ASC')
      .getRawMany();

    // OS Type Analytics
    const osType = await this.logRepo
      .createQueryBuilder('audience')
      .select('audience.os', 'osName')
      .addSelect('COUNT(*)', 'uniqueClicks')
      .addSelect('COUNT(DISTINCT audience.ip)', 'uniqueUsers')
      .innerJoin('audience.url', 'url')
      .where('url.userId = :userId', { userId })
      .groupBy('audience.os')
      .getRawMany();

    // Device Type Analytics
    const deviceType = await this.logRepo
      .createQueryBuilder('audience')
      .select('audience.device', 'deviceName')
      .addSelect('COUNT(*)', 'uniqueClicks')
      .addSelect('COUNT(DISTINCT audience.ip)', 'uniqueUsers')
      .innerJoin('audience.url', 'url')
      .where('url.userId = :userId', { userId })
      .groupBy('audience.device')
      .getRawMany();

    // Return response
    return {
      totalUrls,
      totalClicks: totalClicks,
      uniqueUsers,
      clicksByDate,
      osType,
      deviceType,
    };
  }
}
