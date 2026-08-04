<template>
  <div class="layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="side-brand">
        <span class="logo">🧭</span>
        <span>旅迹后台</span>
      </div>
      <nav class="side-nav">
        <a class="side-item" :class="{ active: active === 'users' }" @click="go('/users')">👥 用户管理</a>
        <a class="side-item" :class="{ active: active === 'storage' }" @click="go('/storage-requests')">📦 存储扩容</a>
      </nav>
      <div class="side-foot">旅迹 Travel Admin</div>
    </aside>

    <!-- 主区域 -->
    <main class="main">
      <header class="topbar">
        <h2>{{ title }}</h2>
        <div class="me">
          <span class="me-name">{{ adminNickname || '管理员' }}</span>
          <button class="link-btn" @click="logout">退出</button>
        </div>
      </header>

      <section class="content">
        <slot />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { api, getAdminToken, clearAdminToken } from '../../api/http.js'

const props = defineProps({
  title: { type: String, default: '' },
  active: { type: String, default: '' },
})

const router = useRouter()
const adminNickname = ref('')

function go(p) {
  if (p !== router.currentRoute.value.path) router.push(p)
}
async function loadMe() {
  try {
    const res = await api.get('/auth/me')
    adminNickname.value = res.data?.nickname || ''
  } catch (e) {
    /* 登录守卫已保证有 token */
  }
}
function logout() {
  clearAdminToken()
  router.replace('/login')
}

onMounted(() => {
  if (!getAdminToken()) {
    router.replace('/login')
    return
  }
  loadMe()
})
</script>

<style scoped>
.layout {
  display: flex;
  height: 100%;
}
/* 侧边栏 */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1f2330;
  color: #cfd3dc;
  display: flex;
  flex-direction: column;
}
.side-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 22px 20px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.side-brand .logo {
  font-size: 24px;
}
.side-nav {
  padding: 8px;
  flex: 1;
}
.side-item {
  display: block;
  padding: 12px 14px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  color: #cfd3dc;
}
.side-item:hover {
  background: rgba(255, 255, 255, 0.06);
}
.side-item.active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.side-foot {
  padding: 16px 20px;
  font-size: 12px;
  color: #6b7280;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

/* 主区域 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.topbar {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  background: #fff;
  border-bottom: 1px solid #eceef1;
}
.topbar h2 {
  margin: 0;
  font-size: 18px;
}
.me {
  display: flex;
  align-items: center;
  gap: 14px;
}
.me-name {
  font-size: 14px;
  color: #4a505c;
}
.content {
  flex: 1;
  overflow: auto;
  padding: 24px 28px;
}
.link-btn {
  background: none;
  border: none;
  color: #4e4376;
  font-size: 13px;
  cursor: pointer;
  padding: 0 6px;
}
</style>
