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
          <t-button v-if="!pendingRequest" size="extra-small" theme="primary" variant="outline" @click="applyVisible = true">申请扩容</t-button>
          <t-tag v-else theme="warning" variant="light" size="small">审核中 · +{{ pendingRequest.requestedGb }}GB</t-tag>
        </div>
      </div>

      <t-cell-group theme="card" class="mine-group">
        <t-cell v-if="auth.isAdmin" title="用户管理" note="管理后台" arrow @click="openAdmin">
          <template #leftIcon><t-icon name="usergroup" size="20px" color="#7c5cff" /></template>
        </t-cell>
        <t-cell title="编辑个人信息" arrow @click="goEdit">
          <template #leftIcon><t-icon name="user-1" size="20px" color="#ff7a45" /></template>
        </t-cell>
        <t-cell title="我的收藏" arrow @click="goFavorites">
          <template #leftIcon><t-icon name="star" size="20px" color="#ffb302" /></template>
        </t-cell>
        <t-cell title="消息通知" arrow @click="comingSoon('消息通知')">
          <template #leftIcon><t-icon name="notification" size="20px" color="#4d7cff" /></template>
        </t-cell>
        <t-cell title="隐私设置" arrow @click="comingSoon('隐私设置')">
          <template #leftIcon><t-icon name="lock-on" size="20px" color="#52c41a" /></template>
        </t-cell>
      </t-cell-group>

      <t-cell-group theme="card" class="mine-group">
        <t-cell title="帮助与反馈" arrow @click="showHelp = true">
          <template #leftIcon><t-icon name="help-circle" size="20px" color="#00a870" /></template>
        </t-cell>
        <t-cell title="关于旅迹" note="v1.0.0" arrow @click="showAbout = true">
          <template #leftIcon><t-icon name="info-circle" size="20px" color="#8a8a8a" /></template>
        </t-cell>
        <t-cell title="退出登录" @click="logout">
          <template #leftIcon><t-icon name="poweroff" size="20px" color="#ff4d4f" /></template>
        </t-cell>
      </t-cell-group>
    </div>

    <app-tab-bar active="mine" />

    <!-- 关于旅迹 -->
    <t-dialog v-model:visible="showAbout" title="关于旅迹" :close-on-overlay-click="true">
      <div class="about">
        <div class="about-logo">🧭</div>
        <div class="about-name">旅迹</div>
        <div class="about-ver">v1.0.0</div>
        <p class="about-desc">记录每一次出发：旅行清单、行程规划、足迹地图与旅行相册，让你的每段旅程都被认真收藏。</p>
        <div class="about-feats">
          <span>📋 清单规划</span>
          <span>🗺️ 足迹地图</span>
          <span>📷 旅行相册</span>
          <span>🌤️ 天气参考</span>
        </div>
      </div>
    </t-dialog>

    <!-- 帮助与反馈 -->
    <t-dialog v-model:visible="showHelp" title="帮助与反馈" :close-on-overlay-click="true">
      <div class="help">
        <p class="help-h">快速上手</p>
        <p>1. 在「清单」新建旅行，填写目的地与日期；</p>
        <p>2. 进入详情规划行程、打包行李、记录预算；</p>
        <p>3. 旅途中上传照片，按拍摄地整理相册；</p>
        <p>4.「足迹」会自动解锁你去过的城市。</p>
        <p class="help-fb">遇到问题或有好建议？欢迎通过邮箱 <b>feedback@lvji.app</b> 联系我们。</p>
      </div>
    </t-dialog>

    <!-- 申请扩容 -->
    <t-dialog
      v-model:visible="applyVisible"
      title="申请扩容"
      :close-on-overlay-click="true"
      :confirm-btn="{ content: '提交申请', loading: applyLoading }"
      :cancel-btn="{ content: '取消' }"
      @confirm="submitApply"
    >
      <div class="apply">
        <p class="apply-tip">当前剩余 {{ freeText }}，如需更多空间请提交申请，由管理员在后台审核通过后生效。</p>
        <label class="apply-lbl">申请增加容量</label>
        <div class="gb-opts">
          <button v-for="g in [5, 20, 50, 100]" :key="g" class="gb-opt" :class="{ active: applyGb === g }" @click="applyGb = g">+{{ g }}GB</button>
        </div>
        <label class="apply-lbl">自定义（GB，1–500）</label>
        <input v-model.number="applyGb" type="number" min="1" max="500" class="apply-input" />
        <label class="apply-lbl">申请理由（可选）</label>
        <textarea v-model="applyReason" rows="3" class="apply-text" placeholder="例如：这次长途旅行照片较多"></textarea>
      </div>
    </t-dialog>
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
const showAbout = ref(false)
const showHelp = ref(false)
const applyVisible = ref(false)
const applyGb = ref(20)
const applyReason = ref('')
const applyLoading = ref(false)
const myRequest = ref(null)
const pendingRequest = computed(() =>
  myRequest.value && myRequest.value.status === 'pending' ? myRequest.value : null
)

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
async function loadRequest() {
  try {
    const res = await api.get('/auth/storage/request')
    myRequest.value = res.data
  } catch (e) {}
}

