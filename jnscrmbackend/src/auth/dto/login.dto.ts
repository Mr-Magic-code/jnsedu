import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  @MaxLength(72, { message: 'Password is too long.' })
  password: string;
}
