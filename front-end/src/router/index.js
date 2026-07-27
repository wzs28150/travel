import { createRouter, createWebHashHistory } from 'vue-router'
import { getToken } from '../api/http'
import { useAuthStore } from '../stores/auth'
import { useTravelStore } from '../stores/travel'

const routes = [
  { path: '/', redirect: '/lists' },
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/Register.vue') },
  { path: '/lists', name: 'Lists', component: () => import('../views/Lists.vue'), meta: { requiresAuth: true } },
  { path: '/travel/:id', name: 'TravelDetail', component: () => import('../views/TravelDetail.vue'), meta: { requiresAuth: true } },
  { path: '/footprints', name: 'Footprints', component: () => import('../views/Footprints.vue'), meta: { requiresAuth: true } },
  { path: '/mine', name: 'Mine', component: () => import('../views/Mine.vue'), meta: { requiresAuth: true } },
  { path: '/profile-edit', name: 'ProfileEdit', component: () => import('../views/ProfileEdit.vue'), meta: { requiresAuth: true } },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局前置守卫：鉴权 + 数据预拉取
router.beforeEach(async (to) => {
  const token = getToken()
  const isAuthPage = to.name === 'Login' || to.name === 'Register'

  if (to.meta.requiresAuth) {
    if (!token) return { path: '/login', query: { redirect: to.fullPath } }
    const auth = useAuthStore()
    auth.hydrate()
    if (!auth.user) {
      try {
        await auth.fetchMe()
      } catch (e) {
        return { path: '/login' }
      }
    }
    const travel = useTravelStore()
    if (!travel.loaded) {
      try {
        await travel.fetchTravels()
      } catch (e) {
        /* 数据拉取失败不阻断页面，后续可重试 */
      }
    }
  }

  // 已登录还停留在登录/注册页 -> 进首页
  if (isAuthPage && token) return { path: '/lists' }

  return true
})

export default router
