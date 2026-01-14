import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'ws';
import { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import type { Task } from './entities/task.entity';
import { RedisService } from '../../common/redis/redis.service';

@WebSocketGateway({
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class TasksGateway {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(TasksGateway.name);
  constructor(private readonly redis: RedisService) {}

  emitTaskUpdated(payload: { action: 'patch' | 'put'; task: Task }) {
    if (!this.server) return;
    const message = JSON.stringify({ event: 'task.updated', data: payload });
    this.server.clients.forEach((client: WebSocket) => {
      try {
        if (client.readyState === WebSocket.OPEN) client.send(message);
      } catch (err) {
        this.logger.warn(`WS broadcast send failed: ${String(err)}`);
      }
    });
    this.redis
      .publish('ws:task.updated', message)
      .catch((err) => this.logger.warn(`Redis publish failed: ${String(err)}`));
  }

  handleConnection(client: WebSocket): void {
    try {
      client.send(
        JSON.stringify({
          event: 'socket.welcome',
          data: { message: 'connected', ts: Date.now() },
        }),
      );
    } catch (err) {
      this.logger.warn(`WS welcome send failed: ${String(err)}`);
    }
  }
  afterInit(server: Server): void {
    this.server = server;
    try {
      const sub = this.redis.getClient().duplicate();
      sub.on('error', (err) => this.logger.warn(`Redis sub error: ${String(err)}`));
      sub
        .connect()
        .then(() => {
          sub.subscribe('ws:task.updated', () => {
            this.logger.log('Subscribed to ws:task.updated');
          });
          sub.on('message', (_channel, message) => {
            const m = typeof message === 'string' ? message : String(message);
            this.server.clients.forEach((client: WebSocket) => {
              try {
                if (client.readyState === WebSocket.OPEN) client.send(m);
              } catch (err) {
                this.logger.warn(`WS broadcast from Redis failed: ${String(err)}`);
              }
            });
          });
        })
        .catch((err) => this.logger.warn(`Redis sub connect failed: ${String(err)}`));
      this.server.on('connection', (client: WebSocket) => {
        try {
          client.send(
            JSON.stringify({
              event: 'socket.welcome',
              data: { message: 'connected', ts: Date.now() },
            }),
          );
        } catch (err) {
          this.logger.warn(`WS connection welcome failed: ${String(err)}`);
        }
      });
    } catch (err) {
      this.logger.warn(`WS afterInit hookup failed: ${String(err)}`);
    }
  }
}
