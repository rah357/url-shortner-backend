import { Controller, Post, Get, Param, Body, Res, NotFoundException, ValidationPipe, UsePipes, UseGuards, Req, createParamDecorator, ExecutionContext, InternalServerErrorException } from '@nestjs/common';
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
   * @throws {BadRequestException} - If the long URL is invalid.
   * @throws {ConflictException} - If the custom alias is already in use. 
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
    * @param headers
    * @param {string} shortCode - The shortened URL identifier.
    * @returns {Redirect} - Redirects the user to the original URL.
    * @throws {NotFoundException} - If the short URL does not exist.
    * @throws {InternalServerErrorException} - If there is an error retrieving the original URL.
    * @throws {InternalServerErrorException} - If there is an error tracking the URL visit. 
    */
  @Get(':shortCode')
  async redirectToLongUrl(
    headers: { 'user-agent': string },
    @Param('shortCode') shortCode: string, @Req() req, @Res() res) {
    const originalUrl = await this.urlService.getOriginalUrlWithClientTracking(shortCode, req);
    return res.redirect(originalUrl);
  }
}
