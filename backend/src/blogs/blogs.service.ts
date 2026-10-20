import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { DatabaseService } from '../database/database.service.js';
import { CreateBlogDto, UpdateBlogDto } from './dto/blog.dto.js';

const ALLOWED_BLOG_STATUSES = ['published', 'draft', 'trashed'];

@Injectable()
export class BlogsService {
  constructor(private readonly db: DatabaseService) {}

  // --- CATEGORIES LOGIC ---

  async getAllCategories() {
    const rows = await this.db.query(
      'SELECT id, name, slug, created_at FROM blog_categories ORDER BY name ASC',
    );
    return { categories: rows };
  }

  async createCategory(name: string, slug?: string) {
    const finalSlug = this.slugify(slug || name);

    if (!finalSlug) {
      throw new BadRequestException('A valid category slug is required.');
    }

    try {
      await this.db.query(
        'INSERT INTO blog_categories (name, slug) VALUES (?, ?)',
        [name.trim(), finalSlug],
      );
      return { success: true, message: 'Category created successfully' };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A category with this slug already exists.');
      }
      throw error;
    }
  }

  async updateCategory(id: number, name: string, slug?: string) {
    const categories: any = await this.db.query(
      'SELECT id FROM blog_categories WHERE id = ? LIMIT 1',
      [id],
    );

    if (!categories[0]) {
      throw new NotFoundException('Category not found.');
    }

    const finalSlug = this.slugify(slug || name);

    if (!finalSlug) {
      throw new BadRequestException('A valid category slug is required.');
    }

    try {
      await this.db.query(
        'UPDATE blog_categories SET name = ?, slug = ? WHERE id = ?',
        [name.trim(), finalSlug, id],
      );
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A category with this slug already exists.');
      }
      throw error;
    }

    return { success: true, message: 'Category updated successfully' };
  }

  async deleteCategory(id: number) {
    const categories: any = await this.db.query(
      'SELECT id FROM blog_categories WHERE id = ? LIMIT 1',
      [id],
    );

    if (!categories[0]) {
      throw new NotFoundException('Category not found.');
    }

    try {
      await this.db.query('DELETE FROM blog_categories WHERE id = ?', [id]);
    } catch (error: any) {
      if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new ConflictException(
          'This category is used by one or more blogs and cannot be deleted.',
        );
      }
      throw error;
    }

    return { success: true, message: 'Category deleted successfully' };
  }

  // --- BLOGS LOGIC ---

  async getAllBlogs(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status: string = '',
  ) {
    const parsedPage = Math.max(1, Math.floor(Number(page) || 1));
    const parsedLimit = Math.min(100, Math.max(1, Math.floor(Number(limit) || 10)));
    const offset = (parsedPage - 1) * parsedLimit;

    let where = ' WHERE 1=1';
    const queryParams: any[] = [];

    if (search) {
      where += ` AND (b.title LIKE ? OR b.content LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (status && status !== 'All') {
      where += ` AND b.status = ?`;
      queryParams.push(status.toLowerCase());
    }

    const query = `
      SELECT b.*, c.name AS category_name
      FROM blogs b
      LEFT JOIN blog_categories c ON b.category_id = c.id
      ${where}
      ORDER BY b.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const blogs = await this.db.query(query, [
      ...queryParams,
      parsedLimit,
      offset,
    ]);

    const countRows: any = await this.db.query(
      `SELECT COUNT(*) AS total FROM blogs b${where}`,
      queryParams,
    );

    const total = Number(countRows[0]?.total ?? 0);

    return {
      blogs,
      total,
      totalPages: Math.ceil(total / parsedLimit) || 1,
      currentPage: parsedPage,
    };
  }

  async createBlog(data: CreateBlogDto) {
    const finalSlug = this.slugify(data.slug || data.title);

    if (!finalSlug) {
      throw new BadRequestException('A valid blog slug is required.');
    }

    await this.ensureSlugIsAvailable(finalSlug);

    const now = new Date();

    try {
      await this.db.query(
        `INSERT INTO blogs (title, slug, category_id, cover_image, content, status, author_name, author_role, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.title.trim(),
          finalSlug,
          data.category_id || null,
          data.cover_image || null,
          this.sanitizeContent(data.content),
          data.status,
          data.author_name.trim(),
          data.author_role?.trim() || 'Admin',
          now,
          now,
        ],
      );

      return { success: true, message: 'Blog published successfully' };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A blog with this slug already exists.');
      }
      throw error;
    }
  }

  async updateBlog(id: number, data: UpdateBlogDto) {
    const existing: any = await this.db.query(
      'SELECT id, slug FROM blogs WHERE id = ? LIMIT 1',
      [id],
    );

    if (!existing[0]) {
      throw new NotFoundException('Blog not found.');
    }

    const finalSlug = this.slugify(data.slug || data.title);

    if (!finalSlug) {
      throw new BadRequestException('A valid blog slug is required.');
    }

    await this.ensureSlugIsAvailable(finalSlug, id);

    try {
      await this.db.query(
        `UPDATE blogs
         SET title = ?, slug = ?, category_id = ?, cover_image = ?, content = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [
          data.title.trim(),
          finalSlug,
          data.category_id || null,
          data.cover_image || null,
          this.sanitizeContent(data.content),
          data.status,
          new Date(),
          id,
        ],
      );

      return { success: true, message: 'Blog updated successfully' };
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') {
        throw new ConflictException('A blog with this slug already exists.');
      }
      throw error;
    }
  }

  async updateBlogStatus(id: number, status: string) {
    if (!ALLOWED_BLOG_STATUSES.includes(status)) {
      throw new BadRequestException('Invalid blog status.');
    }

    const result: any = await this.db.query(
      `UPDATE blogs SET status = ?, updated_at = ? WHERE id = ?`,
      [status, new Date(), id],
    );

    if (result.affectedRows === 0) {
      throw new NotFoundException('Blog not found.');
    }

    return { success: true, message: 'Blog status updated successfully' };
  }

  async deleteBlog(id: number) {
    const result: any = await this.db.query('DELETE FROM blogs WHERE id = ?', [
      id,
    ]);

    if (result.affectedRows === 0) {
      throw new NotFoundException('Blog not found.');
    }

    return { success: true, message: 'Blog deleted successfully' };
  }

  private async ensureSlugIsAvailable(slug: string, excludeId?: number) {
    const rows: any = await this.db.query(
      'SELECT id FROM blogs WHERE slug = ? LIMIT 1',
      [slug],
    );

    if (rows[0] && Number(rows[0].id) !== excludeId) {
      throw new ConflictException('A blog with this slug already exists.');
    }
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private sanitizeContent(content: string): string {
    try {
      return sanitizeHtml(content || '', {
        allowedTags: [
          'p',
          'br',
          'strong',
          'b',
          'em',
          'i',
          'u',
          's',
          'ul',
          'ol',
          'li',
          'h1',
          'h2',
          'h3',
          'h4',
          'h5',
          'h6',
          'blockquote',
          'a',
          'img',
          'figure',
          'figcaption',
          'pre',
          'code',
          'hr',
          'span',
          'div',
          'table',
          'thead',
          'tbody',
          'tr',
          'th',
          'td',
        ],
        allowedAttributes: {
          a: ['href', 'name', 'target', 'rel'],
          img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
          '*': ['class'],
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: {
          img: ['http', 'https'],
        },
        transformTags: {
          a: sanitizeHtml.simpleTransform('a', {
            rel: 'noopener noreferrer',
            target: '_blank',
          }),
        },
      });
    } catch {
      throw new InternalServerErrorException('Failed to process blog content.');
    }
  }
}
