import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TasksModule } from './auth/tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(
      (() => {
        const url = process.env.DATABASE_URL;
        if (url && url.length > 0) {
          return {
            type: 'postgres' as const,
            url,
            autoLoadEntities: true,
            synchronize: true,
          };
        }
        return {
          type: (process.env.DB_TYPE as any) || 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT || 5432),
          username: process.env.DB_USER || 'postgres',
          password:
            process.env.DB_PASS && process.env.DB_PASS.length > 0
              ? process.env.DB_PASS
              : undefined,
          database: process.env.DB_NAME || 'task_auth',
          autoLoadEntities: true,
          synchronize: true,
        };
      })()
    ),
    AuthModule,
    UsersModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
