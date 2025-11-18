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
    deviceid?: string; // тут тип клиент можем прислать идентификатор устройства поле необязательное
}