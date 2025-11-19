import {IsJWT, IsString} from 'class-validator';

export class RefreshDto { 
    @IsJWT()
    refreshToken!: string;
    
    @IsString()
    deviceId!: string;
}