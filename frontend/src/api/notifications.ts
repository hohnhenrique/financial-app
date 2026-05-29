import client from './client'
import type { ApiResponse } from '@/types'

export interface Notification {
  id: string
  type: 'error' | 'warning' | 'info' | 'success'
  title: string
  message: string
  icon: string
}

export interface NotificationsData {
  count: number
  notifications: Notification[]
}

export const notificationsApi = {
  list: () => client.get<ApiResponse<NotificationsData>>('/notifications'),
}
