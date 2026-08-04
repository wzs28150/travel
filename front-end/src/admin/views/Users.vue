<template>
  <AdminLayout title="用户管理" active="users">
    <div class="toolbar">
          <input
            v-model="keyword"
            class="search"
            placeholder="搜索账号 / 昵称"
            @keyup.enter="onSearch"
          />
          <button class="btn ghost" @click="onSearch">搜索</button>
          <button class="btn primary" @click="openCreate">+ 新增用户</button>
        </div>

        <div class="table-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>账号</th>
                <th>昵称</th>
                <th>城市</th>
                <th>角色</th>
                <th>空间使用</th>
                <th>旅行数</th>
                <th>注册时间</th>
                <th class="op">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in users" :key="u.id">
                <td>{{ u.id }}</td>
                <td>{{ u.username }}</td>
                <td>{{ u.nickname || '—' }}</td>
                <td>{{ u.city || '—' }}</td>
                <td>
                  <span :class="['tag', u.is_admin ? 'tag-admin' : 'tag-user']">
                    {{ u.is_admin ? '管理员' : '普通用户' }}
                  </span>
                </td>
                <td class="space-cell">
                  <div class="bar">
                    <div
                      class="bar-in"
                      :class="barClass(u)"
                      :style="{ width: barPercent(u) + '%' }"
                    ></div>
                  </div>
                  <div class="space-txt">{{ fmt(u.storage_used) }} / {{ fmt(u.storage_limit) }}</div>
                </td>
                <td>{{ u.travel_count }}</td>
                <td class="muted">{{ fmtDate(u.created_at) }}</td>
                <td class="op">
                  <button class="link-btn" @click="openEdit(u)">编辑</button>
                  <button
                    class="link-btn danger"
                    :disabled="u.is_admin"
                    :title="u.is_admin ? '管理员账号不可删除' : ''"
                    @click="remove(u)"
                  >删除</button>
                </td>
              </tr>
              <tr v-if="!users.length">
                <td colspan="9" class="empty">暂无用户</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pager">
          <button class="btn ghost" :disabled="page <= 1" @click="changePage(-1)">上一页</button>
          <span class="pager-info">第 {{ page }} / {{ totalPages }} 页 · 共 {{ total }} 条</span>
          <button class="btn ghost" :disabled="page >= totalPages" @click="changePage(1)">下一页</button>
        </div>
    <!-- 新增/编辑弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="closeModal">
      <div class="modal">
        <h3>{{ editing ? '编辑用户' : '新增用户' }}</h3>
        <label>账号</label>
        <input v-model="form.username" :disabled="editing" placeholder="登录账号" />

        <label>密码{{ editing ? '（留空则不修改）' : '' }}</label>
        <input
          v-model="form.password"
          type="password"
          :placeholder="editing ? '不修改请留空' : '至少 6 位'"
        />

        <label>昵称</label>
        <input v-model="form.nickname" placeholder="昵称" />

        <label>城市</label>
        <input v-model="form.city" placeholder="所在城市" />

        <label>空间上限（GB）</label>
        <input v-model.number="form.storageLimitGB" type="number" min="0" step="0.5" />

        <label class="check">
          <input type="checkbox" v-model="form.is_admin" />
          <span>设为管理员（可进入管理后台）</span>
        </label>

        <p v-if="modalError" class="err">{{ modalError }}</p>

        <div class="modal-foot">
          <button class="btn ghost" @click="closeModal">取消</button>
          <button class="btn primary" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </AdminLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { adminApi, clearAdminToken } from '../../api/http.js'
import AdminLayout from '../components/AdminLayout.vue'

const users = ref([])
const router = useRouter()
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const keyword = ref('')
const loading = ref(false)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

const showModal = ref(false)
const editing = ref(null)
const saving = ref(false)
const modalError = ref('')
const form = ref({
  username: '',
  password: '',
  nickname: '',
  city: '',
  storageLimitGB: 2,
  is_admin: false,
})

function fmt(bytes) {
  bytes = Number(bytes) || 0
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + ' GB'
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}
function barPercent(u) {
  const limit = Number(u.storage_limit) || 0
  if (!limit) return 0
  return Math.min(100, Math.round((Number(u.storage_used) / limit) * 100))
}
function barClass(u) {
  const p = barPercent(u)
  if (p >= 90) return 'bar-red'
  if (p >= 70) return 'bar-orange'
  return 'bar-green'
}
function fmtDate(s) {
  if (!s) return '—'
  return String(s).slice(0, 10)
}

async function load() {
  loading.value = true
  try {
    const res = await adminApi.list({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
    })
    users.value = res.data.list || []
    total.value = res.data.total || 0
  } catch (e) {
    if (e.message && /登录|重新登录/.test(e.message)) {
      clearAdminToken()
      router.replace('/login')
    }
  } finally {
    loading.value = false
  }
}

