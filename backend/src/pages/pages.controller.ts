import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PagesService } from './pages.service.js';

@Controller('admin/pages')
export class PagesController {
  constructor(private readonly pagesService: PagesService) {}

  @Get()
  async getPages(
    @Query()
    query: {
      page?: string;
      limit?: string;
      search?: string;
      filter?: string;
    },
  ) {
    return this.pagesService.getPagesFromDb(query);
  }

  // Mutating actions use POST so they cannot be triggered by a cross-site <img>
  // or top-level navigation with a SameSite=Lax cookie.
  @Post('scan')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async scanGitHub() {
    return this.pagesService.scanGitHubPages();
  }

  @Post('save')
  async savePages(@Body() body: unknown) {
    return this.pagesService.savePage(body);
  }
}
