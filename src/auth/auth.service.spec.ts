import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DeviceToken } from './device-token.entity';

describe('AuthService', () => {
  let service: AuthService;
  const mockUsers = {
    findByEmail: jest.fn(),
    createUser: jest.fn(),
    validatePassword: jest.fn(),
  };
  const mockJwt = {
    sign: jest.fn(),
    verify: jest.fn(),
  };
  const mockConfig = {
    get: jest.fn(),
  };
  const mockDeviceRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsers },
        { provide: JwtService, useValue: mockJwt },
        { provide: ConfigService, useValue: mockConfig },
        { provide: getRepositoryToken(DeviceToken), useValue: mockDeviceRepo },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
