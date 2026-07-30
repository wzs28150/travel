<template>
  <div class="page" name="Lists">
    <div class="app-header">
      <div class="title">我的清单 🧳</div>
      <div class="subtitle">每一次出发，都值得被认真规划</div>
      <div class="stat-row">
        <div class="stat">
          <div class="num">{{ store.travels.length }}</div>
          <div class="lbl">旅行</div>
        </div>
        <div class="stat">
          <div class="num">{{ store.doneTravels.length }}</div>
          <div class="lbl">已完成</div>
        </div>
        <div class="stat">
          <div class="num">{{ store.visitedCities.size }}</div>
          <div class="lbl">到访城市</div>
        </div>
      </div>
    </div>

    <div class="page-scroll">
      <t-tabs v-model="filter" class="filter-tabs">
        <t-tab-panel value="all" label="全部" />
        <t-tab-panel value="planning" label="计划中" />
        <t-tab-panel value="ongoing" label="进行中" />
        <t-tab-panel value="done" label="已完成" />
      </t-tabs>

      <div v-if="allTags.length" class="tag-filter">
        <span class="tf-chip" :class="{ active: tagFilter === '' }" @click="tagFilter = ''">全部标签</span>
        <span
          v-for="tg in allTags"
          :key="tg"
          class="tf-chip"
          :class="{ active: tagFilter === tg }"
          @click="tagFilter = tagFilter === tg ? '' : tg"
        >{{ tg }}</span>
      </div>

      <div v-if="filtered.length === 0" class="empty">
        <t-icon name="add-rectangle" size="48px" style="color:#ddd" />
        <p>还没有旅行计划，点击右下角 + 创建吧</p>
      </div>

      <div v-for="t in filtered" :key="t.id" class="travel-card" @click="openTravel(t.id)">
        <div class="cover" :style="coverStyle(t)">
          <t-tag :theme="statusTheme(t.status)" variant="light" size="small" class="status-tag">
            {{ statusText(t.status) }}
          </t-tag>
        </div>
        <div class="info">
          <div class="t-title text-ellipsis">{{ t.title }}</div>
          <div class="meta">
            <t-icon name="location" size="14px" /> {{ t.destination || '未设置目的地' }}
          </div>
          <div class="meta">
            <t-icon name="calendar" size="14px" /> {{ t.startDate || '待定' }} ~ {{ t.endDate || '待定' }}
          </div>
          <div class="modules">
            <span><t-icon name="map" /> {{ t.itinerary?.length || 0 }} 行程</span>
            <span><t-icon name="gift" /> {{ packedCount(t) }} 行李</span>
            <span><t-icon name="task" /> {{ todoCount(t) }} 待办</span>
          </div>
        </div>
      </div>
    </div>

    <button class="fab" @click="showCreate = true">+</button>

    <!-- 创建旅行 -->
    <t-popup v-model="showCreate" placement="bottom">
      <div class="sheet">
        <div class="sheet-title">新建旅行</div>
        <t-input v-model="form.title" label="标题" placeholder="给这次旅行起个名字" />
        <t-cell title="目的地" :note="form.regionText || '请选择省/市/区'" arrow @click="showRegion = true" />
        <t-cell title="开始日期" :note="form.startDate || '请选择'" arrow @click="openDate('start')" />
        <t-cell title="结束日期" :note="form.endDate || '请选择'" arrow @click="openDate('end')" />
        <t-input v-model="form.budgetTotal" label="预算(元)" type="number" placeholder="选填" />
        <div class="sheet-actions">
          <t-button theme="light" block @click="showCreate = false">取消</t-button>
          <t-button theme="primary" block @click="createTravel">创建</t-button>
        </div>
      </div>
    </t-popup>

    <t-popup v-model="showDate" placement="bottom">
      <t-date-time-picker
        v-if="showDate"
        :value="dateVal"
        mode="date"
        format="YYYY-MM-DD"
        :title="dateField === 'start' ? '选择开始日期' : '选择结束日期'"
        confirm-btn="确定"
        cancel-btn="取消"
        @confirm="confirmDate"
        @cancel="showDate = false"
      />
    </t-popup>

    <!-- 目的地：全国省市区三级联动选择 -->
    <t-cascader
      v-model="form.regionCode"
      v-model:visible="showRegion"
      :options="regionOptions"
      :keys="{ label: 'name', value: 'code', children: 'children' }"
      title="选择目的地"
      :check-strictly="true"
      @change="onRegionChange"
    />

    <app-tab-bar active="lists" />
  </div>
</template>

<script setup name="Lists">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useTravelStore } from '../stores/travel'
import regionOptions from '../data/china-pca.json'
import AppTabBar from '../components/AppTabBar.vue'

