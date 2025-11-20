import { IsJWT, IsString, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class RefreshDto { 

    @Transform(({ value }) => (value === '' || value === null ? undefined : value))
    @IsOptional()
    @IsJWT()
    refreshToken?: string;
    
    @IsString()
    deviceId!: string;
}