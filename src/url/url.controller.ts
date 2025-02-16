import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  ValidationPipe,
  UsePipes,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UrlService } from './url.service';
import { ShortenUrlDto } from './dto/url.dto';
import { JwtAuthGuard } from 'src/auth/jwt.guard';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('/api/shorten')
@UseGuards(ThrottlerGuard)
export class UrlController {
  constructor(private readonly urlService: UrlService) {}

  /**
   * @route POST /shorten
   * @desc Creates a shortened URL from a long URL.
   * @body {string} longUrl - The original URL to shorten.
   * @body {string} [customAlias] - Optional custom short URL alias.
   * @body {string} [topic] - Optional category for the URL.
   * @returns {object} - Shortened URL.
   * @throws {BadRequestException} - If the long URL is invalid.
   * @throws {ConflictException} - If the custom alias is already in use.
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async shorten(@Body() shortenUrlDto: ShortenUrlDto, @Req() req: Request) {
    return await this.urlService.shortenUrl(
      req,
      shortenUrlDto.longUrl,
      shortenUrlDto.customAlias,
      shortenUrlDto.topic,
    );
  }

  /**
   * @route GET /:shortCode
   * @desc Redirects a short URL to its original URL.
   * @param headers
   * @param {string} shortCode - The shortened URL identifier.
   * @returns {Redirect} - Redirects the user to the original URL.
   * @throws {NotFoundException} - If the short URL does not exist.
   * @throws {InternalServerErrorException} - If there is an error retrieving the original URL.
   * @throws {InternalServerErrorException} - If there is an error tracking the URL visit.
   */
  @Get(':shortCode')
  @Throttle({ default: { limit: 2, ttl: 15000 } })
  async redirectToLongUrl(
    headers: { 'user-agent': string },
    @Param('shortCode') shortCode: string,
    @Req() req: any,
    @Res() res: any,
  ) {
    const originalUrl = await this.urlService.getOriginalUrlWithClientTracking(
      shortCode,
      req,
    );
    return res.redirect(originalUrl);
  }
}
