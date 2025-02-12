import { Controller, Post, Get, Param, Body, Res, NotFoundException } from '@nestjs/common';
import { UrlService } from './url.service';

@Controller('url') // Defines the base route for this controller
export class UrlController {
  constructor(private readonly urlService: UrlService) { } // Injects the URL service

  /**
   * @route POST /url/shorten
   * @desc Creates a shortened URL from a long URL.
   * @body {string} longUrl - The original URL to shorten.
   * @body {string} [customAlias] - Optional custom short URL alias.
   * @body {string} [topic] - Optional category for the URL.
   * @returns {object} - Shortened URL.
   */
  @Post('shorten')
  async shorten(
    @Body('longUrl') longUrl: string,
    @Body('customAlias') customAlias?: string,
    @Body('topic') topic?: string
  ) {
    return { shortUrl: await this.urlService.shortenUrl(longUrl, customAlias, topic) };
  }

  /**
   * @route GET /url/:shortCode
   * @desc Redirects a short URL to its original URL.
   * @param {string} shortCode - The shortened URL identifier.
   * @returns {Redirect} - Redirects the user to the original URL.
   */
  @Get(':shortCode')
  async redirect(@Param('shortCode') shortCode: string, @Res() res) {
    const originalUrl = await this.urlService.getOriginalUrl(shortCode);
    if (!originalUrl) throw new NotFoundException('URL not found');
    return res.redirect(originalUrl);
  }
}
