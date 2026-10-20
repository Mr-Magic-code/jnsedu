import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'jnscrm-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
