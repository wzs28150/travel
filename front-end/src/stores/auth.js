import { defineStore } from 'pinia'
import { api, getToken, setToken, clearToken } from '../api/http'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: getToken(),
    user: null, // { id, username, nickname, avatar, signature, gender, city }
    loading: false,
  }),
  getters: {
    isLogin: (s) => !!s.token,
    isAdmin: (s) => !!s.user?.is_admin,
    nickname: (s) => s.user?.nickname || '旅行者',
  },
  actions: {
    // 从 localStorage 回填 token（刷新页面后保持登录）
    hydrate() {
      const t = getToken()
      if (t) this.token = t
    },
    async login({ username, password }) {
      this.loading = true
      try {
        const res = await api.post('/auth/login', { username, password })
        this.token = res.data.token
        this.user = res.data.user
        setToken(this.token)
        return res.data
      } finally {
        this.loading = false
      }
    },
    async register({ username, password, nickname }) {
      this.loading = true
      try {
        const res = await api.post('/auth/register', { username, password, nickname })
        this.token = res.data.token
        this.user = res.data.user
        setToken(this.token)
        return res.data
      } finally {
        this.loading = false
      }
    },
    async fetchMe() {
      const res = await api.get('/auth/me')
      this.user = res.data
      return res.data
    },
    async updateProfile(patch) {
      const res = await api.put('/auth/profile', patch)
      this.user = res.data
      return res.data
    },
    logout() {
      this.token = ''
      this.user = null
      clearToken()
    },
  },
})
