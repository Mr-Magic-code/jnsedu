// src/services/auth.service.ts

const API_BASE_URL = '/backend/auth';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
}

interface ApiErrorBody {
  message?: string | string[];
  error?: string;
}

async function parseJsonSafe(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function extractErrorMessage(
  data: ApiErrorBody,
  fallback: string,
): string {
  const { message } = data;

  if (Array.isArray(message) && message.length > 0) {
    return message.join(' ');
  }

  if (typeof message === 'string' && message.trim()) {
    return message;
  }

  return fallback;
}

export const authService = {
  /**
   * Logs the user in and lets the backend set the HttpOnly auth cookie.
   */
  async login(credentials: { email: string; password: string }) {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include',
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error(
        extractErrorMessage(data, 'Invalid email or password.'),
      );
    }

    if (data.user) {
      try {
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        // localStorage can be unavailable in private browsing modes.
      }
    }

    return data as { success: boolean; message: string; user: AuthUser };
  },

  /**
   * Returns the currently authenticated user (validates the session cookie).
   */
  async me(): Promise<AuthUser> {
    const res = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error(
        extractErrorMessage(data, 'Your session has expired. Please log in again.'),
      );
    }

    return data.user as AuthUser;
  },

  /**
   * Super Admin registration (/protection/flash-admin).
   */
  async registerSuperAdmin(credentials: {
    full_name: string;
    email: string;
    password: string;
    secretKey: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/register-super-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error(
        extractErrorMessage(data, 'Super Admin registration failed.'),
      );
    }

    return data;
  },

  /**
   * Manager registration (/protection/admin).
   */
  async registerManager(credentials: {
    full_name: string;
    email: string;
    password: string;
    branch_office?: string;
    secretKey: string;
  }) {
    const res = await fetch(`${API_BASE_URL}/register-manager`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error(extractErrorMessage(data, 'Manager registration failed.'));
    }

    return data;
  },

  /**
   * Pending manager requests (Super Admin dashboard).
   */
  async getPendingRequests() {
    const res = await fetch(`${API_BASE_URL}/pending-requests`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      throw new Error(
        extractErrorMessage(data, 'Failed to fetch pending requests.'),
      );
    }

    return data;
  },

  /**
   * Clears the auth cookie and redirects to the login page.
   */
  async logout() {
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      try {
        localStorage.removeItem('user');
      } catch {
        // Ignore storage errors.
      }
      window.location.replace('/protection/login');
    }
  },
};