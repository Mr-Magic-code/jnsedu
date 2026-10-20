import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLeadDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'Form type must be a valid string' })
  @IsNotEmpty({ message: 'Form type is required' })
  @MaxLength(120)
  form_type: string;

  @IsObject({ message: 'Form data must be a valid object' })
  @IsNotEmpty({ message: 'Form data cannot be empty' })
  form_data: Record<string, any>;

  @IsString({ message: 'Source URL must be a valid string' })
  @IsOptional()
  @MaxLength(2048)
  source_url?: string;
}
