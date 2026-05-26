import client from './client'
import type { ApiResponse, User } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    client.post<ApiResponse<User>>('/auth/login', { email, password }),

  register: (name: string, email: string, password: string) =>
    client.post<ApiResponse<User>>('/auth/register', { name, email, password }),

  logout: () =>
    client.post<ApiResponse>('/auth/logout'),

  me: () =>
    client.get<ApiResponse<User>>('/auth/me'),
}
