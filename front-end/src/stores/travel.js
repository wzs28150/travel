import { defineStore } from 'pinia'
import { api } from '../api/http'
import { CITIES } from '../data/cities'

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

// 根据开始/结束日期自动推断状态：过去的行程算历史(已完成)，未来的算计划中
function deriveStatus(start, end) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const s = start ? new Date(start + 'T00:00:00') : null
  const e = end ? new Date(end + 'T00:00:00') : null
  if (s && !isNaN(s) && e && !isNaN(e)) {
    if (e < today) return 'done' // 已结束 → 历史行程/手账
    if (s > today) return 'planning' // 未开始 → 计划中
    return 'ongoing' // 进行中
  }
  if (s && !isNaN(s)) return s < today ? 'done' : 'planning'
  if (e && !isNaN(e)) return e < today ? 'done' : 'planning'
  return 'planning'
}

export const useTravelStore = defineStore('travel', {
  state: () => ({
    travels: [],
    loaded: false,
  }),
  getters: {
    getTravel: (state) => (id) => state.travels.find((t) => String(t.id) === String(id)),
    doneTravels: (state) => state.travels.filter((t) => t.status === 'done'),
    favoriteTravels: (state) => state.travels.filter((t) => t.favorite),
    // 已解锁城市集合（来自已完成旅行）
    visitedCities: (state) => {
      const set = new Set()
      state.travels
        .filter((t) => t.status === 'done')
        .forEach((t) => (t.cities || []).forEach((c) => set.add(c)))
      return set
    },
  },
  actions: {
    // 拉取当前用户全部旅行
    async fetchTravels() {
      const res = await api.get('/travels')
      this.travels = res.data || []
      this.loaded = true
    },

    // 把整个旅行对象同步到后端（局部修改后调用）
    async syncTravel(id) {
      const t = this.getTravel(id)
      if (!t) return
      const { id: _id, createdAt, updatedAt, ...rest } = t
      await api.put('/travels/' + id, rest)
    },

    // ---- 旅行 ----
    async addTravel(data) {
      const region = Array.isArray(data.region) ? data.region : []
      const destination = data.destination || ''
      const cities = data.cityName ? [data.cityName] : destination ? [destination] : []
      const payload = {
        title: data.title,
        destination,
        region,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        status: data.status || deriveStatus(data.startDate, data.endDate),
        cover: data.cover || '',
        budgetTotal: data.budgetTotal || 0,
        cities,
        itinerary: [],
        luggage: [],
        todos: [],
        budgets: [],
        photos: [],
        favorite: false,
      }
      const res = await api.post('/travels', payload)
      this.travels.unshift(res.data)
      return res.data.id
    },

    updateTravel(id, patch) {
      const t = this.getTravel(id)
      if (t) {
        Object.assign(t, patch)
        this.syncTravel(id)
      }
    },

    // 收藏 / 取消收藏
    toggleFavorite(travelId) {
      const t = this.getTravel(travelId)
      if (t) {
        t.favorite = !t.favorite
        this.syncTravel(travelId)
      }
    },

    async removeTravel(id) {
      await api.del('/travels/' + id)
      const i = this.travels.findIndex((t) => String(t.id) === String(id))
      if (i > -1) this.travels.splice(i, 1)
    },

    // ---- 通用子项操作 ----
    addItem(travelId, key, item) {
      const t = this.getTravel(travelId)
      if (!t) return
      if (!t[key]) t[key] = []
      t[key].unshift({ id: uid(), ...item })
      this.syncTravel(travelId)
    },
    updateItem(travelId, key, itemId, patch) {
      const t = this.getTravel(travelId)
      const it = t?.[key]?.find((x) => x.id === itemId)
      if (it) {
        Object.assign(it, patch)
        this.syncTravel(travelId)
      }
    },
    removeItem(travelId, key, itemId) {
      const t = this.getTravel(travelId)
      if (!t?.[key]) return
      const i = t[key].findIndex((x) => x.id === itemId)
      if (i > -1) {
        t[key].splice(i, 1)
        this.syncTravel(travelId)
      }
    },
    addPhoto(travelId, photo) {
      const t = this.getTravel(travelId)
      if (!t) return
      if (!t.photos) t.photos = []
      const item = {
        url: photo.url,
        thumb: photo.thumb || photo.url, // 缩略图（列表/相册用，省流量）
        size: photo.size,
        name: photo.name,
        tag: photo.tag || '', // 标签
        place: photo.place || '', // 拍摄地
      }
      t.photos.unshift(item)
      // 首张照片自动作为清单封面（小而清晰）
      if (!t.cover && item.thumb) t.cover = item.thumb
      this.syncTravel(travelId)
    },
    // 批量添加多张照片，最后只同步一次（避免逐张 addPhoto 触发多次 PUT 竞态覆盖）
    addPhotos(travelId, photos) {
      const t = this.getTravel(travelId)
      if (!t) return
      if (!t.photos) t.photos = []
      for (const photo of photos) {
        const item = {
          url: photo.url,
          thumb: photo.thumb || photo.url,
          size: photo.size,
          name: photo.name,
          tag: photo.tag || '',
          place: photo.place || '',
        }
        t.photos.unshift(item)
        if (!t.cover && item.thumb) t.cover = item.thumb
      }
      this.syncTravel(travelId)
    },
    removePhoto(travelId, index) {
      const t = this.getTravel(travelId)
      if (!t?.photos) return
      const removed = t.photos[index]
      t.photos.splice(index, 1)
      // 若删掉的是当前封面，回退到剩余首图的缩略图
      if (removed && t.cover && (removed.thumb === t.cover || removed.url === t.cover)) {
        t.cover = t.photos[0]?.thumb || t.photos[0]?.url || ''
      }
      this.syncTravel(travelId)
    },
    updatePhotoMeta(travelId, index, meta) {
      const t = this.getTravel(travelId)
      const p = t?.photos?.[index]
      if (p) {
        if ('tag' in meta) p.tag = meta.tag
        if ('place' in meta) p.place = meta.place
        this.syncTravel(travelId)
      }
    },
    setCover(travelId, url) {
      const t = this.getTravel(travelId)
      if (t) {
        t.cover = url
        this.syncTravel(travelId)
      }
    },
  },
})

export { CITIES }
