import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

export class UpdateLeadStatusDto {
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsIn(['unread', 'read', 'trashed'])
  status: 'unread' | 'read' | 'trashed';
}
