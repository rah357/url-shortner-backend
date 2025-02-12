import { Controller, Post, Get, Param, Body, Res, NotFoundException, ValidationPipe, UsePipes, UseGuards } from '@nestjs/common';
import { UrlService } from './url.service';
import { ShortenUrlDto } from './dto/url.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller("/api/shorten")
export class UrlController {
  constructor(private readonly urlService: UrlService) { }

  /**
   * @route POST /shorten
   * @desc Creates a shortened URL from a long URL.
   * @body {string} longUrl - The original URL to shorten.
   * @body {string} [customAlias] - Optional custom short URL alias.
   * @body {string} [topic] - Optional category for the URL.
   * @returns {object} - Shortened URL.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async shorten(
    @Body() shortenUrlDto: ShortenUrlDto
  ) {
    return await this.urlService.shortenUrl(shortenUrlDto.longUrl, shortenUrlDto.customAlias, shortenUrlDto.topic);
  }


   /**
   * @route GET /:shortCode
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
