import { IsEmail, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    @MaxLength(72)
    password!: string;

    @IsOptional()
    @IsString()
    deviceId?: string; // идентификатор устройства (опционально)
}