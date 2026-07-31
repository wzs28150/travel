<template>
  <div class="page detail-page">
    <t-navbar :title="travel?.title || '旅行详情'" left-arrow @left-click="goBack">
      <template #right>
        <t-icon name="ellipsis" size="22px" @click="showMenu = true" />
      </template>
    </t-navbar>

    <div v-if="!travel" class="empty">旅行不存在</div>

    <template v-else>
      <!-- 头图 -->
      <div class="hero" :style="heroStyle">
        <div class="hero-mask">
          <div class="hero-title">{{ travel.title }}</div>
          <div class="hero-meta">
            <t-icon name="location" size="14px" /> {{ travel.destination || '未设置' }}
            <span style="margin-left:10px"><t-icon name="calendar" size="14px" /> {{ travel.startDate || '待定' }} ~ {{ travel.endDate || '待定' }}</span>
          </div>
          <t-tag :theme="statusTheme" variant="light" size="small" class="hero-status" @click="cycleStatus">
            {{ statusText }} <t-icon name="swap" size="12px" />
          </t-tag>
        </div>
      </div>

      <!-- 出行天气 -->
      <div class="weather-panel">
        <div class="weather-head">
          <span class="wh-title"><t-icon name="cloud" size="16px" /> 出行天气</span>
          <span class="wh-city">
            {{ weatherCity || travel.destination || '未设置目的地' }}
            <t-tag v-if="weather.length" size="small" variant="light" :theme="weatherSource === 'live' ? 'success' : 'default'">
              {{ weatherSource === 'live' ? '实时预报' : '参考' }}
            </t-tag>
          </span>
        </div>
        <div v-if="weatherLoading" class="weather-loading">天气加载中…</div>
        <div v-else-if="!weather.length" class="weather-empty">设置开始/结束日期后查看天气</div>
        <div v-else class="weather-scroll">
          <div v-for="w in weather" :key="w.date" class="weather-day">
            <div class="wd-date">{{ formatDay(w.date).md }}</div>
            <div class="wd-week">{{ formatDay(w.date).week }}</div>
            <div class="wd-icon">{{ codeToWeather(w.code).icon }}</div>
            <div class="wd-text">{{ codeToWeather(w.code).text }}</div>
            <div class="wd-temp">{{ w.low }}° ~ {{ w.high }}°</div>
          </div>
        </div>
      </div>

      <t-tabs v-model="tab" sticky class="detail-tabs">
        <t-tab-panel value="itinerary" label="行程" />
        <t-tab-panel value="luggage" label="行李" />
        <t-tab-panel value="todos" label="待办" />
        <t-tab-panel value="budgets" label="预算" />
        <t-tab-panel value="photos" label="相册" />
      </t-tabs>

      <div class="tab-body">
        <!-- 行程 -->
        <div v-show="tab === 'itinerary'">
          <div v-if="!travel.itinerary.length" class="empty">还没有行程安排</div>
          <div v-for="(it, i) in flatItinerary" :key="it.id" class="it-wrap">
            <div v-if="i === 0 || dayOf(it) !== dayOf(flatItinerary[i - 1])" class="day-head">
              第 {{ dayOf(it) }} 天<span v-if="dayDate(it)" class="day-date"> · {{ dayDate(it) }}</span>
            </div>
            <div v-if="i > 0 && it.transport && it.transport.mode" class="tl-connector">
              <span class="tp-emoji">{{ tpEmoji(it.transport.mode) }}</span>
              <span class="tp-mode">{{ it.transport.mode }}</span>
              <span v-if="it.transport.route" class="tp-route">· {{ it.transport.route }}</span>
            </div>
            <div class="tl-item">
              <div class="tl-dot" :class="{ done: it.done }"></div>
              <div class="tl-content" @click="toggleItinerary(it)">
                <div class="flex-between">
                  <span class="tl-time">{{ displayTime(it) }}</span>
                  <t-icon name="delete" size="16px" color="#ccc" @click="onIconClick($event, () => del('itinerary', it.id))" />
                </div>
                <div class="tl-title" :class="{ done: it.done }">{{ it.title }}</div>
                <div v-if="it.note" class="tl-note">{{ it.note }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 行李 -->
        <div v-show="tab === 'luggage'">
          <div class="progress-card">
            <div class="flex-between">
              <span>打包进度</span>
              <span class="strong">{{ packedCount }}/{{ travel.luggage.length }}</span>
            </div>
            <t-progress :percentage="packedPercent" :color="'#ff7a45'" style="margin-top:8px" />
          </div>
          <div v-if="!travel.luggage.length" class="empty">还没有行李清单</div>
          <t-cell-group v-else>
            <t-cell v-for="it in travel.luggage" :key="it.id" @click="toggleLuggage(it)">
              <template #leftIcon>
                <t-checkbox :checked="it.packed" />
              </template>
              <template #title>
                <span :class="{ done: it.packed }">{{ it.name }}</span>
                <t-tag size="small" variant="light" style="margin-left:6px">{{ it.category }}</t-tag>
              </template>
              <template #rightIcon>
                <t-icon name="delete" color="#ccc" @click="onIconClick($event, () => del('luggage', it.id))" />
              </template>
            </t-cell>
          </t-cell-group>
        </div>

        <!-- 待办 -->
        <div v-show="tab === 'todos'">
          <div v-if="!travel.todos.length" class="empty">还没有待办事项</div>
          <t-cell-group v-else>
            <t-cell v-for="it in travel.todos" :key="it.id" @click="toggleTodo(it)">
              <template #leftIcon><t-checkbox :checked="it.done" /></template>
              <template #title><span :class="{ done: it.done }">{{ it.text }}</span></template>
              <template #rightIcon>
                <t-icon name="delete" color="#ccc" @click="onIconClick($event, () => del('todos', it.id))" />
              </template>
            </t-cell>
          </t-cell-group>
        </div>

        <!-- 预算 -->
        <div v-show="tab === 'budgets'">
          <div class="budget-summary">
            <div class="bs-item">
              <div class="bs-num">¥{{ totalSpent }}</div>
              <div class="bs-lbl">已花费</div>
            </div>
            <div class="bs-item">
              <div class="bs-num" style="color:#52c41a">¥{{ travel.budgetTotal || 0 }}</div>
              <div class="bs-lbl">总预算</div>
            </div>
            <div class="bs-item">
              <div class="bs-num" :style="{ color: remain < 0 ? '#ff4d4f' : '#ff7a45' }">¥{{ remain }}</div>
              <div class="bs-lbl">剩余</div>
            </div>
          </div>
          <t-progress
            :percentage="budgetPercent"
            :color="budgetPercent > 100 ? '#ff4d4f' : '#ff7a45'"
            style="margin:10px 4px 16px"
          />
          <div v-if="!travel.budgets.length" class="empty">还没有记账</div>
          <t-cell-group v-else>
            <t-cell v-for="it in travel.budgets" :key="it.id" :title="it.title" :description="it.category">
              <template #note>
                <span class="amount">-¥{{ it.amount }}</span>
              </template>
              <template #rightIcon>
                <t-icon name="delete" color="#ccc" @click="onIconClick($event, () => del('budgets', it.id))" />
              </template>
            </t-cell>
          </t-cell-group>
        </div>

        <!-- 相册 -->
        <div v-show="tab === 'photos'">
          <div class="album-grid">
            <div class="album-add" @click="openUpload">
              <t-icon name="camera" size="26px" color="#ff7a45" />
              <span>添加</span>
            </div>
            <div v-for="(p, i) in travel.photos" :key="i" class="album-item" @click="previewPhoto(i)">
              <img :src="p.thumb || p.url || p" loading="lazy" />
              <div class="album-edit" @click.stop="openPhotoSetting(i)"><t-icon name="edit" size="15px" /></div>
              <div class="album-del" @click.stop="delPhoto(i)"><t-icon name="close-circle-filled" size="17px" /></div>
              <span v-if="p.tag || p.place" class="album-tag">{{ [p.place, p.tag].filter(Boolean).join(' · ') }}</span>
            </div>
          </div>
          <div v-if="!travel.photos.length" class="album-tip">记录旅途中的美好瞬间 📷</div>
        </div>
      </div>

      <button class="fab" @click="openAdd">+</button>
    </template>

    <!-- 添加子项弹窗 -->
    <t-popup v-model="showAdd" placement="bottom">
      <div class="sheet">
        <div class="sheet-title">{{ addTitle }}</div>

        <template v-if="tab === 'itinerary'">
          <t-input v-model="af.title" label="活动" placeholder="如：游览外滩" />
          <t-cell title="时间" :note="af.time || '请选择日期时间'" arrow @click="openTime" />
          <t-input v-model="af.note" label="备注" placeholder="选填" />
          <t-cell title="交通方式" :note="af.transportMode || '选填（到达此地的方式）'" arrow @click="openTransport" />
          <t-input v-if="isPublicTransit" v-model="af.transportRoute" label="线路提示" placeholder="如：地铁2号线 → 1号线，人民广场站换乘" />
        </template>

        <template v-else-if="tab === 'luggage'">
          <t-input v-model="af.name" label="物品" placeholder="如：牙刷" />
          <t-input v-model="af.category" label="分类" placeholder="如：洗漱、衣物" />
        </template>

        <template v-else-if="tab === 'todos'">
          <t-input v-model="af.text" label="待办" placeholder="如：办理签证" />
        </template>

        <template v-else-if="tab === 'budgets'">
          <t-input v-model="af.title" label="项目" placeholder="如：门票" />
          <t-input v-model="af.category" label="分类" placeholder="如：交通、餐饮" />
          <t-input v-model.number="af.amount" label="金额(元)" type="number" placeholder="0" />
        </template>

        <div class="sheet-actions">
          <t-button theme="light" block @click="showAdd = false">取消</t-button>
          <t-button theme="primary" block @click="submitAdd">添加</t-button>
        </div>
      </div>
    </t-popup>

    <!-- 行程时间选择 -->
    <t-popup v-model="showTime" placement="bottom">
      <t-date-time-picker
        v-if="showTime"
        :value="timeVal"
        mode="minute"
        format="YYYY-MM-DD HH:mm"
        title="选择时间"
        confirm-btn="确定"
        cancel-btn="取消"
        @confirm="confirmTime"
        @cancel="showTime = false"
      />
    </t-popup>

    <!-- 交通方式选择 -->
    <t-popup v-model="showTransport" placement="bottom">
      <t-picker
        v-if="showTransport"
        :value="transportVal"
        :columns="transportColumns"
        title="交通方式"
        confirm-btn="确定"
        cancel-btn="取消"
        @confirm="confirmTransport"
        @cancel="showTransport = false"
      />
    </t-popup>

    <t-action-sheet
      v-model="showMenu"
      :items="[{ label: '编辑总预算' }, { label: '删除旅行', color: '#ff4d4f' }]"
      @selected="onMenu"
    />

    <!-- 上传照片 + 标签/拍摄地 -->
    <t-popup v-model="showUpload" placement="bottom">
      <div class="sheet">
        <div class="sheet-title">添加照片</div>
        <div class="upload-drop" @click="pickFiles">
          <t-icon name="image" size="28px" color="#ff7a45" />
          <div>点击选择照片（可多选）</div>
          <div v-if="pendingFiles.length" class="upload-count">已选 {{ pendingFiles.length }} 张</div>
          <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onSelect" />
        </div>
        <t-input v-model="uploadTag" label="标签" placeholder="选填，如：美食、夜景" />
        <div v-if="existingTags.length" class="quick-row">
          <span class="quick-lbl">已有标签</span>
          <span v-for="tg in existingTags" :key="tg" class="quick-chip" @click="uploadTag = tg">{{ tg }}</span>
        </div>
        <t-input v-model="uploadPlace" label="拍摄地" placeholder="选填，如：外滩、酒店大堂" />
        <div v-if="existingPlaces.length" class="quick-row">
          <span class="quick-lbl">已有地点</span>
          <span v-for="pl in existingPlaces" :key="pl" class="quick-chip" @click="uploadPlace = pl">{{ pl }}</span>
        </div>
        <div class="sheet-actions">
          <t-button theme="light" block @click="showUpload = false">取消</t-button>
          <t-button theme="primary" block :loading="uploading" @click="confirmUpload">上传</t-button>
        </div>
      </div>
    </t-popup>

    <!-- 照片设置：封面 / 标签 / 拍摄地 -->
    <t-popup v-model="showPhotoSetting" placement="bottom">
      <div class="sheet">
        <div class="sheet-title">照片设置</div>
        <t-button theme="light" block class="set-cover-btn" @click="setAsCover">
          <t-icon name="image" size="16px" /> 设为清单封面
        </t-button>
        <t-input v-model="editTag" label="标签" placeholder="选填，如：美食、夜景" />
        <div v-if="existingTags.length" class="quick-row">
          <span class="quick-lbl">已有标签</span>
          <span v-for="tg in existingTags" :key="tg" class="quick-chip" @click="editTag = tg">{{ tg }}</span>
        </div>
        <t-input v-model="editPlace" label="拍摄地" placeholder="选填，如：外滩、酒店大堂" />
        <div v-if="existingPlaces.length" class="quick-row">
          <span class="quick-lbl">已有地点</span>
          <span v-for="pl in existingPlaces" :key="pl" class="quick-chip" @click="editPlace = pl">{{ pl }}</span>
        </div>
        <div class="sheet-actions">
          <t-button theme="light" block @click="showPhotoSetting = false">取消</t-button>
          <t-button theme="primary" block @click="confirmPhotoSetting">保存</t-button>
        </div>
      </div>
    </t-popup>

    <t-image-viewer
      v-model:visible="showViewer"
      :images="(travel?.photos || []).map((p) => p.url || p)"
      :default-index="viewerIndex"
      :show-index="true"
      :max-zoom="3"
      :loop="true"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Toast, Dialog } from 'tdesign-mobile-vue'
