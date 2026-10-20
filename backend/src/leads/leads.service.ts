import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';

const ALLOWED_STATUSES = ['Unread', 'Read', 'Trashed'] as const;
const ALLOWED_DATE_FILTERS = [
  'Today',
  'Yesterday',
  'Last Week',
  'Last Month',
  'Custom',
] as const;

@Injectable()
export class LeadsService {
  constructor(private readonly db: DatabaseService) {}

  async create(createLeadDto: CreateLeadDto) {
    const { form_type, form_data, source_url } = createLeadDto;

    const query = `
      INSERT INTO leads (form_type, form_data, source_url, status, created_at)
      VALUES (?, ?, ?, 'Unread', NOW())
    `;

    const result: any = await this.db.query(query, [
      form_type,
      JSON.stringify(form_data),
      source_url || '',
    ]);

    const leadId = result.insertId;

    // Fire-and-forget external CRM sync. It is only attempted when configured,
    // so local/development submissions never wait on an unreachable host.
    if (process.env.CRM_API_URL) {
      void this.forwardToCustomCRM(createLeadDto).catch((error) => {
        console.warn('CRM Integration Error:', error?.message);
      });
    }

    return { success: true, message: 'Lead saved successfully', leadId };
  }

  private async forwardToCustomCRM(payload: CreateLeadDto) {
    const crmUrl = process.env.CRM_API_URL;
    if (!crmUrl) return;

    const crmToken = process.env.CRM_API_TOKEN ?? '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    try {
      const response = await fetch(crmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${crmToken}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`CRM responded with status ${response.status}`);
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  async getFormTypes(): Promise<string[]> {
    const query = `SELECT DISTINCT form_type FROM leads WHERE form_type IS NOT NULL AND form_type != '' ORDER BY form_type ASC`;
    const result: any = await this.db.query(query);
    return Array.isArray(result) ? result.map((row) => row.form_type) : [];
  }

  async findAll(
    formType?: string,
    status?: string,
    search?: string,
    dateFilter?: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    limit: number = 100,
  ) {
    let query = `SELECT * FROM leads WHERE 1=1`;
    let countQuery = `SELECT COUNT(*) as total FROM leads WHERE 1=1`;
    const params: any[] = [];
    const countParams: any[] = [];

    if (formType && formType !== 'All Forms') {
      query += ` AND form_type = ?`;
      countQuery += ` AND form_type = ?`;
      params.push(formType);
      countParams.push(formType);
    }

    if (status && status !== 'All Type') {
      query += ` AND LOWER(status) = LOWER(?)`;
      countQuery += ` AND LOWER(status) = LOWER(?)`;
      params.push(status);
      countParams.push(status);
    }

    if (
      dateFilter &&
      dateFilter !== 'All' &&
      ALLOWED_DATE_FILTERS.includes(dateFilter as any)
    ) {
      if (dateFilter === 'Today') {
        query += ` AND DATE(created_at) = CURDATE()`;
        countQuery += ` AND DATE(created_at) = CURDATE()`;
      } else if (dateFilter === 'Yesterday') {
        query += ` AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
        countQuery += ` AND DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
      } else if (dateFilter === 'Last Week') {
        query += ` AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
        countQuery += ` AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
      } else if (dateFilter === 'Last Month') {
        query += ` AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
        countQuery += ` AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`;
      } else if (dateFilter === 'Custom' && startDate && endDate) {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;

        if (datePattern.test(startDate) && datePattern.test(endDate)) {
          query += ` AND DATE(created_at) BETWEEN ? AND ?`;
          countQuery += ` AND DATE(created_at) BETWEEN ? AND ?`;
          params.push(startDate, endDate);
          countParams.push(startDate, endDate);
        }
      }
    }

    if (search) {
      query += ` AND (source_url LIKE ? OR form_data LIKE ?)`;
      countQuery += ` AND (source_url LIKE ? OR form_data LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
      countParams.push(`%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const parsedPage = Math.max(1, Math.floor(Number(page) || 1));
    const parsedLimit = Math.min(
      1000,
      Math.max(1, Math.floor(Number(limit) || 100)),
    );
    const offset = (parsedPage - 1) * parsedLimit;

    query += ` LIMIT ? OFFSET ?`;
    params.push(parsedLimit, offset);

    const leads: any = await this.db.query(query, params);
    const totalResult: any = await this.db.query(countQuery, countParams);
    const total = Number(totalResult[0]?.total ?? 0);

    return {
      data: leads,
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    };
  }

  async updateStatus(id: number, rawStatus: string) {
    const normalized =
      rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

    if (!ALLOWED_STATUSES.includes(normalized as any)) {
      throw new BadRequestException('Invalid lead status.');
    }

    const query = `UPDATE leads SET status = ? WHERE id = ?`;
    const result: any = await this.db.query(query, [normalized, id]);

    if (result.affectedRows === 0) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return { success: true, message: `Lead status updated to ${normalized}` };
  }

  async remove(id: number) {
    const query = `DELETE FROM leads WHERE id = ?`;
    const result: any = await this.db.query(query, [id]);

    if (result.affectedRows === 0) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return { success: true, message: 'Lead permanently deleted' };
  }
}
