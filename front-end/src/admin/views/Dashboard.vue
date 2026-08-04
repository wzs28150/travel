<template>
  <AdminLayout title="数据概览" active="dashboard">
    <!-- 统计卡片 -->
    <div class="cards">
      <div class="card">
        <div class="card-label">用户总数</div>
        <div class="card-num">{{ fmtNum(s.userCount) }}</div>
        <div class="card-sub">管理员 {{ fmtNum(s.adminCount) }} 人</div>
      </div>
      <div class="card">
        <div class="card-label">旅行总数</div>
        <div class="card-num">{{ fmtNum(s.travelTotal) }}</div>
        <div class="card-sub">全站累计创建</div>
      </div>
      <div class="card">
        <div class="card-label">待审批扩容</div>
        <div class="card-num" :class="{ alert: s.pendingRequests > 0 }">{{ fmtNum(s.pendingRequests) }}</div>
        <div class="card-sub">{{ s.pendingRequests > 0 ? '需尽快处理' : '暂无待办' }}</div>
      </div>
      <div class="card wide">
        <div class="card-label">存储用量</div>
        <div class="card-num">{{ fmt(s.storageUsedTotal) }} <span class="card-of">/ {{ fmt(s.storageLimitTotal) }}</span></div>
        <div class="bar">
          <div class="bar-in" :class="usedClass" :style="{ width: usedPercent + '%' }"></div>
        </div>
        <div class="card-sub">已用 {{ usedPercent }}%</div>
      </div>
    </div>

    <!-- 待处理扩容 -->
    <div class="panel">
      <div class="panel-head">
        <h3>待处理扩容申请</h3>
        <router-link to="/storage-requests" class="more">查看全部 ›</router-link>
      </div>
      <div v-if="pending.length" class="plist">
        <div v-for="r in pending" :key="r.id" class="pitem">
          <div class="pwho">
            <span class="pname">{{ r.nickname || r.username }}</span>
            <span class="psub">@{{ r.username }}</span>
          </div>
          <div class="pgb">申请 +{{ r.requestedGb }} GB</div>
          <div class="preason">{{ r.reason || '—' }}</div>
          <div class="pactions">
            <button class="link-btn ok" @click="approve(r)">通过</button>
            <button class="link-btn danger" @click="reject(r)">拒绝</button>
          </div>
        </div>
      </div>
      <div v-else class="pempty">🎉 没有待处理的扩容申请</div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { statsApi, storageRequestApi } from '../../api/http.js'
import AdminLayout from '../components/AdminLayout.vue'

const router = useRouter()
const s = ref({
  userCount: 0,
  adminCount: 0,
  travelTotal: 0,
  storageLimitTotal: 0,
  storageUsedTotal: 0,
  pendingRequests: 0,
})
const pending = ref([])

const usedPercent = computed(() => {
  const lim = Number(s.value.storageLimitTotal) || 0
  if (!lim) return 0
  return Math.min(100, Math.round((Number(s.value.storageUsedTotal) / lim) * 100))
})
const usedClass = computed(() => {
  const p = usedPercent.value
  if (p >= 90) return 'bar-red'
  if (p >= 70) return 'bar-orange'
  return 'bar-green'
})

function fmtNum(n) {
  return Number(n || 0).toLocaleString('zh-CN')
}
function fmt(bytes) {
  bytes = Number(bytes) || 0
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB'
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}

async function loadStats() {
  try {
    const res = await statsApi.overview()
    s.value = res.data || s.value
  } catch (e) { /* 拦截器统一提示 */ }
}
async function loadPending() {
  try {
    const res = await storageRequestApi.list({ status: 'pending' })
    pending.value = (res.data.list || []).slice(0, 5)
  } catch (e) { /* 拦截器统一提示 */ }
}

async function approve(r) {
  if (!confirm(`确定通过 @${r.username} 的扩容申请（+${r.requestedGb}GB）吗？`)) return
  try {
    await storageRequestApi.approve(r.id)
    loadPending()
    loadStats()
  } catch (e) { alert(e.message || '操作失败') }
}
async function reject(r) {
  const note = prompt('拒绝理由（可选）：', '')
  if (note === null) return
  try {
    await storageRequestApi.reject(r.id, note)
    loadPending()
    loadStats()
  } catch (e) { alert(e.message || '操作失败') }
}

onMounted(() => {
  loadStats()
  loadPending()
})
</script>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.card {
  background: #fff;
  border: 1px solid #eceef1;
  border-radius: 14px;
  padding: 20px 22px;
}
.card.wide {
  grid-column: span 4;
}
.card-label {
  font-size: 13px;
  color: #8a9099;
}
.card-num {
  font-size: 30px;
  font-weight: 700;
  color: #1f2329;
  margin: 10px 0 4px;
}
.card-num.alert {
  color: #ff9f0a;
}
.card-of {
  font-size: 16px;
  color: #9aa0aa;
  font-weight: 500;
}
.card-sub {
  font-size: 12px;
  color: #9aa0aa;
}
.bar {
  width: 100%;
  height: 10px;
  background: #eef1f4;
  border-radius: 6px;
  overflow: hidden;
  margin-top: 14px;
}
.bar-in {
  height: 100%;
  border-radius: 6px;
  transition: width 0.3s;
}
.bar-green { background: #34c759; }
.bar-orange { background: #ff9f0a; }
.bar-red { background: #ff3b30; }

.panel {
  background: #fff;
  border: 1px solid #eceef1;
  border-radius: 14px;
  padding: 18px 22px 22px;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.panel-head h3 {
  margin: 0;
  font-size: 16px;
}
.more {
  font-size: 13px;
  color: #4e4376;
  text-decoration: none;
}
.plist {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
.pitem {
  border: 1px solid #f0f2f5;
  border-radius: 12px;
  padding: 14px 16px;
}
.pwho {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.pname {
  font-weight: 600;
  color: #1f2329;
}
.psub {
  font-size: 12px;
  color: #9aa0aa;
}
.pgb {
  margin-top: 6px;
  font-weight: 700;
  color: #2b5876;
  font-size: 14px;
}
.preason {
  margin-top: 4px;
  font-size: 13px;
  color: #4a505c;
  min-height: 18px;
}
.pactions {
  margin-top: 10px;
  text-align: right;
}
.pempty {
  text-align: center;
  color: #9aa0aa;
  padding: 30px 0;
  font-size: 14px;
}
.link-btn {
  background: none;
  border: none;
  font-size: 13px;
  cursor: pointer;
  padding: 0 6px;
}
.link-btn.ok { color: #00a870; }
.link-btn.danger { color: #e54545; }
</style>
