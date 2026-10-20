import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { PublicEventsController } from './public-events.controller.js';
import { EventsService } from './events.service.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [EventsController, PublicEventsController],
  providers: [EventsService],
})
export class EventsModule {}
