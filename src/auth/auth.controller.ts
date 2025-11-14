import { Controller, Post, Body, Req } from '@nestjs/common';
import { AuthService } from './auth.service'; 


@Controller('auth')
export class AuthController {
    constructor (private readonly auth: AuthService ) {}

    @Post('register')
    async register (@Body() body: {email: string; passport: string}) { 
        const user = await this.auth.register(body.email, body.passport);
        return { id: user.id, email: user.email };
    }

    @Post('login')
    async login() { 
        return { todo: 'impliment login'};
    }

    @Post('refresh')
    async refresh() { 
        return { todo: 'impliment refresh'};
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

