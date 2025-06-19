import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

// Create axios instance
export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Add response interceptor for better error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear auth data if unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

interface ApiOptions {
  token?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
}

export async function apiRequest(endpoint: string, options: ApiOptions = {}) {
  const { token, method = 'GET', body } = options;
  
  console.log('API Request:', { endpoint, method, body, token: token ? 'provided' : 'none' });
  
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
    console.log('Request body:', config.body);
  }

  const url = `${API_BASE_URL}/api${endpoint}`;
  console.log('Making request to:', url);
  
  try {
    const response = await fetch(url, config);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Response data:', responseData);
    return responseData;
  } catch (error) {
    console.error('API Request failed:', error);
    throw error;
  }
}

// Dog API
export const dogApi = {
  list: (token: string) => apiRequest('/dogs', { token }),
  create: (token: string, data: any) => apiRequest('/dogs', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/dogs/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/dogs/${id}`, { token, method: 'DELETE' }),
  show: (token: string, id: number) => apiRequest(`/dogs/${id}`, { token }),
};

// Booking API
export const bookingApi = {
  list: (token: string) => apiRequest('/bookings', { token }),
  create: (token: string, data: any) => apiRequest('/bookings', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/bookings/${id}`, { token, method: 'PUT', body: data }),
  cancel: (token: string, id: number) => apiRequest(`/bookings/${id}/cancel`, { token, method: 'POST' }),
  availableSlots: (token: string, date: string) => apiRequest(`/bookings/available-slots?date=${date}`, { token }),
};

// Session API
export const sessionApi = {
  list: (token: string) => apiRequest('/sessions', { token }),
  create: (token: string, data: any) => apiRequest('/sessions', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/sessions/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/sessions/${id}`, { token, method: 'DELETE' }),
  show: (token: string, id: number) => apiRequest(`/sessions/${id}`, { token }),
  signup: (token: string, sessionId: string | number, dogId: string) => 
    apiRequest(`/sessions/${sessionId}/signup`, { token, method: 'POST', body: { dog_id: dogId } }),
  joinWaitlist: (token: string, sessionId: string | number, dogId: string) =>
    apiRequest(`/sessions/${sessionId}/waitlist`, { token, method: 'POST', body: { dog_id: dogId } }),
  getSignups: (token: string, sessionId: string | number) => 
    apiRequest(`/sessions/${sessionId}/signups`, { token }),
  approveSignup: (token: string, sessionId: string | number, signupId: string) =>
    apiRequest(`/sessions/${sessionId}/signups/${signupId}/approve`, { token, method: 'PUT' }),
  rejectSignup: (token: string, sessionId: string | number, signupId: string, reason?: string) =>
    apiRequest(`/sessions/${sessionId}/signups/${signupId}/reject`, { token, method: 'PUT', body: { rejection_reason: reason } }),
};

// Daycare Schedule API
export const daycareApi = {
  list: (token: string) => apiRequest('/daycare-schedules', { token }),
  create: (token: string, data: any) => apiRequest('/daycare-schedules', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/daycare-schedules/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/daycare-schedules/${id}`, { token, method: 'DELETE' }),
  toggle: (token: string, id: number) => apiRequest(`/daycare-schedules/${id}/toggle`, { token, method: 'POST' }),
  generateSessions: (token: string, id: number) => apiRequest(`/daycare-schedules/${id}/generate-sessions`, { token, method: 'POST' }),
};

// Review API
export const reviewApi = {
  list: (token: string, trainerId?: number) => 
    apiRequest(`/reviews${trainerId ? `?trainer_id=${trainerId}` : ''}`, { token }),
  create: (token: string, data: any) => apiRequest('/reviews', { token, method: 'POST', body: data }),
  reply: (token: string, id: number, reply: string) => 
    apiRequest(`/reviews/${id}/reply`, { token, method: 'POST', body: { reply } }),
  trainerStats: (token: string, trainerId: number) => 
    apiRequest(`/trainers/${trainerId}/stats`, { token }),
};

// Service Template API
export const serviceTemplateApi = {
  list: (token: string) => apiRequest('/service-templates', { token }),
  create: (token: string, data: any) => apiRequest('/service-templates', { token, method: 'POST', body: data }),
  update: (token: string, id: number, data: any) => apiRequest(`/service-templates/${id}`, { token, method: 'PUT', body: data }),
  delete: (token: string, id: number) => apiRequest(`/service-templates/${id}`, { token, method: 'DELETE' }),
  show: (token: string, id: number) => apiRequest(`/service-templates/${id}`, { token }),
}; 