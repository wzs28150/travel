<template>
  <div class="page mine-page" name="Mine">
    <div class="mine-header">
      <div class="profile" @click="goEdit">
        <t-avatar :image="user.avatar" size="64px" class="avatar-ring">
          <template v-if="!user.avatar">{{ (user.nickname || '旅').slice(0, 1) }}</template>
        </t-avatar>
        <div class="p-info">
          <div class="p-name">{{ user.nickname || '旅行者' }} <t-icon name="edit-1" size="16px" /></div>
          <div class="p-sign text-ellipsis">{{ user.signature || '这个人很懒，什么都没写' }}</div>
          <div class="p-tags">
            <t-tag size="small" variant="light" theme="warning">{{ user.gender || '保密' }}</t-tag>
            <t-tag v-if="user.city" size="small" variant="light" style="margin-left:6px">{{ user.city }}</t-tag>
          </div>
        </div>
      </div>

      <div class="mini-stats">
        <div class="ms">
          <div class="ms-num">{{ store.travels.length }}</div>
          <div class="ms-lbl">旅行</div>
        </div>
        <div class="ms-sep"></div>
        <div class="ms">
          <div class="ms-num">{{ store.visitedCities.size }}</div>
          <div class="ms-lbl">城市</div>
        </div>
        <div class="ms-sep"></div>
        <div class="ms">
          <div class="ms-num">{{ photoCount }}</div>
          <div class="ms-lbl">照片</div>
        </div>
      </div>
    </div>

    <div class="page-scroll">
      <!-- 存储空间 -->
      <div class="card storage-card">
        <div class="flex-between">
          <div class="s-title"><t-icon name="cloud" /> 我的存储空间</div>
          <span class="s-detail">{{ usedText }} / {{ totalText }}</span>
        </div>
        <t-progress
          :percentage="storagePercent"
          :color="{ from: '#ffb07a', to: '#ff7a45' }"
          style="margin-top:14px"
        />
        <div class="s-foot">
          <span>剩余 {{ freeText }}</span>
          <t-button size="extra-small" theme="primary" variant="outline" :loading="expanding" @click="expand">扩容</t-button>
        </div>
      </div>

      <t-cell-group theme="card" class="mine-group">
        <t-cell v-if="auth.isAdmin" title="用户管理" note="管理后台" arrow @click="openAdmin">
          <template #leftIcon><t-icon name="usergroup" size="20px" color="#7c5cff" /></template>
        </t-cell>
        <t-cell title="编辑个人信息" arrow @click="goEdit">
          <template #leftIcon><t-icon name="user-1" size="20px" color="#ff7a45" /></template>
        </t-cell>
        <t-cell title="我的收藏" note="即将上线" arrow>
          <template #leftIcon><t-icon name="star" size="20px" color="#ffb302" /></template>
        </t-cell>
        <t-cell title="消息通知" arrow>
          <template #leftIcon><t-icon name="notification" size="20px" color="#4d7cff" /></template>
        </t-cell>
        <t-cell title="隐私设置" arrow>
          <template #leftIcon><t-icon name="lock-on" size="20px" color="#52c41a" /></template>
        </t-cell>
      </t-cell-group>

      <t-cell-group theme="card" class="mine-group">
        <t-cell title="帮助与反馈" arrow>
          <template #leftIcon><t-icon name="help-circle" size="20px" color="#00a870" /></template>
        </t-cell>
        <t-cell title="关于旅迹" note="v1.0.0" arrow>
          <template #leftIcon><t-icon name="info-circle" size="20px" color="#8a8a8a" /></template>
        </t-cell>
        <t-cell title="退出登录" @click="logout">
          <template #leftIcon><t-icon name="poweroff" size="20px" color="#ff4d4f" /></template>
        </t-cell>
      </t-cell-group>
    </div>

    <app-tab-bar active="mine" />
  </div>
</template>

<script setup name="Mine">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dialog, Toast } from 'tdesign-mobile-vue'
import { useTravelStore } from '../stores/travel'
import { useAuthStore } from '../stores/auth'
import { api } from '../api/http'
import AppTabBar from '../components/AppTabBar.vue'

const store = useTravelStore()
const auth = useAuthStore()
const router = useRouter()
const user = computed(() => auth.user || {})

const photoCount = computed(() => store.travels.reduce((n, t) => n + (t.photos?.length || 0), 0))

const storage = ref({ used: 0, total: 2 * 1024 * 1024 * 1024, percent: 0 })
const expanding = ref(false)

function fmt(bytes) {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}
const usedText = computed(() => fmt(storage.value.used))
const totalText = computed(() => fmt(storage.value.total))
const freeText = computed(() => fmt(Math.max(0, storage.value.total - storage.value.used)))
const storagePercent = computed(() => Math.min(100, Math.round(storage.value.percent)))

async function loadStorage() {
  try {
    const res = await api.get('/auth/storage')
    storage.value = res.data
  } catch (e) {}
}

onMounted(loadStorage)

function goEdit() {
  router.push('/profile-edit')
}
function openAdmin() {
  window.location.href = '/admin.html'
}
async function expand() {
  expanding.value = true
  try {
    const res = await api.put('/auth/storage/expand')
    storage.value = res.data
    Toast({ message: '扩容成功，+2GB 🎉', theme: 'success' })
  } catch (e) {
    Toast({ message: e.message || '扩容失败', theme: 'error' })
  } finally {
    expanding.value = false
  }
}
function logout() {
  Dialog.confirm({
    title: '退出登录',
    content: '确定退出当前账号吗？',
    confirmBtn: { content: '退出', theme: 'danger' },
    cancelBtn: '取消',
    onConfirm: () => {
      auth.logout()
      router.replace('/login')
    }
  })
}
</script>

<style scoped>
.mine-page { background: transparent; }

.mine-header {
  background: var(--brand-gradient);
  color: #fff;
  padding: calc(env(safe-area-inset-top) + 26px) 18px 20px;
}

.avatar-ring :deep(.t-avatar) {
  border: 3px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
}

.profile {
  display: flex;
  align-items: center;
  gap: 14px;
  position: relative;
  z-index: 1;
}
.p-info {
  flex: 1;
  min-width: 0;
}
.p-name {
  font-size: 19px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.p-sign {
  font-size: 12px;
  opacity: 0.9;
  margin: 4px 0 8px;
}
.p-tags {
  display: flex;
  gap: 6px;
}

.mini-stats {
  display: flex;
  align-items: center;
  margin-top: 20px;
  background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 14px;
  padding: 12px 0;
  position: relative;
  z-index: 1;
}
.ms {
  flex: 1;
  text-align: center;
}
.ms-num {
  font-size: 18px;
  font-weight: 700;
}
.ms-lbl {
  font-size: 11px;
  opacity: 0.92;
  margin-top: 2px;
}
.ms-sep {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.28);
}

/* 与下方 t-cell-group 对齐（统一左右 12px 外边距） */
.storage-card {
  margin: 0 12px 12px;
}
.storage-card .s-title {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-1);
}
.storage-card .s-title :deep(.t-icon) {
  color: #ff7a45;
}
.s-detail {
  font-size: 13px;
  color: var(--text-2);
}
.s-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 12px;
  color: var(--text-2);
}

.mine-group {
  border-radius: 16px;
  overflow: hidden;
}
:deep(.t-cell-group) {
  margin: 0 12px 12px;
  border-radius: 16px;
  overflow: hidden;
  background: var(--card-bg);
}
</style>
