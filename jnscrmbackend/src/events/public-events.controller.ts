import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service.js';
import { Public } from '../auth/public.decorator.js';

@Controller('events')
export class PublicEventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Public()
  @Get('public')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async getPublicEvents() {
    return this.eventsService.getEvents();
  }
}
