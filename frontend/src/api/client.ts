import axios from 'axios'

let csrfToken = ''

export function setCsrfToken(token: string) {
  csrfToken = token
}

export function getCsrfToken(): string {
  return csrfToken
}

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Adiciona X-CSRF-Token em TODAS as mutações, incluindo multipart
client.interceptors.request.use(config => {
  const method = (config.method ?? 'get').toLowerCase()
  if (['post', 'put', 'delete', 'patch'].includes(method) && csrfToken) {
    config.headers = config.headers ?? {}
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

client.interceptors.response.use(
  res => {
    const newToken = res.headers['x-csrf-token']
    if (newToken) setCsrfToken(newToken)
    return res
  },
  err => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)

export default client
