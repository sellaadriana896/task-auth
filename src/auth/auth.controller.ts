import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto} from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto'


@Controller('auth')
export class AuthController {
    constructor (private readonly auth: AuthService ) {}

    @Post('register')
    async register (@Body() dto: RegisterDto) {
        const user = await this.auth.register(dto.email, dto.password);
        return { id: user.id, email: user.email};
    };
    

    @Post('login')
    async login(@Body() dto: LoginDto) {
        // Делегируем всю бизнес-логику в сервис
        return this.auth.login(dto.email, dto.password, dto.deviceid);
    }

    @Post('refresh')
    async refresh(@Body() dto: RefreshDto) { 
        return { todo: 'impliment refresh', received: dto};
    }

    @Post('logout')
    async logout() { 
        return { todo: 'implement logout'};
    }

    @Post('logout-all')
    async logoutAll() { 
        return { todo: 'implement logout-all'};
    }    
}

