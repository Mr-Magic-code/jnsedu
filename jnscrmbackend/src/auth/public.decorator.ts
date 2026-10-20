import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route (or controller) as publicly accessible, bypassing the global JWT guard.
 * Every other route requires a valid, approved user session by default.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
