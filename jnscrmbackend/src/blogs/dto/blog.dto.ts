import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBlogDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  slug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  category_id?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cover_image?: string | null;

  @IsString()
  @MaxLength(500_000)
  content: string;

  @IsIn(['published', 'draft', 'trashed'])
  status: 'published' | 'draft' | 'trashed';

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  author_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  author_role?: string;
}

export class UpdateBlogDto extends CreateBlogDto {}