import { useTravelStore } from '../stores/travel'
import { uploadFile } from '../api/http'
import { fetchTripWeather, codeToWeather, formatDay } from '../utils/weather'

const route = useRoute()
const router = useRouter()
const store = useTravelStore()

const travel = computed(() => store.getTravel(route.params.id))
const tab = ref('itinerary')

const goBack = () => router.back()

const heroStyle = computed(() => {
  const t = travel.value
  if (t?.cover) return { backgroundImage: `url(${t.cover})` }
  return { background: 'linear-gradient(135deg,#ff9a5a,#ff7a45)' }
})

// ---- 出行天气 ----
const weather = ref([])
const weatherCity = ref('')
const weatherSource = ref('none')
const weatherLoading = ref(false)
let weatherKey = ''

async function loadWeather() {
  const t = travel.value
  if (!t) return
  const key = `${t.destination}|${t.startDate}|${t.endDate}`
  if (key === weatherKey && weather.value.length) return
  weatherKey = key
  if (!t.startDate) {
    weather.value = []
    return
  }
  weatherLoading.value = true
  try {
    const { list, cityName, source } = await fetchTripWeather(t.destination, t.startDate, t.endDate)
    weather.value = list
    weatherCity.value = cityName
    weatherSource.value = source
  } finally {
    weatherLoading.value = false
  }
}

