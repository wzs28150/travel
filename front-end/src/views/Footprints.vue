<template>
  <div class="page" name="Footprints">
    <div class="app-header">
      <div class="title">我的足迹 🐾</div>
      <div class="subtitle">已解锁 {{ visitedCount }} / {{ cities.length }} 座城市</div>
      <div class="stat-row">
        <div class="stat">
          <div class="num">{{ doneTravels.length }}</div>
          <div class="lbl">完成旅行</div>
        </div>
        <div class="stat">
          <div class="num">{{ visitedCount }}</div>
          <div class="lbl">到访城市</div>
        </div>
        <div class="stat">
          <div class="num">{{ unlockPercent }}%</div>
          <div class="lbl">解锁度</div>
        </div>
      </div>
    </div>

    <t-tabs v-model="tab" class="fp-tabs">
      <t-tab-panel value="timeline" label="时间轴" />
      <t-tab-panel value="map" label="地图" />
      <t-tab-panel value="wall" label="足迹墙" />
    </t-tabs>

    <!-- 时间轴 -->
    <div v-show="tab === 'timeline'" class="page-scroll">
      <div v-if="!doneTravels.length" class="empty">
        <t-icon name="time" size="48px" style="color:#ddd" />
        <p>完成旅行后会出现在这里</p>
      </div>
      <div v-for="t in sortedDone" :key="t.id" class="tl-row" @click="goTravel(t.id)">
        <div class="tl-left">
          <div class="tl-node"></div>
        </div>
        <div class="tl-card">
          <div class="tl-cover" :style="coverStyle(t)"></div>
          <div class="tl-body">
            <div class="tl-date">{{ t.endDate || t.startDate || '—' }}</div>
            <div class="tl-title">{{ t.title }}</div>
            <div class="tl-meta">
              <t-icon name="location" size="13px" /> {{ (t.cities || []).join('、') || t.destination }}
              <span style="margin-left:10px"><t-icon name="image" size="13px" /> {{ t.photos?.length || 0 }} 照片</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地图 -->
    <div v-show="tab === 'map'" class="map-wrap">
      <div id="fp-map" class="map-box"></div>
      <div class="map-legend">
        <span><i class="dot orange"></i> 去过的地方（{{ visitedList.length }}）</span>
      </div>
      <div v-if="mapError" class="map-fallback">
        <t-icon name="map" size="40px" />
        <p>地图组件需要配置腾讯地图 Key</p>
        <span>你走过的城市可在「足迹墙」中查看 ✨</span>
      </div>
      <div v-else-if="!mapReady" class="map-loading">地图加载中…</div>
    </div>

    <!-- 足迹墙 -->
    <div v-show="tab === 'wall'" class="page-scroll">
      <div class="wall-tip">点亮你走过的城市，灰色的是尚未解锁的目的地 ✨</div>
      <div v-for="region in regions" :key="region" class="wall-region">
        <div class="wall-region-title">{{ region }}</div>
        <div class="wall-grid">
          <div
            v-for="c in citiesByRegion(region)"
            :key="c.name"
            class="wall-city"
            :class="{ unlocked: visited.has(c.name) }"
          >
            <div class="wall-icon">{{ visited.has(c.name) ? '📍' : '🔒' }}</div>
            <div class="wall-name">{{ c.name }}</div>
          </div>
        </div>
      </div>
    </div>

    <app-tab-bar active="footprints" />
  </div>
</template>

<script setup name="Footprints">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTravelStore, CITIES } from '../stores/travel'
import { REGIONS } from '../data/cities'
import { ensureTMap } from '../utils/tmap'
import AppTabBar from '../components/AppTabBar.vue'

const store = useTravelStore()
const router = useRouter()

const tab = ref('timeline')
const cities = CITIES
const regions = REGIONS

const doneTravels = computed(() => store.doneTravels)
const sortedDone = computed(() =>
  [...doneTravels.value].sort((a, b) => String(b.endDate || b.startDate).localeCompare(String(a.endDate || a.startDate)))
)
const visited = computed(() => store.visitedCities)
const visitedCount = computed(() => visited.value.size)
const unlockPercent = computed(() => Math.round((visitedCount.value / cities.length) * 100))
const visitedList = computed(() => cities.filter((c) => visited.value.has(c.name)))

const citiesByRegion = (r) => cities.filter((c) => c.region === r)

function goTravel(id) {
  router.push(`/travel/${id}`)
}
function coverStyle(t) {
  if (t.cover) return { backgroundImage: `url(${t.cover})` }
  return { background: 'linear-gradient(135deg,#ffd8a8,#ffa94d)' }
}

// ---- 腾讯地图（按需加载，未配置 Key 时优雅降级） ----
const mapReady = ref(false)
const mapError = ref(false)
const tmapLoading = ref(false)
let mapInstance = null
let markerLayer = null