onMounted(() => {
  loadStorage()
  loadRequest()
})

function goEdit() {
  router.push('/profile-edit')
}
function goFavorites() {
  router.push('/lists?filter=fav')
}
function comingSoon(name) {
  Toast({ message: `${name}功能即将上线`, theme: 'default' })
}
function openAdmin() {
  window.location.href = '/admin.html'
}
async function submitApply() {
  if (!applyGb || applyGb <= 0) {
    Toast({ message: '请填写有效的扩容容量', theme: 'error' })
    return
  }
  applyLoading.value = true
  try {
    await api.post('/auth/storage/apply', { requestedGb: applyGb, reason: applyReason })
    Toast({ message: '申请已提交，等待管理员审核', theme: 'success' })
    applyVisible.value = false
    applyReason.value = ''
    loadRequest()
    loadStorage()
  } catch (e) {
    Toast({ message: e.message || '提交失败', theme: 'error' })
  } finally {
    applyLoading.value = false
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

/* 关于 / 帮助弹窗 */
.about {
  text-align: center;
  padding: 4px 4px 8px;
}
.about-logo {
  font-size: 42px;
  line-height: 1;
}
.about-name {
  font-size: 18px;
  font-weight: 800;
  margin-top: 6px;
}
.about-ver {
  display: inline-block;
  margin-top: 6px;
  font-size: 12px;
  color: #fff;
  background: var(--brand);
  border-radius: 999px;
  padding: 2px 10px;
}
.about-desc {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
  margin: 12px 4px;
}
.about-feats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
}
.about-feats span {
  font-size: 12px;
  color: var(--brand);
  background: var(--brand-light);
  border-radius: 999px;
  padding: 4px 10px;
}
.help {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.8;
  padding: 2px 2px 6px;
}
.help-h {
  font-weight: 700;
  color: var(--text-1);
  margin-bottom: 4px;
}
.help-fb {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed var(--border);
  color: var(--text-1);
}

/* 申请扩容弹窗 */
.apply-tip {
  font-size: 13px;
  color: var(--text-2);
  line-height: 1.6;
  margin: 0 0 12px;
}
.apply-lbl {
  display: block;
  font-size: 13px;
  color: var(--text-1);
  margin: 12px 0 6px;
}
.gb-opts {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.gb-opt {
  padding: 7px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  font-size: 13px;
  color: var(--text-1);
  cursor: pointer;
}
.gb-opt.active {
  border-color: var(--brand);
  color: var(--brand);
  font-weight: 700;
}
.apply-input,
.apply-text {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  color: var(--text-1);
  background: var(--card-bg);
}
.apply-input:focus,
.apply-text:focus {
  border-color: var(--brand);
}
</style>
