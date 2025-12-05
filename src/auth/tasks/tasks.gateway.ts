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
  // широковещательная модель: без привязки к userId

  emitTaskUpdated(payload: { action: 'patch' | 'put'; task: Task }) {
    // широковещательно всем подключенным клиентам
    if (!this.server) return;
    const message = JSON.stringify({ event: 'task.updated', data: payload });
    this.server.clients.forEach((client) => {
      try {
        if ((client as WebSocket).readyState === WebSocket.OPEN) {
          (client as WebSocket).send(message);
        }
      } catch (err) {
        this.logger.warn(`WS broadcast failed: ${String(err)}`);
      }
    });
  }

  handleConnection(client: WebSocket): void {
    try {
      client.send(
        JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
      );
    } catch (err) {
      this.logger.warn(`WS welcome failed: ${String(err)}`);
    }
  }
  afterInit(server: Server): void {
    this.server = server;
    try {
      this.server.on('connection', (client: WebSocket) => {
        try {
          client.send(
            JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
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
