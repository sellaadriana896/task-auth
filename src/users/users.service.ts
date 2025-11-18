import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm'; 
import * as bcrypt from 'bcrypt';
import { User } from './user.entity'; 

@Injectable()
export class UsersService {
    constructor (@InjectRepository(User) private readonly repo: Repository<User>) {}

    async createUser (email: string, password: string): Promise<User> {
        const hash = await bcrypt.hash(password, 10);
        const user = this.repo.create({ email, passwordHash: hash});
        return this.repo.save(user);
    }

    async findByEmail (email: string): Promise<User | null> {
        return this.repo.findOne ({ where: { email}})
    }

    async validatePassword (password: string, hash: string): Promise <boolean> { 
        return bcrypt.compare (password, hash);
    }
}