const store = useTravelStore()
const router = useRouter()

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const filter = ref('all')
const tagFilter = ref('')
// 全部旅行照片中出现过的标签（去重）
const allTags = computed(() => {
  const set = new Set()
  store.travels.forEach((t) => (t.photos || []).forEach((p) => p.tag && set.add(p.tag)))
  return [...set]
})
const filtered = computed(() => {
  let list = store.travels
  if (filter.value !== 'all') list = list.filter((t) => t.status === filter.value)
  if (tagFilter.value) list = list.filter((t) => (t.photos || []).some((p) => p.tag === tagFilter.value))
  return list
})

const showCreate = ref(false)
const form = reactive({ title: '', regionCode: '', regionText: '', cityName: '', startDate: todayStr(), endDate: todayStr(), budgetTotal: '' })
const showRegion = ref(false)
// t-cascader 是单选值(value=叶子code)，整条路径通过 @change(value, selectedOptions) 拿到
function onRegionChange(value, selectedOptions) {
  form.regionCode = value
  const opts = selectedOptions || []
  form.regionText = opts.map((o) => o.name).join(' / ')
  let cityName = opts[0]?.name
  if (opts[1] && opts[1].name !== '市辖区' && opts[1].name !== '县') cityName = opts[1].name
  form.cityName = cityName
}

const showDate = ref(false)
const dateVal = ref('')
const dateField = ref('start')
function openDate(field) {
  dateField.value = field
  dateVal.value = form[field] || todayStr()
  showDate.value = true
}
function confirmDate(v) {
  const val = typeof v === 'object' && v?.value ? v.value : v
  if (dateField.value === 'start') form.startDate = val
  else form.endDate = val
  showDate.value = false
}

async function createTravel() {
  if (!form.title.trim()) {
    Toast({ message: '请输入标题', theme: 'warning' })
    return
  }
  try {
    const id = await store.addTravel({
      title: form.title.trim(),
      region: form.regionCode ? [form.regionCode] : [],
      destination: form.regionText,
      cityName: form.cityName,
      startDate: form.startDate,
      endDate: form.endDate,
      budgetTotal: Number(form.budgetTotal) || 0,
    })
    showCreate.value = false
    Object.assign(form, { title: '', regionCode: '', regionText: '', cityName: '', startDate: '', endDate: '', budgetTotal: '' })
    router.push(`/travel/${id}`)
  } catch (e) {
    Toast({ message: e.message || '创建失败', theme: 'error' })
  }
}

function openTravel(id) {
  router.push(`/travel/${id}`)
}

function coverStyle(t) {
  if (t.cover) return { backgroundImage: `url(${t.cover})` }
  const colors = ['#ffd8a8', '#a5d8ff', '#b2f2bb', '#ffc9c9', '#d0bfff']
  const c = colors[t.title.length % colors.length]
  return { background: `linear-gradient(135deg, ${c}, #fff)` }
}
const statusText = (s) => ({ planning: '计划中', ongoing: '进行中', done: '已完成' }[s] || s)
const statusTheme = (s) => ({ planning: 'primary', ongoing: 'warning', done: 'success' }[s] || 'default')
const packedCount = (t) => `${t.luggage?.filter((x) => x.packed).length || 0}/${t.luggage?.length || 0}`
const todoCount = (t) => `${t.todos?.filter((x) => x.done).length || 0}/${t.todos?.length || 0}`
</script>

<style scoped>
.stat-row {
  display: flex;
  margin-top: 16px;
  gap: 8px;
}
.stat {
  flex: 1;
  text-align: center;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 8px 0;
}
.stat .num {
  font-size: 20px;
  font-weight: 700;
}
.stat .lbl {
  font-size: 11px;
  opacity: 0.9;
}
.filter-tabs {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}
.tag-filter {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
  -webkit-overflow-scrolling: touch;
}
.tf-chip {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--text-2);
  background: #fff;
  border: 1px solid #e6e6e6;
  border-radius: 999px;
  padding: 5px 12px;
  white-space: nowrap;
}
.tf-chip.active {
  color: #fff;
  background: var(--brand);
  border-color: var(--brand);
}
.travel-card {
  background: #fff;
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.06);
}
.cover {
  height: 130px;
  background-size: cover;
  background-position: center;
  position: relative;
}
.status-tag {
  position: absolute;
  top: 10px;
  right: 10px;
}
.info {
  padding: 12px 14px 14px;
}
.t-title {
  font-size: 17px;
  font-weight: 700;
  margin-bottom: 6px;
}
.meta {
  color: var(--text-2);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 3px;
}
.modules {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  color: var(--brand);
  font-size: 12px;
}
.modules span {
  display: flex;
  align-items: center;
  gap: 3px;
}
.sheet {
  padding: 16px 16px calc(env(safe-area-inset-bottom) + 16px);
  border-radius: 16px 16px 0 0;
}
.sheet-title {
  font-size: 17px;
  font-weight: 700;
  text-align: center;
  margin-bottom: 12px;
}
.sheet-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}
</style>
