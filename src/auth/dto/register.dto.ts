import { IsEmail, IsOptional, IsString, MinLength, MaxLength, IsIn } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsIn(['email', 'sms'])
  verificationMethod?: 'email' | 'sms';
}
