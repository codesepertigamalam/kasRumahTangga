// API Client for External Backend (Next.js + TiDB)
// Configure API_BASE_URL to point to your external backend

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://kasrumahtangga.vercel.app/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.message || 'Terjadi kesalahan pada server' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Tidak dapat terhubung ke server. Periksa koneksi Anda.' };
    }
  }

  // Auth endpoints
  async login(email: string, password: string, rememberMe: boolean = false) {
    return this.request<{ token: string; user: { id: string; name: string; email: string } }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, rememberMe }),
      }
    );
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ token: string; user: { id: string; name: string; email: string } }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ 
          name: capitalizeWords(name), 
          username: capitalizeWords(name), 
          email, 
          password 
        }),
      }
    );
  }

  async getCurrentUser() {
    return this.request<{ id: string; name: string; email: string }>('/auth/me');
  }

  async logout() {
    return this.request('/auth/logout', { method: 'POST' });
  }

  // Transactions
  async getTransactions(params?: { month?: number; year?: number; walletId?: string }) {
    const queryParams = new URLSearchParams();
    if (params?.month !== undefined) queryParams.append('month', String(params.month));
    if (params?.year !== undefined) queryParams.append('year', String(params.year));
    if (params?.walletId) queryParams.append('walletId', params.walletId);
    
    const query = queryParams.toString();
    return this.request(`/transactions${query ? `?${query}` : ''}`);
  }

  async createTransaction(data: {
    amount: number;
    type: 'income' | 'expense';
    categoryId: string;
    walletId: string;
    description: string;
    date: Date;
  }) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        description: capitalizeWords(data.description),
      }),
    });
  }

  async updateTransaction(id: string, data: Partial<{
    amount: number;
    type: 'income' | 'expense';
    categoryId: string;
    walletId: string;
    description: string;
    date: Date;
  }>) {
    return this.request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        description: data.description ? capitalizeWords(data.description) : undefined,
      }),
    });
  }

  async deleteTransaction(id: string) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  }

  // Wallets
  async getWallets() {
    return this.request('/wallets');
  }

  async createWallet(data: { name: string; type: string; balance: number; icon: string }) {
    return this.request('/wallets', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        name: capitalizeWords(data.name),
      }),
    });
  }

  async updateWallet(id: string, data: Partial<{ name: string; type: string; balance: number; icon: string }>) {
    return this.request(`/wallets/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        name: data.name ? capitalizeWords(data.name) : undefined,
      }),
    });
  }

  async deleteWallet(id: string) {
    return this.request(`/wallets/${id}`, { method: 'DELETE' });
  }

  // Categories
  async getCategories() {
    return this.request('/categories');
  }

  async createCategory(data: { name: string; icon: string; color: string; type: 'income' | 'expense' }) {
    return this.request('/categories', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        name: capitalizeWords(data.name),
      }),
    });
  }

  async updateCategory(id: string, data: Partial<{ name: string; icon: string; color: string; type: 'income' | 'expense' }>) {
    return this.request(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        name: data.name ? capitalizeWords(data.name) : undefined,
      }),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  }

  // Budgets (Amplop Digital)
  async getBudgets(params?: { month?: number; year?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.month !== undefined) queryParams.append('month', String(params.month));
    if (params?.year !== undefined) queryParams.append('year', String(params.year));
    
    const query = queryParams.toString();
    return this.request(`/budgets${query ? `?${query}` : ''}`);
  }

  async createBudget(data: { categoryId: string; amount: number; month: number; year: number }) {
    return this.request('/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBudget(id: string, data: Partial<{ amount: number }>) {
    return this.request(`/budgets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBudget(id: string) {
    return this.request(`/budgets/${id}`, { method: 'DELETE' });
  }

  // Reminders
  async getReminders() {
    return this.request('/reminders');
  }

  async createReminder(data: { title: string; amount: number; categoryId: string; walletId: string; dueDay: number; isActive: boolean }) {
    return this.request('/reminders', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        title: capitalizeWords(data.title),
      }),
    });
  }

  async updateReminder(id: string, data: Partial<{ title: string; amount: number; categoryId: string; walletId: string; dueDay: number; isActive: boolean }>) {
    return this.request(`/reminders/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        title: data.title ? capitalizeWords(data.title) : undefined,
      }),
    });
  }

  async deleteReminder(id: string) {
    return this.request(`/reminders/${id}`, { method: 'DELETE' });
  }

  // Reports
  async getMonthlyReport(month: number, year: number) {
    return this.request(`/reports/monthly?month=${month}&year=${year}`);
  }

  async getTrendReport(startDate: string, endDate: string, type: 'weekly' | 'monthly') {
    return this.request(`/reports/trend?startDate=${startDate}&endDate=${endDate}&type=${type}`);
  }
}

// Utility function to capitalize words
function capitalizeWords(str: string): string {
  return str
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export const api = new ApiClient(API_BASE_URL);
export default api;
