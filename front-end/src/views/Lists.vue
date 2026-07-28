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
        <t-cell title="目的地" :note="form.cities.length ? form.cities.join('、') : '请选择'" arrow @click="showCityPicker = true" />
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

    <!-- 目的地城市选择（多选） -->
    <t-popup v-model="showCityPicker" placement="bottom">
      <div class="city-sheet">
        <div class="sheet-bar">
          <span class="sheet-title">选择目的地（可多选）</span>
          <t-button size="small" theme="primary" @click="showCityPicker = false">确定</t-button>
        </div>
        <div class="city-body">
          <div v-for="region in REGIONS" :key="region" class="region-block">
            <div class="region-label">{{ region }}</div>
            <div class="city-chips">
              <span
                v-for="c in cityByRegion(region)"
                :key="c.name"
                class="chip"
                :class="{ active: form.cities.includes(c.name) }"
                @click="toggleCity(c.name)"
              >{{ c.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </t-popup>

    <app-tab-bar active="lists" />
  </div>
</template>

<script setup name="Lists">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Toast } from 'tdesign-mobile-vue'
import { useTravelStore } from '../stores/travel'
import { CITIES, REGIONS } from '../data/cities'
import AppTabBar from '../components/AppTabBar.vue'

const store = useTravelStore()
const router = useRouter()

const filter = ref('all')
const filtered = computed(() =>
  filter.value === 'all' ? store.travels : store.travels.filter((t) => t.status === filter.value)
)

const showCreate = ref(false)
const form = reactive({ title: '', cities: [], startDate: '', endDate: '', budgetTotal: '' })
const showCityPicker = ref(false)
function toggleCity(name) {
  const i = form.cities.indexOf(name)
  if (i > -1) form.cities.splice(i, 1)
  else form.cities.push(name)
}
const cityByRegion = (region) => CITIES.filter((c) => c.region === region)

const showDate = ref(false)
const dateVal = ref('')
const dateField = ref('start')
function openDate(field) {
  dateField.value = field
  dateVal.value = field === 'start' ? form.startDate : form.endDate
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
      cities: [...form.cities],
      startDate: form.startDate,
      endDate: form.endDate,
      budgetTotal: Number(form.budgetTotal) || 0,
    })
    showCreate.value = false
    Object.assign(form, { title: '', cities: [], startDate: '', endDate: '', budgetTotal: '' })
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
.city-sheet {
  padding: 12px 16px calc(env(safe-area-inset-bottom) + 16px);
  border-radius: 16px 16px 0 0;
  max-height: 72vh;
  display: flex;
  flex-direction: column;
  background: #fff;
}
.sheet-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.sheet-bar .sheet-title {
  font-size: 17px;
  font-weight: 700;
}
.city-body {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}
.region-block {
  margin-bottom: 14px;
}
.region-label {
  font-size: 12px;
  color: var(--text-2);
  margin-bottom: 8px;
}
.city-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  padding: 6px 14px;
  border-radius: 999px;
  background: #f2f3f5;
  color: var(--text-1);
  font-size: 13px;
  border: 1px solid transparent;
  transition: all 0.18s ease;
}
.chip.active {
  background: var(--brand-light, #fff1e8);
  color: var(--brand);
  border-color: var(--brand);
  font-weight: 600;
}
</style>
