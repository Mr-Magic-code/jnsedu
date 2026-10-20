import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('LeadsService', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: DatabaseService, useValue: { query: async () => [] } },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
