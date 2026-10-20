import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { DatabaseService } from '../database/database.service.js';

describe('LeadsController', () => {
  let controller: LeadsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        LeadsService,
        { provide: DatabaseService, useValue: { query: async () => [] } },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
