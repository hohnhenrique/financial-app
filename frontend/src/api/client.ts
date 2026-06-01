import axios from 'axios'

let csrfToken = ''

export function setCsrfToken(token: string) { csrfToken = token }
export function getCsrfToken(): string      { return csrfToken }

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
})

client.interceptors.request.use(config => {
  const method = (config.method ?? 'get').toLowerCase()
  if (['post', 'put', 'delete', 'patch'].includes(method)) {
    if (!config.headers) config.headers = {} as typeof config.headers

    // CSRF em toda mutação
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken

    // NÃO define Content-Type para FormData —
    // o axios define automaticamente com o boundary correto
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] ??= 'application/json'
    }
  }
  return config
})

client.interceptors.response.use(
  res => {
    const t = res.headers['x-csrf-token']
    if (t) setCsrfToken(t)
    return res
  },
  err => {
    if (err.response?.status === 401) window.location.href = '/login'
    return Promise.reject(err)
  }
)

export default client
