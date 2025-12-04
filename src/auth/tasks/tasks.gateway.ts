import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'ws';
import { WebSocket } from 'ws';
import { Logger } from '@nestjs/common';
import type { Task } from './entities/task.entity';

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
  private readonly userSockets = new Map<number, Set<WebSocket>>();

  emitTaskUpdated(payload: { action: 'patch' | 'put'; task: Task }) {
    // отправляем только пользователю, которому назначена задача
    const userId = payload?.task?.userId;
    if (!Number.isFinite(userId)) {
      this.logger.warn('emitTaskUpdated: missing userId, suppressing broadcast');
      return;
    }
    const sockets = this.userSockets.get(Number(userId));
    if (!sockets || sockets.size === 0) {
      this.logger.warn(`emitTaskUpdated: no clients for userId=${userId}`);
      return;
    }
    const message = JSON.stringify({ event: 'task.updated', data: payload });
    sockets.forEach((client) => {
      try {
        if (client.readyState === WebSocket.OPEN) client.send(message);
      } catch (err) {
        this.logger.warn(`WS targeted send failed: ${String(err)}`);
      }
    });
  }

  handleConnection(client: WebSocket, req?: any): void {
    try {
      // идентификация по ws://.../?userId=123
      const url = new URL(req?.url ?? '/', 'http://localhost');
      const uidStr = url.searchParams.get('userId');
      const userId = uidStr ? Number(uidStr) : undefined;
      if (userId && Number.isFinite(userId)) {
        let set = this.userSockets.get(userId);
        if (!set) {
          set = new Set<WebSocket>();
          this.userSockets.set(userId, set);
        }
        set.add(client);
        client.on('close', () => {
          const s = this.userSockets.get(userId);
          if (s) {
            s.delete(client);
            if (s.size === 0) this.userSockets.delete(userId);
          }
        });
      }
      client.send(
        JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
      );
    } catch (err) {
      this.logger.warn(`WS welcome/identify failed: ${String(err)}`);
    }
  }
  afterInit(server: Server): void {
    this.server = server;
    try {
      this.server.on('connection', (client: WebSocket, req) => {
        try {
          // дублирование идентификации
          const url = new URL(req?.url ?? '/', 'http://localhost');
          const uidStr = url.searchParams.get('userId');
          const userId = uidStr ? Number(uidStr) : undefined;
          if (userId && Number.isFinite(userId)) {
            let set = this.userSockets.get(userId);
            if (!set) {
              set = new Set<WebSocket>();
              this.userSockets.set(userId, set);
            }
            set.add(client);
            client.on('close', () => {
              const s = this.userSockets.get(userId);
              if (s) {
                s.delete(client);
                if (s.size === 0) this.userSockets.delete(userId);
              }
            });
          }
          client.send(
            JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
          );
        } catch (err) {
          this.logger.warn(`WS connection welcome/identify failed: ${String(err)}`);
        }
      });
    } catch (err) {
      this.logger.warn(`WS afterInit hookup failed: ${String(err)}`);
    }
  }
}