function buildMap() {
  if (mapInstance) {
    refreshMarkers()
    return
  }
  const center = visitedList.value[0]
    ? new window.TMap.LatLng(visitedList.value[0].lat, visitedList.value[0].lng)
    : new window.TMap.LatLng(35.86166, 104.195397) // 中国中心
  mapInstance = new window.TMap.Map('fp-map', {
    zoom: visitedList.value.length ? 5 : 4,
    center,
  })
  mapReady.value = true
  refreshMarkers()
}

function initMap() {
  if (mapReady.value || mapError.value) return
  if (typeof window.TMap !== 'undefined') {
    buildMap()
    return
  }
  tmapLoading.value = true
  ensureTMap()
    .then(() => {
      tmapLoading.value = false
      buildMap()
    })
    .catch(() => {
      tmapLoading.value = false
      mapError.value = true
    })
}

function refreshMarkers() {
  if (!mapInstance || typeof window.TMap === 'undefined') return
  const geometries = visitedList.value.map((c, i) => ({
    id: 'c' + i,
    styleId: 'marker',
    position: new TMap.LatLng(c.lat, c.lng),
    properties: { title: c.name }
  }))
  if (markerLayer) {
    markerLayer.setGeometries(geometries)
  } else {
    const icon =
      'data:image/svg+xml,' +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26C32 7.2 24.8 0 16 0z" fill="#ff7a45"/><circle cx="16" cy="16" r="6" fill="#fff"/></svg>'
      )
    markerLayer = new TMap.MultiMarker({
      map: mapInstance,
      styles: {
        marker: new TMap.MarkerStyle({ width: 24, height: 32, anchor: { x: 12, y: 32 }, src: icon })
      },
      geometries
    })
    // 城市名标签
    new TMap.MultiLabel({
      map: mapInstance,
      styles: {
        label: new TMap.LabelStyle({ color: '#333', size: 12, offset: { x: 0, y: -36 }, backgroundColor: '#fff', padding: 2 })
      },
      geometries: visitedList.value.map((c, i) => ({
        id: 'l' + i,
        styleId: 'label',
        position: new TMap.LatLng(c.lat, c.lng),
        content: c.name
      }))
    })
  }
}

watch(tab, (v) => {
  if (v === 'map') nextTick(() => initMap())
})
watch(visitedList, () => {
  if (mapInstance) refreshMarkers()
})

onMounted(() => {
  if (tab.value === 'map') nextTick(() => initMap())
})
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
.fp-tabs {
  position: sticky;
  top: 0;
  z-index: 10;
}
/* 时间轴 */
.tl-row {
  display: flex;
  gap: 10px;
}
.tl-left {
  width: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tl-node {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff7a45;
  margin-top: 20px;
  z-index: 1;
}
.tl-row:not(:last-child) .tl-left::after {
  content: '';
  flex: 1;
  width: 2px;
  background: #ffe0d0;
  margin-top: -6px;
}
.tl-card {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  display: flex;
}
.tl-cover {
  width: 90px;
  background-size: cover;
  background-position: center;
}
.tl-body {
  padding: 10px 12px;
  flex: 1;
}
.tl-date {
  font-size: 12px;
  color: var(--brand);
  font-weight: 600;
}
.tl-title {
  font-size: 16px;
  font-weight: 700;
  margin: 3px 0;
}
.tl-meta {
  font-size: 12px;
  color: var(--text-2);
}
/* 地图 */
.map-wrap {
  position: relative;
}
.map-box {
  width: 100%;
  height: calc(100vh - 60px - 190px);
  min-height: 320px;
}
.map-legend {
  position: absolute;
  left: 12px;
  bottom: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
.dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}
.dot.orange {
  background: #ff7a45;
}
.map-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-3);
  pointer-events: none;
}
.map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  background:
    radial-gradient(circle at 50% 35%, var(--brand-light), #fff 70%);
  color: var(--text-2);
  padding: 0 24px;
}
.map-fallback p {
  font-weight: 700;
  color: var(--text-1);
  margin: 4px 0 0;
}
.map-fallback span {
  font-size: 12px;
}
/* 足迹墙 */
.wall-tip {
  color: var(--text-2);
  font-size: 13px;
  margin-bottom: 12px;
  text-align: center;
}
.wall-region {
  margin-bottom: 16px;
}
.wall-region-title {
  font-weight: 700;
  color: var(--text-1);
  margin-bottom: 8px;
  padding-left: 4px;
  border-left: 3px solid var(--brand);
}
.wall-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.wall-city {
  background: #eee;
  border-radius: 12px;
  padding: 12px 4px;
  text-align: center;
  color: #aaa;
  filter: grayscale(1);
  transition: all 0.2s;
}
.wall-city.unlocked {
  background: var(--brand-light);
  color: var(--brand);
  filter: none;
  box-shadow: 0 2px 8px rgba(255, 122, 69, 0.18);
}
.wall-icon {
  font-size: 22px;
}
.wall-name {
  font-size: 12px;
  margin-top: 4px;
  font-weight: 600;
}
</style>
