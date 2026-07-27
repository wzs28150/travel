// 统一请求封装（相对路径 /api，由 Vite 代理到后端）
const TOKEN_KEY = 'cat-token'
const BASE = '/api'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t)
  else localStorage.removeItem(TOKEN_KEY)
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = getToken()
    if (t) headers['Authorization'] = 'Bearer ' + t
  }
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data = null
  try {
    data = await res.json()
  } catch (e) {
    data = null
  }
  // 未登录 / 登录过期
  if (res.status === 401) {
    clearToken()
    if (location.hash.indexOf('#/login') === -1 && location.hash.indexOf('#/register') === -1) {
      location.hash = '#/login'
    }
    throw new Error((data && data.message) || '请重新登录')
  }
  if (!res.ok || (data && data.code && data.code !== 0)) {
    throw new Error((data && data.message) || `请求失败 (${res.status})`)
  }
  return data
}

export const api = {
  get: (p) => request(p),
  post: (p, b) => request(p, { method: 'POST', body: b }),
  put: (p, b) => request(p, { method: 'PUT', body: b }),
  del: (p) => request(p, { method: 'DELETE' }),
}

// 图片上传（multipart）
export async function uploadFile(file) {
  const fd = new FormData()
  fd.append('file', file)
  const headers = {}
  const t = getToken()
  if (t) headers['Authorization'] = 'Bearer ' + t
  const res = await fetch(BASE + '/upload', { method: 'POST', headers, body: fd })
  const data = await res.json()
  if (res.status === 401) {
    clearToken()
    location.hash = '#/login'
    throw new Error('请重新登录')
  }
  if (!res.ok || (data && data.code && data.code !== 0)) {
    throw new Error((data && data.message) || '上传失败')
  }
  return data.data
}
