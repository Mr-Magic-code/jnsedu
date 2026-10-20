import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { BlogsService } from './blogs.service.js';
import { BlogCategoryDto } from './dto/blog-category.dto.js';
import { BlogStatusDto } from './dto/blog-status.dto.js';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto.js';

@Controller('admin/blogs')
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  // --- CATEGORIES ROUTES ---

  @Get('categories')
  async getCategories() {
    return this.blogsService.getAllCategories();
  }

  @Post('categories')
  async createCategory(@Body() body: BlogCategoryDto) {
    return this.blogsService.createCategory(body.name, body.slug);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: BlogCategoryDto,
  ) {
    return this.blogsService.updateCategory(id, body.name, body.slug);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.blogsService.deleteCategory(id);
  }

  // --- BLOGS CRUD ROUTES ---

  @Get()
  async getBlogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.blogsService.getAllBlogs(
      Number(page) || 1,
      Number(limit) || 10,
      search || '',
      status || '',
    );
  }

  @Post()
  async createBlog(@Body() body: CreateBlogDto) {
    return this.blogsService.createBlog(body);
  }

  @Put(':id')
  async updateBlog(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBlogDto,
  ) {
    return this.blogsService.updateBlog(id, body);
  }

  @Patch(':id/status')
  async updateBlogStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: BlogStatusDto,
  ) {
    return this.blogsService.updateBlogStatus(id, body.status);
  }

  @Delete(':id')
  async deleteBlog(@Param('id', ParseIntPipe) id: number) {
    return this.blogsService.deleteBlog(id);
  }
}
