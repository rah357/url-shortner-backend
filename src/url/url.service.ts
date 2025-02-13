import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Url } from './entity/Url.entity';
import { nanoid } from 'nanoid'; // Generates unique short codes
import { AudienceData } from './entity/audience.entity';
import { Injectable, InternalServerErrorException, Logger, NotFoundException, Req } from '@nestjs/common';
import * as useragent from 'express-useragent';
import * as geoip from 'geoip-lite';

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
    @InjectRepository(Url) private urlRepo: Repository<Url>,
    @InjectRepository(AudienceData) private audienceRepository: Repository<AudienceData>,
    private dataSource: DataSource, // Inject DataSource for transactions

  ) { } // Injects the URL repository

  /**
   * @desc Generates a short URL for a given long URL.
   * @param {string} originalUrl - The URL to be shortened.
   * @param {string} [customAlias] - Optional custom alias for the short URL.
   * @param {string} [topic] - Optional category for analytics.
   * @returns {Promise<string>} - Returns the short URL identifier.
   */
  async shortenUrl(originalUrl: string, customAlias?: string, topic?: string): Promise<{}> {
    const BASE_URL = 'http://localhost:3000';
    if (customAlias) {
      const existingUrl = await this.urlRepo.findOne({ where: { shortCode: customAlias } });

      Logger.log("UrlService  -> shortenUrl()  -> existingUrl");
      Logger.log(existingUrl);
      if (existingUrl) {
        // Generate alternative suggestions
        const suggestedAliases = this.generateAliasSuggestions(customAlias);
        return {
          statusCode: 400,
          message: "Unable to create short URL. Please try a different alias.",
          suggestions: suggestedAliases.map(alias => `short.ly/${alias}`),
        };
      }
    }
    const shortCode = customAlias || nanoid(6);
    Logger.log("UrlService  -> shortenUrl()  -> shortCode");
    Logger.log(shortCode);
    const newUrl = this.urlRepo.create({ originalUrl, shortCode, topic });
    Logger.log(JSON.stringify(newUrl));
    const response = await this.urlRepo.save(newUrl);
    return { shortUrl: `${BASE_URL}/api/shorten/${shortCode}`, createdAt: response.createdAt };
  }


/**
 * @desc Generates alternative alias suggestions based on a given base alias.
 * @param {string} baseAlias - The base alias to generate suggestions from.
 * @returns {string[]} - Returns an array of suggested aliases.
 */
  generateAliasSuggestions(baseAlias: string): string[] {
    const randomSuffixes = Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 4));
    return randomSuffixes.map(suffix => `${baseAlias}${suffix}`);
  }

  /**
 * @desc Retrieves the original URL from a given short URL and tracks client information.
 * @param {string} shortCode - The shortened URL identifier.
 * @param {Request} req - The HTTP request object containing client information.
 * @returns {Promise<string | null>} - Returns the original URL if found, otherwise null.
 * @throws {NotFoundException} - Throws if the short URL is not found.
 * @throws {InternalServerErrorException} - Throws if there is an error during the transaction.
 */
  async getOriginalUrlWithClientTracking(shortCode: string, @Req() req): Promise<string | null> {
    return this.dataSource.transaction(async (manager) => {
      try {
        // Fetch the URL from the database
        const urlData = await manager.findOne(Url, { where: { shortCode } });
        if (!urlData) {
          throw new NotFoundException('Short URL not found');
        }

        // Parse user agent details
        const userAgent = useragent.parse(req.headers['user-agent']);
        const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const geo = geoip.lookup(ip as string); // Get location details

        const audienceData = {
          userAgent: req.headers['user-agent'],
          ip: ip,
          browser: userAgent.browser,
          os: userAgent.os,
          device: userAgent.isMobile ? 'Mobile' : userAgent.isTablet ? 'Tablet' : 'Desktop',
          location: geo ? `${geo.city}, ${geo.country}` : 'Unknown',
          timestamp: new Date(),
          url: urlData
        };

        Logger.log(audienceData);

        // Log the redirect inside the transaction
        const audienceLog = manager.create(AudienceData, audienceData);
        await manager.save(AudienceData, audienceLog);

        await manager.increment(Url, { id: urlData.id }, "clicks", 1);

        // Redirect user
        return urlData.originalUrl;
      } catch (error) {
        Logger.error('Redirect error:', error);
        throw new InternalServerErrorException(error.message);
      }
    });
  }
}
