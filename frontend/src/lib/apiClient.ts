// API client for backend authentication
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  last_login?: string;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  error?: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('authToken');
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add auth token if available
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });

    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await this.makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      this.token = response.data.token;
      localStorage.setItem('authToken', this.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response;
  }

  async logout(): Promise<void> {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.getCurrentUser();
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiClient = new ApiClient();
export type { User, AuthResponse };