onMounted(loadWeather)
watch(
  () => [travel.value?.destination, travel.value?.startDate, travel.value?.endDate].join('|'),
  loadWeather
)

const statusText = computed(() => ({ planning: '计划中', ongoing: '进行中', done: '已完成' }[travel.value?.status]))
const statusTheme = computed(() => ({ planning: 'primary', ongoing: 'warning', done: 'success' }[travel.value?.status]))
function cycleStatus() {
  const order = ['planning', 'ongoing', 'done']
  const cur = order.indexOf(travel.value.status)
  const next = order[(cur + 1) % order.length]
  store.updateTravel(travel.value.id, { status: next })
  Toast({ message: '状态已更新为「' + statusText.value + '」' })
}

// 行程按时间排序（固定时间点）
const flatItinerary = computed(() => {
  const list = [...(travel.value?.itinerary || [])]
  list.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  return list
})
const isDateStr = (s) => typeof s === 'string' && /\d{4}-\d{2}-\d{2}/.test(s)
function sortKey(it) {
  if (isDateStr(it.time)) return it.time
  return String(it.day || 1).padStart(3, '0') + (it.time || '0000')
}
function diffDays(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.floor((db - da) / 86400000)
}
function dayOf(it) {
  if (isDateStr(it.time) && travel.value?.startDate) {
    const d = diffDays(travel.value.startDate, it.time.slice(0, 10))
    return d >= 0 ? d + 1 : 1
  }
  return it.day || 1
}
function dayDate(it) {
  if (isDateStr(it.time)) return it.time.slice(0, 10)
  return ''
}
function displayTime(it) {
  if (isDateStr(it.time)) return it.time.slice(11, 16)
  return it.time || ''
}
function toggleItinerary(it) {
  store.updateItem(travel.value.id, 'itinerary', it.id, { done: !it.done })
}

