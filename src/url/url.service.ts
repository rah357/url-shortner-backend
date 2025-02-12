import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Url } from './model/Url';
import { nanoid } from 'nanoid'; // Generates unique short codes

@Injectable()
export class UrlService {
  constructor(@InjectRepository(Url) private urlRepo: Repository<Url>) { } // Injects the URL repository

  /**
   * @desc Generates a short URL for a given long URL.
   * @param {string} originalUrl - The URL to be shortened.
   * @param {string} [customAlias] - Optional custom alias for the short URL.
   * @param {string} [topic] - Optional category for analytics.
   * @returns {Promise<string>} - Returns the short URL identifier.
   */
  async shortenUrl(originalUrl: string, customAlias?: string, topic?: string): Promise<{}> {
    if (customAlias) {
      const existingUrl = await this.urlRepo.findOne({ where: { shortCode: customAlias } });
      if (existingUrl) {
        // Generate alternative suggestions
        const suggestedAliases = this.generateAliasSuggestions(customAlias);
        return {
          statusCode: 400,
          message: "Unable to create short URL. Please try a different alias.",
          suggestions: suggestedAliases.map(alias => `short.ly/${alias}`),
        };
      }
    } else {
      const shortCode = customAlias || nanoid(6); // Use custom alias if provided, else generate a unique ID
      const newUrl = this.urlRepo.create({ originalUrl, shortCode, topic });
      await this.urlRepo.save(newUrl);
      return { shortUrl: `short.ly/${shortCode}` };
    }
  }


  generateAliasSuggestions(baseAlias: string): string[] {
    const randomSuffixes = Array.from({ length: 3 }, () => Math.random().toString(36).substring(2, 4));
    return randomSuffixes.map(suffix => `${baseAlias}${suffix}`);
  }

  
  /**
   * @desc Retrieves the original URL from a given short URL if the URL exist else return.
   * @param {string} shortCode - The shortened URL identifier.
   * @returns {Promise<string | null>}
   */
  async getOriginalUrl(shortCode: string): Promise<string | null> {
    const url = await this.urlRepo.findOne({ where: { shortCode } });
    if (url) {
      url.clicks++;
      await this.urlRepo.save(url);
      return url.originalUrl;
    }
    return null;
  }
}
