import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  event_name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  day_date: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  event_time?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  venue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cover_image?: string | null;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  target_page: string;

  @IsIn(['Live', 'Coming Soon', 'Past Event'])
  status: 'Live' | 'Coming Soon' | 'Past Event';
}

export class UpdateEventDto extends CreateEventDto {
  @Type(() => Number)
  @IsInt()
  id: number;
}