// 行李
const packedCount = computed(() => travel.value.luggage.filter((x) => x.packed).length)
const packedPercent = computed(() =>
  travel.value.luggage.length ? Math.round((packedCount.value / travel.value.luggage.length) * 100) : 0
)
function toggleLuggage(it) {
  store.updateItem(travel.value.id, 'luggage', it.id, { packed: !it.packed })
}

// 待办
function toggleTodo(it) {
  store.updateItem(travel.value.id, 'todos', it.id, { done: !it.done })
}

// 预算
const totalSpent = computed(() => travel.value.budgets.reduce((s, x) => s + Number(x.amount || 0), 0))
const remain = computed(() => (travel.value.budgetTotal || 0) - totalSpent.value)
const budgetPercent = computed(() =>
  travel.value.budgetTotal ? Math.round((totalSpent.value / travel.value.budgetTotal) * 100) : 0
)

// 相册
const uploading = ref(false)
const showUpload = ref(false)
const fileInput = ref(null)
const pendingFiles = ref([])
const uploadTag = ref('')
const uploadPlace = ref('')
const showPhotoSetting = ref(false)
const editIndex = ref(-1)
const editTag = ref('')
const editPlace = ref('')

// 当前清单已用过的标签/拍摄地（用于快速选择，避免重复输入）
const existingTags = computed(() => {
  const set = new Set()
  ;(travel.value?.photos || []).forEach((p, i) => {
    if (i !== editIndex.value && p.tag) set.add(p.tag)
  })
  return [...set]
})
const existingPlaces = computed(() => {
  const set = new Set()
  ;(travel.value?.photos || []).forEach((p, i) => {
    if (i !== editIndex.value && p.place) set.add(p.place)
  })
  return [...set]
})

