<template>
  <div class="auth-page">
    <div class="auth-hero">
      <div class="logo">🐱</div>
      <div class="brand">猫途迹</div>
      <div class="slogan">创建账号，开启你的旅行相册</div>
    </div>

    <div class="auth-card">
      <t-input v-model="form.username" label="账号" placeholder="用于登录，4-20 位" clearable>
        <template #prefixIcon><t-icon name="user-1" /></template>
      </t-input>
      <t-input v-model="form.nickname" label="昵称" placeholder="展示在个人页（选填）" clearable>
        <template #prefixIcon><t-icon name="edit-1" /></template>
      </t-input>
      <t-input v-model="form.password" label="密码" type="password" placeholder="至少 6 位" clearable>
        <template #prefixIcon><t-icon name="lock-on" /></template>
      </t-input>
      <t-input v-model="form.confirm" label="确认" type="password" placeholder="再次输入密码" clearable>
        <template #prefixIcon><t-icon name="lock-on" /></template>
      </t-input>

      <t-button theme="primary" size="large" block :loading="loading" class="auth-btn" @click="onRegister">
        注册并登录
      </t-button>

      <div class="switch">
        已有账号？
        <span class="link" @click="goLogin">去登录</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useAuthStore } from '../stores/auth'
import { useTravelStore } from '../stores/travel'

const auth = useAuthStore()
const travel = useTravelStore()
const router = useRouter()

const form = reactive({ username: '', nickname: '', password: '', confirm: '' })
const loading = ref(false)

async function onRegister() {
  const u = form.username.trim()
  if (u.length < 4) return Toast({ message: '账号至少 4 位', theme: 'warning' })
  if (form.password.length < 6) return Toast({ message: '密码至少 6 位', theme: 'warning' })
  if (form.password !== form.confirm) return Toast({ message: '两次密码不一致', theme: 'warning' })

  loading.value = true
  try {
    await auth.register({ username: u, password: form.password, nickname: form.nickname.trim() })
    try {
      await travel.fetchTravels()
    } catch (e) {}
    Toast({ message: '注册成功', theme: 'success' })
    router.replace('/lists')
  } catch (e) {
    Toast({ message: e.message || '注册失败', theme: 'error' })
  } finally {
    loading.value = false
  }
}

function goLogin() {
  router.push('/login')
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
