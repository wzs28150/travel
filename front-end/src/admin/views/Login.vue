<template>
  <div class="login-wrap">
    <div class="login-card">
      <div class="brand">
        <span class="logo">🧭</span>
        <h1>旅迹 · 管理后台</h1>
        <p>请使用管理员账号登录</p>
      </div>
      <form @submit.prevent="onLogin">
        <label>账号</label>
        <input v-model="username" type="text" placeholder="管理员账号" autocomplete="username" />
        <label>密码</label>
        <input v-model="password" type="password" placeholder="密码" autocomplete="current-password" />
        <p v-if="error" class="err">{{ error }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '登录中…' : '登 录' }}</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken } from '../../api/http.js'

const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function onLogin() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  loading.value = true
  try {
    // 管理端独立登录接口：仅管理员可拿到 token，非管理员返回 401
    const res = await api.post('/auth/admin-login', {
      username: username.value,
      password: password.value,
    })
    const { token } = res.data
    setToken(token)
    router.replace('/users')
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-wrap {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2b5876 0%, #4e4376 100%);
}
.login-card {
  width: 360px;
  background: #fff;
  border-radius: 16px;
  padding: 36px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
}
.brand {
  text-align: center;
  margin-bottom: 26px;
}
.brand .logo {
  font-size: 38px;
}
.brand h1 {
  font-size: 20px;
  margin: 10px 0 4px;
}
.brand p {
  margin: 0;
  color: #8a9099;
  font-size: 13px;
}
label {
  display: block;
  font-size: 13px;
  color: #4a505c;
  margin: 14px 0 6px;
}
input {
  width: 100%;
  height: 42px;
  border: 1px solid #dfe3e8;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}
input:focus {
  border-color: #4e4376;
}
.err {
  color: #e54545;
  font-size: 13px;
  margin: 12px 0 0;
}
button {
  width: 100%;
  height: 44px;
  margin-top: 22px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #2b5876, #4e4376);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}
button:hover {
  opacity: 0.92;
}
button:disabled {
  opacity: 0.6;
  cursor: default;
}
</style>
