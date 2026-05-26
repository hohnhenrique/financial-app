import client from './client'
import type { ApiResponse } from '@/types'

export interface UserSettings {
  session_lifetime: number
  primary_color: string
  sidebar_color_from: string
  sidebar_color_to: string
}

export const settingsApi = {
  get: () => client.get<ApiResponse<UserSettings>>('/settings'),
  update: (data: Partial<UserSettings>) => client.put<ApiResponse<UserSettings>>('/settings', data),
}
