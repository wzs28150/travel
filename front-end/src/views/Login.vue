<template>
  <div class="auth-page">
    <div class="auth-hero">
      <div class="logo">🐱</div>
      <div class="brand">猫途迹</div>
      <div class="slogan">记录每一段值得收藏的旅程</div>
    </div>

    <div class="auth-card">
      <t-input v-model="form.username" label="账号" placeholder="请输入登录账号" clearable>
        <template #prefixIcon><t-icon name="user-1" /></template>
      </t-input>
      <t-input v-model="form.password" label="密码" type="password" placeholder="请输入密码" clearable>
        <template #prefixIcon><t-icon name="lock-on" /></template>
      </t-input>

      <t-button theme="primary" size="large" block :loading="loading" class="auth-btn" @click="onLogin">
        登录
      </t-button>

      <div class="switch">
        还没有账号？
        <span class="link" @click="goRegister">立即注册</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useAuthStore } from '../stores/auth'
import { useTravelStore } from '../stores/travel'

const auth = useAuthStore()
const travel = useTravelStore()
const route = useRoute()
const router = useRouter()

const form = reactive({ username: '', password: '' })
const loading = ref(false)

async function onLogin() {
  if (!form.username.trim() || !form.password) {
    return Toast({ message: '请输入账号和密码', theme: 'warning' })
  }
  loading.value = true
  try {
    await auth.login({ username: form.username.trim(), password: form.password })
    if (!travel.loaded) {
      try {
        await travel.fetchTravels()
      } catch (e) {}
    }
    Toast({ message: '登录成功', theme: 'success' })
    const redirect = route.query.redirect || '/lists'
    router.replace(redirect)
  } catch (e) {
    Toast({ message: e.message || '登录失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

function goRegister() {
  router.push('/register')
}
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  background: var(--brand-gradient);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: calc(env(safe-area-inset-top) + 60px) 24px 24px;
}
.auth-hero {
  text-align: center;
  color: #fff;
}
.logo {
  font-size: 54px;
}
.brand {
  font-size: 28px;
  font-weight: 800;
  margin-top: 8px;
  letter-spacing: 2px;
}
.slogan {
  font-size: 13px;
  opacity: 0.9;
  margin-top: 6px;
}
.auth-card {
  margin-top: 40px;
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 18px;
  padding: 24px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
}
.auth-btn {
  margin-top: 22px;
}
.switch {
  text-align: center;
  font-size: 13px;
  color: var(--text-2);
  margin-top: 16px;
}
.link {
  color: var(--brand);
  font-weight: 600;
}
</style>
