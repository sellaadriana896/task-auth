import {IsJWT, IsOptional, IsString} from 'class-validator';

export class RefreshDto { 
    @IsJWT()
    refreshToken!: string;
    
    @IsOptional()
    @IsString()
    deviceId?: string;
}