function onSearch() {
  page.value = 1
  load()
}
function changePage(delta) {
  const next = page.value + delta
  if (next < 1 || next > totalPages.value) return
  page.value = next
  load()
}

function openCreate() {
  editing.value = null
  form.value = {
    username: '',
    password: '',
    nickname: '',
    city: '',
    storageLimitGB: 2,
    is_admin: false,
  }
  modalError.value = ''
  showModal.value = true
}
function openEdit(u) {
  editing.value = u
  form.value = {
    username: u.username,
    password: '',
    nickname: u.nickname || '',
    city: u.city || '',
    storageLimitGB: Math.round((Number(u.storage_limit) / 1024 ** 3) * 100) / 100 || 2,
    is_admin: !!u.is_admin,
  }
  modalError.value = ''
  showModal.value = true
}
function closeModal() {
  showModal.value = false
  editing.value = null
}

async function save() {
  modalError.value = ''
  if (!form.value.username) {
    modalError.value = '请输入账号'
    return
  }
  if (!editing.value && (!form.value.password || form.value.password.length < 6)) {
    modalError.value = '新增用户时密码至少 6 位'
    return
  }
  saving.value = true
  try {
    const payload = {
      username: form.value.username,
      nickname: form.value.nickname,
      city: form.value.city,
      storageLimitGB: form.value.storageLimitGB,
      is_admin: form.value.is_admin ? 1 : 0,
    }
    if (form.value.password) payload.password = form.value.password
    if (editing.value) {
      await adminApi.update(editing.value.id, payload)
    } else {
      await adminApi.create(payload)
    }
    closeModal()
    load()
  } catch (e) {
    modalError.value = e.message || '保存失败'
  } finally {
    saving.value = false
  }
}

async function remove(u) {
  if (!confirm(`确定删除用户「${u.username}」吗？\n该用户的所有旅行数据将被一并删除，且不可恢复。`)) {
    return
  }
  try {
    await adminApi.remove(u.id)
    load()
  } catch (e) {
    alert(e.message || '删除失败')
  }
}

onMounted(load)
</script>

<style scoped>
/* 工具栏 */
.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
}
.search {
  width: 280px;
  height: 38px;
  border: 1px solid #dfe3e8;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}
.search:focus {
  border-color: #4e4376;
}

/* 按钮 */
.btn {
  height: 38px;
  padding: 0 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 14px;
  cursor: pointer;
}
.btn.primary {
  background: linear-gradient(135deg, #2b5876, #4e4376);
  color: #fff;
}
.btn.primary:hover {
  opacity: 0.92;
}
.btn.ghost {
  background: #fff;
  border-color: #dfe3e8;
  color: #4a505c;
}
.btn.ghost:hover {
  border-color: #b9bfc8;
}
.btn:disabled {
  opacity: 0.55;
  cursor: default;
}
.link-btn {
  background: none;
  border: none;
  color: #4e4376;
  font-size: 13px;
  cursor: pointer;
  padding: 0 6px;
}
.link-btn.danger {
  color: #e54545;
}
.link-btn:disabled {
  color: #b9bfc8;
  cursor: default;
}

/* 表格 */
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
.muted {
  color: #9aa0aa;
}
.empty {
  text-align: center;
  color: #9aa0aa;
  padding: 40px 0;
}

.tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 12px;
}
.tag-admin {
  background: #f0e9ff;
  color: #7c5cff;
}
.tag-user {
  background: #eef1f4;
  color: #6b7280;
}

/* 空间进度 */
.space-cell {
  min-width: 180px;
}
.bar {
  width: 160px;
  height: 8px;
  background: #eef1f4;
  border-radius: 6px;
  overflow: hidden;
}
.bar-in {
  height: 100%;
  border-radius: 6px;
}
.bar-green {
  background: #34c759;
}
.bar-orange {
  background: #ff9f0a;
}
.bar-red {
  background: #ff3b30;
}
.space-txt {
  font-size: 12px;
  color: #9aa0aa;
  margin-top: 5px;
}

/* 分页 */
.pager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 16px;
}
.pager-info {
  font-size: 13px;
  color: #6b7280;
}

/* 弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 35, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.modal {
  width: 420px;
  background: #fff;
  border-radius: 14px;
  padding: 24px 26px;
}
.modal h3 {
  margin: 0 0 16px;
  font-size: 17px;
}
.modal label {
  display: block;
  font-size: 13px;
  color: #4a505c;
  margin: 12px 0 6px;
}
.modal input[type='text'],
.modal input[type='password'],
.modal input[type='number'] {
  width: 100%;
  height: 40px;
  border: 1px solid #dfe3e8;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
  outline: none;
}
.modal input:focus {
  border-color: #4e4376;
}
.modal input:disabled {
  background: #f5f6f8;
  color: #9aa0aa;
}
.modal label.check {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}
.modal label.check input {
  width: auto;
}
.modal label.check span {
  font-size: 13px;
}
.err {
  color: #e54545;
  font-size: 13px;
  margin: 12px 0 0;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 22px;
}
</style>
