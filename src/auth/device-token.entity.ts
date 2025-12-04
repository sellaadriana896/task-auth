import { 
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
 }  from 'typeorm';
 import { User } from '../users/user.entity'; 

@Entity()
export class DeviceToken {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => User, (u) => u.deviceTokens, { eager: true})
    user!: User;
    
    @Index()
    @Column()
    deviceId!: string; //UUID устройства 

    @Column({ nullable: true, type: 'text' })
    userAgent!: string | null; 

    @Column({ nullable: true, type: 'text' })
    ip!: string | null; 

    @Index()
    @Column()
    jti!: string; //идентификатор refresh токена 

    @Column()
    refreshTokenHash!: string; // только хеш храним 

    @Column({ default: false })
    isRevoked!: boolean; 

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    @Index()
    @Column({ nullable: true, type: 'timestamp' })
    lastUsedsAt!: Date | null;

    @Index()
    @Column({ nullable: true, type: 'timestamp' })
    expireAt!: Date | null;
}



