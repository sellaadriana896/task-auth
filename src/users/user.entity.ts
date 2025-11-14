import { 
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { DeviceToken } from '../auth/device-token.entity';

@Entity()
export class User { 
    @PrimaryGeneratedColumn()
    id: number; 

    @Column({ unique: true })
    email: string; 

    @Column()
    passwordHash!:string; 

    @OneToMany(() => DeviceToken, (dt) => dt.user)
    deviceTokens: DeviceToken[];

    @CreateDateColumn()
    createdAt!: Date; 

    @UpdateDateColumn()
    updatedAt!: Date; 
}