// 统一请求封装（相对路径 /api，由 Vite 代理到后端）
const TOKEN_KEY = 'lvji-token'
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

// 管理后台独立 token（与客户端 lvji-token 隔离，避免互相覆盖登录态）
const ADMIN_TOKEN_KEY = 'lvji-admin-token'
export function getAdminToken() {
  return localStorage.getItem(ADMIN_TOKEN_KEY) || ''
}
export function setAdminToken(t) {
  if (t) localStorage.setItem(ADMIN_TOKEN_KEY, t)
  else localStorage.removeItem(ADMIN_TOKEN_KEY)
}
export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
}

async function request(path, { method = 'GET', body, auth = true, token } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (auth) {
    const t = token || getToken()
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
  get: (p, opt) => request(p, { ...opt }),
  post: (p, b, opt) => request(p, { method: 'POST', body: b, ...opt }),
  put: (p, b, opt) => request(p, { method: 'PUT', body: b, ...opt }),
  del: (p, opt) => request(p, { method: 'DELETE', ...opt }),
}

// 管理后台接口（需管理员 token，与客户端 token 隔离）
export const adminApi = {
  list(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page);
    if (params.pageSize) q.set('pageSize', params.pageSize);
    if (params.keyword) q.set('keyword', params.keyword);
    const qs = q.toString();
    return api.get('/admin/users' + (qs ? '?' + qs : ''), { token: getAdminToken() });
  },
  create(body) {
    return api.post('/admin/users', body, { token: getAdminToken() });
  },
  update(id, body) {
    return api.put('/admin/users/' + id, body, { token: getAdminToken() });
  },
  remove(id) {
    return api.del('/admin/users/' + id, { token: getAdminToken() });
  },
};

// 存储扩容申请（管理员审批）
export const storageRequestApi = {
  list(params = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    const qs = q.toString();
    return api.get('/admin/storage-requests' + (qs ? '?' + qs : ''), { token: getAdminToken() });
  },
  approve(id) {
    return api.put('/admin/storage-requests/' + id + '/approve', {}, { token: getAdminToken() });
  },
  reject(id, note) {
    return api.put('/admin/storage-requests/' + id + '/reject', { note }, { token: getAdminToken() });
  },
};

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
