import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

export class BlogStatusDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['published', 'draft', 'trashed'])
  status: 'published' | 'draft' | 'trashed';
}