function openUpload() {
  pendingFiles.value = []
  uploadTag.value = ''
  uploadPlace.value = ''
  showUpload.value = true
}
function pickFiles() {
  fileInput.value && fileInput.value.click()
}
function onSelect(e) {
  pendingFiles.value = Array.from(e.target.files || [])
  e.target.value = ''
}
async function confirmUpload() {
  if (!pendingFiles.value.length) return Toast({ message: '请先选择照片', theme: 'warning' })
  uploading.value = true
  try {
    const saved = []
    for (const f of pendingFiles.value) {
      const data = await uploadFile(f)
      saved.push({
        url: data.url,
        thumb: data.thumb,
        size: data.size,
        name: data.name,
        tag: uploadTag.value.trim(),
        place: uploadPlace.value.trim(),
      })
    }
    // 全部上传完，一次性写入并同步（避免多张图片时多次 PUT 竞态导致只剩一张）
    store.addPhotos(travel.value.id, saved)
    Toast({ message: `已添加 ${saved.length} 张`, theme: 'success' })
    showUpload.value = false
  } catch (err) {
    Toast({ message: err.message || '上传失败', theme: 'error' })
  } finally {
    uploading.value = false
    pendingFiles.value = []
  }
}
function openPhotoSetting(i) {
  editIndex.value = i
  const p = travel.value.photos[i] || {}
  editTag.value = p.tag || ''
  editPlace.value = p.place || ''
  showPhotoSetting.value = true
}
function confirmPhotoSetting() {
  if (editIndex.value >= 0) {
    store.updatePhotoMeta(travel.value.id, editIndex.value, {
      tag: editTag.value.trim(),
      place: editPlace.value.trim(),
    })
  }
  showPhotoSetting.value = false
}
function setAsCover() {
  const p = travel.value.photos[editIndex.value]
  if (p) {
    store.setCover(travel.value.id, p.thumb || p.url)
    Toast({ message: '已设为封面', theme: 'success' })
  }
  showPhotoSetting.value = false
}
const showViewer = ref(false)
const viewerIndex = ref(0)
function previewPhoto(i) {
  viewerIndex.value = i
  showViewer.value = true
}
function delPhoto(i) {
  store.removePhoto(travel.value.id, i)
}

