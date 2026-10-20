import { Body, Controller, Delete, Get, Post, Put, Query } from '@nestjs/common';
import { ParseIntPipe } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto.js';

@Controller('admin/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async getEvents() {
    return this.eventsService.getEvents();
  }

  @Post()
  async createEvent(@Body() body: CreateEventDto) {
    return this.eventsService.createEvent(body);
  }

  @Put()
  async updateEvent(@Body() body: UpdateEventDto) {
    return this.eventsService.updateEvent(body);
  }

  @Delete()
  async deleteEvent(@Query('id', ParseIntPipe) id: number) {
    return this.eventsService.deleteEvent(id);
  }
}
