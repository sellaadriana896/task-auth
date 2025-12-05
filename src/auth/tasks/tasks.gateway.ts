import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import type { Server } from 'ws';
import { WebSocket } from 'ws';
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

  emitTaskUpdated(payload: { action: 'patch' | 'put'; task: Task }) {
    // шлем всем подключённым клиентам событие task.updated c джейсоном
    if (!this.server) return;
    this.server.clients.forEach((client) => {
      try {
        if (client && (client as WebSocket).readyState === WebSocket.OPEN) {
          (client as WebSocket).send(
            JSON.stringify({ event: 'task.updated', data: payload }),
          );
        }
      } catch (err) {
        this.logger.warn(`WS send task.updated failed: ${String(err)}`);
      }
    });
  }
  handleConnection(client: WebSocket): void {
    try {
      client.send(
        JSON.stringify({ event: 'socket.welcome', data: { message: 'connected', ts: Date.now() } }),
      );
    } catch (err) {
      this.logger.warn(`WS welcome send failed: ${String(err)}`);
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