// t-icon 的 @click 绑定到组件 onClick prop，回调首参可能不是原生事件，
// 这里统一安全 stop，避免 "e.stopPropagation is not a function"
function onIconClick(e, fn) {
  if (e && typeof e.stopPropagation === 'function') e.stopPropagation()
  fn()
}

// 通用删除
function del(key, id) {
  store.removeItem(travel.value.id, key, id)
}

// 添加弹窗
const showAdd = ref(false)
const af = reactive({})

// 行程时间 / 交通方式
const transportModes = ['步行', '打车', '滴滴', '地铁公交', '公交', '骑行', '自驾', '高铁', '飞机', '其他']
const publicTransitModes = ['地铁公交', '公交']
const transportColumns = [transportModes.map((m) => ({ label: m, value: m }))]
const transportEmoji = {
  步行: '🚶', 打车: '🚕', 滴滴: '🚗', 地铁公交: '🚇', 公交: '🚌',
  骑行: '🚲', 自驾: '🚗', 高铁: '🚄', 飞机: '✈️', 其他: '📍',
}
const tpEmoji = (m) => transportEmoji[m] || '📍'

function todayStr() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const showTime = ref(false)
const timeVal = ref('')
function openTime() {
  timeVal.value = af.time || (travel.value?.startDate || todayStr()) + ' 09:00'
  showTime.value = true
}
function isDateObj(x) {
  return x instanceof Date || (x && typeof x === 'object' && typeof x.getMonth === 'function')
}
function fmtDateTime(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
function confirmTime(v) {
  const val = v?.value ?? v
  af.time = isDateObj(val) ? fmtDateTime(val) : String(val)
  showTime.value = false
}

const showTransport = ref(false)
const transportVal = ref([])
function openTransport() {
  transportVal.value = af.transportMode ? [af.transportMode] : []
  showTransport.value = true
}
function confirmTransport(val) {
  const arr = Array.isArray(val) ? val : [val]
  const m = arr[0] || ''
  af.transportMode = m || ''
  transportVal.value = m ? [m] : []
  showTransport.value = false
}
const isPublicTransit = computed(() => publicTransitModes.includes(af.transportMode))
const addTitle = computed(
  () => ({ itinerary: '添加行程', luggage: '添加行李', todos: '添加待办', budgets: '添加记账' }[tab.value] || '添加')
)
function openAdd() {
  if (tab.value === 'photos') {
    Toast({ message: '点击相册中的「添加」上传照片' })
    return
  }
  Object.keys(af).forEach((k) => delete af[k])
  if (tab.value === 'itinerary') Object.assign(af, { time: '', transportMode: '', transportRoute: '' })
  showAdd.value = true
}
function submitAdd() {
  const id = travel.value.id
  if (tab.value === 'itinerary') {
    if (!af.title) return Toast({ message: '请输入活动', theme: 'warning' })
    store.addItem(id, 'itinerary', {
      title: af.title,
      time: af.time || '',
      note: af.note || '',
      done: false,
      transport: af.transportMode ? { mode: af.transportMode, route: af.transportRoute || '' } : null,
    })
  } else if (tab.value === 'luggage') {
    if (!af.name) return Toast({ message: '请输入物品', theme: 'warning' })
    store.addItem(id, 'luggage', { name: af.name, category: af.category || '其他', packed: false })
  } else if (tab.value === 'todos') {
    if (!af.text) return Toast({ message: '请输入待办', theme: 'warning' })
    store.addItem(id, 'todos', { text: af.text, done: false })
  } else if (tab.value === 'budgets') {
    if (!af.title) return Toast({ message: '请输入项目', theme: 'warning' })
    store.addItem(id, 'budgets', { title: af.title, category: af.category || '其他', amount: Number(af.amount) || 0, type: 'expense' })
  }
  showAdd.value = false
}

// 菜单
const showMenu = ref(false)
function onMenu(item, idx) {
  const index = typeof idx === 'number' ? idx : (item?.index ?? 0)
  if (index === 0) {
    editBudgetTotal()
  } else if (index === 1) {
    Dialog.confirm({
      title: '删除旅行',
      content: '确定删除这次旅行吗？此操作不可恢复。',
      confirmBtn: { content: '删除', theme: 'danger' },
      cancelBtn: '取消',
      onConfirm: () => {
        store.removeTravel(travel.value.id)
        router.replace('/lists')
      }
    })
  }
}
function editBudgetTotal() {
  const v = window.prompt('设置总预算（元）', String(travel.value.budgetTotal || 0))
  if (v !== null) store.updateTravel(travel.value.id, { budgetTotal: Number(v) || 0 })
}
</script>

<style scoped>
.detail-page {
  padding-bottom: 0;
}
.hero {
  height: 170px;
  background-size: cover;
  background-position: center;
  position: relative;
}
.hero-mask {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 40%, rgba(0, 0, 0, 0.55));
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 16px;
  color: #fff;
}
.hero-title {
  font-size: 22px;
  font-weight: 800;
}
.hero-meta {
  font-size: 12px;
  margin-top: 6px;
  opacity: 0.95;
}
.hero-status {
  position: absolute;
  top: 12px;
  right: 12px;
}
/* 天气 */
.weather-panel {
  background: linear-gradient(135deg, #eef4ff, #f7fbff);
  margin: 12px;
  border-radius: 14px;
  padding: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
}
.weather-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.wh-title {
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 4px;
  color: #3a5a8c;
}
.wh-city {
  font-size: 12px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 6px;
}
.weather-loading,
.weather-empty {
  text-align: center;
  color: var(--text-3);
  font-size: 13px;
  padding: 14px 0;
}
.weather-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  -webkit-overflow-scrolling: touch;
}
.weather-day {
  flex: 0 0 auto;
  width: 72px;
  background: #fff;
  border-radius: 10px;
  padding: 8px 4px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
.wd-date {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-1);
}
.wd-week {
  font-size: 11px;
  color: var(--text-3);
}
.wd-icon {
  font-size: 24px;
  margin: 4px 0;
}
.wd-text {
  font-size: 11px;
  color: var(--text-2);
}
.wd-temp {
  font-size: 11px;
  color: #ff7a45;
  font-weight: 600;
  margin-top: 2px;
}
.detail-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
}
.tab-body {
  padding: 14px;
  min-height: 50vh;
}
.done {
  text-decoration: line-through;
  color: var(--text-3);
}
/* 行程时间轴 */
.day-group {
  margin-bottom: 16px;
}
.day-head {
  font-weight: 700;
  color: var(--brand);
  margin-bottom: 8px;
}
.tl-item {
  display: flex;
  gap: 10px;
}
.tl-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #ff7a45;
  margin-top: 16px;
  position: relative;
  flex-shrink: 0;
}
.tl-dot.done {
  background: #ff7a45;
}
.tl-item:not(:last-child) .tl-dot::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 14px;
  transform: translateX(-50%);
  width: 2px;
  height: calc(100% + 12px);
  background: #ffe0d0;
}
.tl-content {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
.tl-time {
  font-size: 12px;
  color: var(--brand);
  font-weight: 600;
}
.tl-title {
  font-size: 15px;
  font-weight: 600;
  margin: 2px 0;
}
.tl-note {
  font-size: 12px;
  color: var(--text-2);
}
/* 行程之间的交通连接段 */
.it-wrap {
  margin-bottom: 2px;
}
.tl-connector {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 6px 22px;
  font-size: 12px;
  color: var(--text-2);
}
.tp-emoji {
  font-size: 15px;
  line-height: 1;
}
.tp-mode {
  font-weight: 600;
  color: var(--brand);
}
.tp-route {
  color: var(--text-2);
}
.day-date {
  color: var(--text-3);
  font-weight: 400;
  font-size: 12px;
  margin-left: 4px;
}
.progress-card,
.budget-summary {
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
}
.strong {
  font-weight: 700;
  color: var(--brand);
}
.budget-summary {
  display: flex;
}
.bs-item {
  flex: 1;
  text-align: center;
}
.bs-num {
  font-size: 18px;
  font-weight: 700;
}
.bs-lbl {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 2px;
}
.amount {
  color: #ff4d4f;
  font-weight: 600;
}
/* 相册 */
.album-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(82px, 1fr));
  gap: 7px;
}
.album-add {
  aspect-ratio: 1;
  border: 1px dashed #ffb38a;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--brand);
  font-size: 12px;
  gap: 4px;
  background: var(--brand-light);
}
.album-item {
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  position: relative;
}
.album-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: relative;
  z-index: 1;
}
.album-del {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  padding: 2px;
  cursor: pointer;
  pointer-events: auto;
}
.album-edit {
  position: absolute;
  top: 4px;
  left: 4px;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 50%;
  padding: 4px;
  cursor: pointer;
  pointer-events: auto;
}
.album-tag {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  padding: 3px 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upload-drop {
  border: 1px dashed #ffb38a;
  border-radius: 12px;
  padding: 22px 12px;
  text-align: center;
  color: var(--text-2);
  background: var(--brand-light);
  margin-bottom: 14px;
}
.upload-count {
  margin-top: 8px;
  color: var(--brand);
  font-weight: 600;
}
.album-tip {
  text-align: center;
  color: var(--text-3);
  padding: 30px;
  font-size: 13px;
}
/* 已有标签/地点 快速选择 */
.quick-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
}
.quick-lbl {
  font-size: 12px;
  color: var(--text-3);
  margin-right: 2px;
}
.quick-chip {
  font-size: 12px;
  color: var(--brand);
  background: var(--brand-light);
  border: 1px solid #ffd9c2;
  border-radius: 999px;
  padding: 3px 10px;
}
.set-cover-btn {
  margin-bottom: 14px;
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
