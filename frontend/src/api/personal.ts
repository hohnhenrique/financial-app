import client from './client'
import type { ApiResponse } from '@/types'

export interface Priority {
  id: string; label: string; color: string; level: number; icon: string
}
export interface PersonalGoal {
  id: string; title: string; description: string | null; category: string
  priority_id: string | null; priority_label: string | null; priority_color: string | null
  target_value: number; current_value: number; unit: string
  color: string; icon: string; deadline: string | null; status: string; created_at: string
}
export interface PersonalHabit {
  id: string; title: string; description: string | null; category: string
  priority_id: string | null; priority_label: string | null; priority_color: string | null
  frequency: string; target_count: number; color: string; icon: string
  is_active: boolean; today_count: number | null; streak: number | null
  week_logs: { date: string; count: number }[] | null; created_at: string
}
export interface PersonalTask {
  id: string; title: string; description: string | null; category: string
  priority_id: string | null; priority_label: string | null; priority_color: string | null
  priority_level: number | null; status: string; due_date: string | null
  completed_at: string | null; color: string; tags: string | null; created_at: string
}

export const personalApi = {
  priorities: () => client.get<ApiResponse<Priority[]>>('/priorities'),

  goals: {
    list:   (status?: string) => client.get<ApiResponse<PersonalGoal[]>>('/personal/goals', { params: status ? { status } : {} }),
    create: (data: Partial<PersonalGoal>) => client.post<ApiResponse<{ id: string }>>('/personal/goals', data),
    update: (id: string, data: Partial<PersonalGoal>) => client.put<ApiResponse<null>>(`/personal/goals/${id}`, data),
    delete: (id: string) => client.delete<ApiResponse<null>>(`/personal/goals/${id}`),
  },

  habits: {
    list:   () => client.get<ApiResponse<PersonalHabit[]>>('/personal/habits'),
    create: (data: Partial<PersonalHabit>) => client.post<ApiResponse<{ id: string }>>('/personal/habits', data),
    update: (id: string, data: Partial<PersonalHabit>) => client.put<ApiResponse<null>>(`/personal/habits/${id}`, data),
    delete: (id: string) => client.delete<ApiResponse<null>>(`/personal/habits/${id}`),
    log:    (id: string, date: string) => client.post<ApiResponse<{ logged: boolean }>>(`/personal/habits/${id}/log`, { date }),
  },

  tasks: {
    list:         (status?: string) => client.get<ApiResponse<PersonalTask[]>>('/personal/tasks', { params: status ? { status } : {} }),
    create:       (data: Partial<PersonalTask>) => client.post<ApiResponse<{ id: string }>>('/personal/tasks', data),
    update:       (id: string, data: Partial<PersonalTask>) => client.put<ApiResponse<null>>(`/personal/tasks/${id}`, data),
    updateStatus: (id: string, status: string) => client.put<ApiResponse<null>>(`/personal/tasks/${id}/status`, { status }),
    delete:       (id: string) => client.delete<ApiResponse<null>>(`/personal/tasks/${id}`),
  },
}
