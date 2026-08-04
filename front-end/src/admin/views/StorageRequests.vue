<template>
  <AdminLayout title="存储扩容申请" active="storage">
    <div class="toolbar">
      <div class="tabs">
        <button
          v-for="t in tabs"
          :key="t.value"
          class="tab"
          :class="{ active: filter === t.value }"
          @click="changeTab(t.value)"
        >{{ t.label }}</button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>申请人</th>
            <th>申请容量</th>
            <th>当前上限</th>
            <th>理由</th>
            <th>状态</th>
            <th>提交时间</th>
            <th class="op">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in list" :key="r.id">
            <td>
              <div class="u-name">{{ r.nickname || r.username }}</div>
              <div class="u-sub">@{{ r.username }}</div>
            </td>
            <td class="gb">+{{ r.requestedGb }} GB</td>
            <td>{{ fmt(r.currentLimit) }}</td>
            <td class="reason">{{ r.reason || '—' }}</td>
            <td>
              <span :class="['badge', 'badge-' + r.status]">{{ statusText(r.status) }}</span>
              <div v-if="r.status !== 'pending' && r.adminNote" class="note">备注：{{ r.adminNote }}</div>
            </td>
            <td class="muted">{{ fmtDate(r.createdAt) }}</td>
            <td class="op">
              <template v-if="r.status === 'pending'">
                <button class="link-btn ok" @click="approve(r)">通过</button>
                <button class="link-btn danger" @click="reject(r)">拒绝</button>
              </template>
              <span v-else class="muted">已处理</span>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td colspan="7" class="empty">暂无申请</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { storageRequestApi } from '../../api/http.js'
import AdminLayout from '../components/AdminLayout.vue'

const tabs = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已通过' },
  { value: 'rejected', label: '已拒绝' },
  { value: 'all', label: '全部' },
]
const filter = ref('pending')
const list = ref([])
const loading = ref(false)

function fmt(bytes) {
  bytes = Number(bytes) || 0
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB'
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}
function statusText(s) {
  return { pending: '待审核', approved: '已通过', rejected: '已拒绝' }[s] || s
}
function fmtDate(s) {
  if (!s) return '—'
  return String(s).slice(0, 19).replace('T', ' ')
}

async function load() {
  loading.value = true
  try {
    const params = filter.value === 'all' ? {} : { status: filter.value }
    const res = await storageRequestApi.list(params)
    list.value = res.data.list || []
  } catch (e) {
    /* 错误提示由拦截器统一处理 */
  } finally {
    loading.value = false
  }
}
function changeTab(v) {
  filter.value = v
  load()
}

async function approve(r) {
  if (!confirm(`确定通过该用户的扩容申请吗？\n@${r.username} 将增加 ${r.requestedGb}GB 存储空间。`)) return
  try {
    await storageRequestApi.approve(r.id)
    alert('已通过，空间已增加')
    load()
  } catch (e) {
    alert(e.message || '操作失败')
  }
}
async function reject(r) {
  const note = prompt('拒绝理由（可选）：', '')
  if (note === null) return // 取消
  try {
    await storageRequestApi.reject(r.id, note)
    alert('已拒绝')
    load()
  } catch (e) {
    alert(e.message || '操作失败')
  }
}

onMounted(load)
</script>

<style scoped>
.toolbar {
  margin-bottom: 16px;
}
.tabs {
  display: inline-flex;
  background: #eef1f4;
  border-radius: 10px;
  padding: 4px;
  gap: 4px;
}
.tab {
  border: none;
  background: transparent;
  padding: 7px 16px;
  border-radius: 7px;
  font-size: 14px;
  color: #4a505c;
  cursor: pointer;
}
.tab.active {
  background: #fff;
  color: #4e4376;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.table-wrap {
  background: #fff;
  border: 1px solid #eceef1;
  border-radius: 12px;
  overflow: hidden;
}
.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.tbl th,
.tbl td {
  padding: 13px 14px;
  text-align: left;
  border-bottom: 1px solid #f0f2f5;
  white-space: nowrap;
}
.tbl th {
  background: #fafbfc;
  color: #6b7280;
  font-weight: 600;
  font-size: 13px;
}
.tbl tbody tr:hover {
  background: #fafbff;
}
.tbl .op {
  text-align: right;
}
.u-name {
  font-weight: 600;
  color: #1f2329;
}
.u-sub {
  font-size: 12px;
  color: #9aa0aa;
}
.gb {
  font-weight: 700;
  color: #2b5876;
}
.reason {
  max-width: 220px;
  white-space: normal;
  color: #4a505c;
}
.muted {
  color: #9aa0aa;
}
.empty {
  text-align: center;
  color: #9aa0aa;
  padding: 40px 0;
}
.note {
  font-size: 12px;
  color: #9aa0aa;
  margin-top: 4px;
}

.badge {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
}
.badge-pending {
  background: #fff3e0;
  color: #ff9f0a;
}
.badge-approved {
  background: #e6f7ec;
  color: #00a870;
}
.badge-rejected {
  background: #f1f2f4;
  color: #9aa0aa;
}

.link-btn {
  background: none;
  border: none;
  font-size: 13px;
  cursor: pointer;
  padding: 0 6px;
}
.link-btn.ok {
  color: #00a870;
}
.link-btn.danger {
  color: #e54545;
}
.link-btn:disabled {
  color: #b9bfc8;
  cursor: default;
}
</style>
