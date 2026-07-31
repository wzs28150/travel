import { createRouter, createWebHashHistory } from 'vue-router'
import Login from './views/Login.vue'
import Users from './views/Users.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/users', name: 'Users', component: Users },
  { path: '/', redirect: '/users' },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 鉴权守卫：未登录跳登录页；已登录停留在后台
router.beforeEach((to) => {
  const token = localStorage.getItem('lvji-token')
  if (to.name !== 'Login' && !token) return { path: '/login' }
  if (to.name === 'Login' && token) return { path: '/users' }
  return true
})

export default router
