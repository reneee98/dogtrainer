const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}

export async function apiRequest(endpoint: string, options: ApiOptions = {}) {
  const { token, method = 'GET', body } = options;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Dog API
export const dogApi = {
  list: (token: string) => apiRequest('/api/dogs', { token }),
  create: (token: string, data: any) => apiRequest('/api/dogs', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/api/dogs/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/api/dogs/${id}`, { token, method: 'DELETE' }),
  show: (token: string, id: number) => apiRequest(`/api/dogs/${id}`, { token }),
};

// Booking API
export const bookingApi = {
  list: (token: string) => apiRequest('/api/bookings', { token }),
  create: (token: string, data: any) => apiRequest('/api/bookings', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/api/bookings/${id}`, { token, method: 'PUT', body: data }),
  cancel: (token: string, id: number) => apiRequest(`/api/bookings/${id}/cancel`, { token, method: 'POST' }),
  availableSlots: (token: string, date: string) => apiRequest(`/api/bookings/available-slots?date=${date}`, { token }),
};

// Session API
export const sessionApi = {
  list: (token: string) => apiRequest('/api/sessions', { token }),
  create: (token: string, data: any) => apiRequest('/api/sessions', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/api/sessions/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/api/sessions/${id}`, { token, method: 'DELETE' }),
  show: (token: string, id: number) => apiRequest(`/api/sessions/${id}`, { token }),
  signup: (token: string, sessionId: number, dogId: number) => 
    apiRequest(`/api/sessions/${sessionId}/signup`, { token, method: 'POST', body: { dog_id: dogId } }),
  joinWaitlist: (token: string, sessionId: number, dogId: number) =>
    apiRequest(`/api/sessions/${sessionId}/waitlist`, { token, method: 'POST', body: { dog_id: dogId } }),
};

// Daycare Schedule API
export const daycareApi = {
  list: (token: string) => apiRequest('/api/daycare-schedules', { token }),
  create: (token: string, data: any) => apiRequest('/api/daycare-schedules', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/api/daycare-schedules/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/api/daycare-schedules/${id}`, { token, method: 'DELETE' }),
  toggle: (token: string, id: number) => apiRequest(`/api/daycare-schedules/${id}/toggle`, { token, method: 'POST' }),
  generateSessions: (token: string, id: number) => apiRequest(`/api/daycare-schedules/${id}/generate-sessions`, { token, method: 'POST' }),
};

// Review API
export const reviewApi = {
  list: (token: string, trainerId?: number) => 
    apiRequest(`/api/reviews${trainerId ? `?trainer_id=${trainerId}` : ''}`, { token }),
  create: (token: string, data: any) => apiRequest('/api/reviews', { token, method: 'POST', body: data }),
  reply: (token: string, id: number, reply: string) => 
    apiRequest(`/api/reviews/${id}/reply`, { token, method: 'POST', body: { reply } }),
  trainerStats: (token: string, trainerId: number) => 
    apiRequest(`/api/reviews/trainer/${trainerId}/stats`, { token }),
}; 