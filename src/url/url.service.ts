import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Url } from './entity/Url.entity';
import { nanoid } from 'nanoid'; // Generates unique short codes
import { AudienceData } from './entity/audience.entity';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import * as useragent from 'express-useragent';
import * as geoip from 'geoip-lite';
import { User } from 'src/auth/entity/User.entity';
import { RedisService } from 'src/cache/redis.provider';

/**
 * @class UrlService
 * @desc Service layer for URL shortening and redirection.
 * @param {Repository<Url>} urlRepo - The URL repository.
 * @param {Repository<AudienceData>} audienceRepository - The audience data repository.
 * @param {DataSource} dataSource - The data source for transactions.
 * @method shortenUrl - Generates a short URL for a given long URL.
 * @method generateAliasSuggestions - Generates alternative alias suggestions.
 * @method getOriginalUrlWithClientTracking - Retrieves the original URL from a short URL and tracks client information.
 */
@Injectable()
export class UrlService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Url) private urlRepo: Repository<Url>,
    @InjectRepository(AudienceData)
    private audienceRepository: Repository<AudienceData>,
    private dataSource: DataSource,
    private readonly redisService: RedisService,
  ) {} // Injects the URL repository

  /**
   * @desc Generates a short URL for a given long URL.
   * @param {string} originalUrl - The URL to be shortened.
   * @param {string} [customAlias] - Optional custom alias for the short URL.
   * @param {string} [topic] - Optional category for analytics.
   * @returns {Promise<string>} - Returns the short URL identifier.
   */
  async shortenUrl(
    req: any,
    originalUrl: string,
    customAlias?: string | null,
    topic?: string | null,
  ): Promise<object> {
    try {
      const userId = req.user?.id;
      Logger.log('UrlService  -> shortenUrl()  -> userId', userId);

      const existingUser = await this.userRepo.findOne({
        where: { id: userId },
      });

      Logger.log('UrlService  -> shortenUrl()  -> userId', userId);
      Logger.log(existingUser);
      if (!existingUser) {
        throw new UnauthorizedException("User doesn't exist");
      }

      if (customAlias) {
        const existingUrl = await this.urlRepo.findOne({
          where: { shortCode: customAlias },
        });
        Logger.log('UrlService  -> shortenUrl()  -> existingUrl');
        Logger.log(existingUrl);
        if (existingUrl) {
          // Generate alternative suggestions
          const suggestedAliases = this.generateAliasSuggestions(customAlias);
          return {
            statusCode: 400,
            message:
              'Unable to create short URL. Please try a different alias.',
            suggestions: suggestedAliases.map((alias) => `short.ly/${alias}`),
          };
        }
      }
      const shortCode = customAlias || nanoid(6);
      Logger.log('UrlService  -> shortenUrl()  -> shortCode');
      Logger.log(shortCode);
      const newUrl = this.urlRepo.create({
        originalUrl,
        shortCode,
        topic: topic || undefined,
        user: existingUser,
      });
      Logger.log(JSON.stringify(newUrl));
      const response = await this.urlRepo.save(newUrl);
      return {
        shortUrl: `${process.env.BASE_URL}/${shortCode}`,
        createdAt: response.createdAt,
      };
    } catch (error) {
      Logger.error('Shorten error:', error);
      throw new InternalServerErrorException((error as Error).message);
    }
  }

  /**
   * @desc Generates alternative alias suggestions based on a given base alias.
   * @param {string} baseAlias - The base alias to generate suggestions from.
   * @returns {string[]} - Returns an array of suggested aliases.
   */
  generateAliasSuggestions(baseAlias: string): string[] {
    const randomSuffixes = Array.from({ length: 3 }, () =>
      Math.random().toString(36).substring(2, 4),
    );
    return randomSuffixes.map((suffix) => `${baseAlias}${suffix}`);
  }

  /**
   * @desc Retrieves the original URL from a given short URL and tracks client information.
   * @param {string} shortCode - The shortened URL identifier.
   * @param {Request} req - The HTTP request object containing client information.
   * @returns {Promise<string | null>} - Returns the original URL if found, otherwise null.
   * @throws {NotFoundException} - Throws if the short URL is not found.
   * @throws {InternalServerErrorException} - Throws if there is an error during the transaction.
   */
  async getOriginalUrlWithClientTracking(
    shortCode: string,
    @Req() req: any,
  ): Promise<string | null> {
    return this.dataSource.transaction(async (manager) => {
      try {
        let urlData;
        const cachedUrl = (await this.redisService.get(`${shortCode}`)) as any;

        // eslint-disable-next-line no-console
        Logger.log(
          'UrlService  -> getOriginalUrlWithClientTracking()  -> storedRedisDate',
        );
        console.log(JSON.stringify(cachedUrl));

        if (cachedUrl) {
          urlData = JSON.parse(cachedUrl);
        } else {
          // Fetch the URL from the database
          urlData = await manager.findOne(Url, { where: { shortCode } });

          Logger.log(
            'UrlService  -> getOriginalUrlWithClientTracking()  -> urlData',
          );
          Logger.log(JSON.stringify(urlData));

          // check is the shortCode is valid or not
          if (!urlData) {
            throw new NotFoundException('Short URL not found');
          }

          await this.redisService.set(
            shortCode,
            JSON.stringify(urlData),
            360000,
          );
          Logger.log(
            'UrlService  -> getOriginalUrlWithClientTracking()  -> storingRedisDate',
          );
        }

        // Parse user agent details
        const userAgent = useragent.parse(req.headers['user-agent']);
        const ip =
          req.ip ||
          req.headers['x-forwarded-for'] ||
          req.connection.remoteAddress;
        const geo = geoip.lookup(ip as string); // Get location details

        const audienceData = {
          userAgent: req.headers['user-agent'],
          ip: ip,
          browser: userAgent.browser,
          os: userAgent.os,
          device: userAgent.isMobile
            ? 'Mobile'
            : userAgent.isTablet
              ? 'Tablet'
              : 'Desktop',
          location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
          timestamp: new Date(),
          url: urlData,
        };

        Logger.log(audienceData);

        // Log the redirect inside the transaction
        const audienceLog = manager.create(AudienceData, audienceData);
        await manager.save(AudienceData, audienceLog);

        await manager.increment(Url, { id: urlData.id }, 'clicks', 1);

        // Redirect user
        return urlData.originalUrl;
      } catch (error) {
        Logger.error('Redirect error:', error);
        throw new InternalServerErrorException((error as Error).message);
      }
    });
  }
}
