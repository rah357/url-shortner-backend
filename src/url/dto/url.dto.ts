import { IsString, IsOptional, IsNotEmpty, MinLength } from 'class-validator';

export class ShortenUrlDto {
  @IsString()
  @IsNotEmpty({ message: 'longUrl is required' })
  longUrl: string;

  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'customAlias must be at least 4 characters long' })
  customAlias?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(4, { message: 'topic must be at least 4 characters long' })
  topic?: string | null;
}
