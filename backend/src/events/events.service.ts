import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { CreateEventDto, UpdateEventDto } from './dto/event.dto.js';

@Injectable()
export class EventsService {
  constructor(private readonly dbService: DatabaseService) {}

  async getEvents() {
    const rows: any = await this.dbService.query(
      'SELECT * FROM events ORDER BY id DESC',
    );

    const formattedEvents = (Array.isArray(rows) ? rows : []).map((ev: any) => ({
      id: ev.id,
      event_name: ev.event_name,
      day_date: ev.day_and_date || ev.day_date,
      event_time: ev.event_time,
      venue: ev.venue,
      cover_image: ev.cover_image,
      target_page: ev.target_page,
      status: ev.event_status || ev.status,
      created_at: ev.created_at,
      updated_at: ev.updated_at,
    }));

    return {
      success: true,
      events: formattedEvents,
    };
  }

  async createEvent(body: CreateEventDto) {
    const result: any = await this.dbService.query(
      `INSERT INTO events (event_name, day_and_date, event_time, venue, cover_image, target_page, event_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        body.event_name,
        body.day_date,
        body.event_time || '',
        body.venue || '',
        body.cover_image || null,
        body.target_page,
        body.status,
      ],
    );

    return {
      success: true,
      message: 'Event created successfully!',
      id: result.insertId,
    };
  }

  async updateEvent(body: UpdateEventDto) {
    const result: any = await this.dbService.query(
      `UPDATE events
       SET event_name = ?, day_and_date = ?, event_time = ?, venue = ?, cover_image = ?, target_page = ?, event_status = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        body.event_name,
        body.day_date,
        body.event_time || '',
        body.venue || '',
        body.cover_image || null,
        body.target_page,
        body.status,
        body.id,
      ],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Event not found.');
    }

    return {
      success: true,
      message: 'Event updated successfully!',
    };
  }

  async deleteEvent(id: number) {
    const result: any = await this.dbService.query(
      'DELETE FROM events WHERE id = ?',
      [id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Event not found.');
    }

    return {
      success: true,
      message: 'Event deleted successfully!',
    };
  }
}
