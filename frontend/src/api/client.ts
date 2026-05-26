import axios from 'axios'

let csrfToken = ''

export function setCsrfToken(token: string) {
  csrfToken = token
}

const client = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// Interceptor de request — adiciona X-CSRF-Token em mutações
client.interceptors.request.use(config => {
  const method = (config.method ?? 'get').toLowerCase()
  if (['post', 'put', 'delete', 'patch'].includes(method) && csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken
  }
  return config
})

// Interceptor de response — captura 401
client.interceptors.response.use(
  res => {
    // Atualiza o token se vier no header de resposta
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
