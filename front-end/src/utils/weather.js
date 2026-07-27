import { CITIES } from '../data/cities'

// WMO 天气代码 -> 图标 + 文案
const WMO = {
  0: { icon: '☀️', text: '晴' },
  1: { icon: '🌤️', text: '晴间多云' },
  2: { icon: '⛅', text: '多云' },
  3: { icon: '☁️', text: '阴' },
  45: { icon: '🌫️', text: '雾' },
  48: { icon: '🌫️', text: '雾凇' },
  51: { icon: '🌦️', text: '毛毛雨' },
  53: { icon: '🌦️', text: '小雨' },
  55: { icon: '🌧️', text: '中雨' },
  56: { icon: '🌧️', text: '冻雨' },
  57: { icon: '🌧️', text: '冻雨' },
  61: { icon: '🌦️', text: '小雨' },
  63: { icon: '🌧️', text: '中雨' },
  65: { icon: '🌧️', text: '大雨' },
  66: { icon: '🌧️', text: '冻雨' },
  67: { icon: '🌧️', text: '冻雨' },
  71: { icon: '🌨️', text: '小雪' },
  73: { icon: '🌨️', text: '中雪' },
  75: { icon: '❄️', text: '大雪' },
  77: { icon: '🌨️', text: '雪粒' },
  80: { icon: '🌦️', text: '阵雨' },
  81: { icon: '🌧️', text: '阵雨' },
  82: { icon: '⛈️', text: '暴雨' },
  85: { icon: '🌨️', text: '阵雪' },
  86: { icon: '❄️', text: '暴雪' },
  95: { icon: '⛈️', text: '雷阵雨' },
  96: { icon: '⛈️', text: '雷阵雨伴冰雹' },
  99: { icon: '⛈️', text: '雷暴冰雹' }
}

export function codeToWeather(code) {
  return WMO[code] || { icon: '🌡️', text: '未知' }
}

// 根据目的地名匹配城市坐标（支持"成都市""四川成都"等模糊包含匹配）
export function findCoord(destination) {
  if (!destination) return null
  const d = String(destination).trim()
  let hit = CITIES.find((c) => c.name === d)
  if (!hit) hit = CITIES.find((c) => d.includes(c.name) || c.name.includes(d))
  return hit || null
}

// 生成日期区间数组
function dateRange(start, end) {
  const days = []
  if (!start) return days
  const s = new Date(start)
  const e = end ? new Date(end) : s
  if (isNaN(s.getTime())) return days
  const cur = new Date(s)
  let guard = 0
  while (cur <= e && guard < 30) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return days
}

// 确定性伪随机（同一城市同一天结果稳定），用于 API 不可用时兜底
function seededRandom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function mockDay(dateStr, cityName, month) {
  const r = seededRandom(dateStr + cityName)
  // 按月份估算基础温度
  const baseByMonth = [5, 8, 14, 20, 25, 29, 32, 31, 26, 20, 13, 7]
  const base = baseByMonth[(month - 1 + 12) % 12] || 20
  const high = Math.round(base + r * 6 - 2)
  const low = Math.round(high - 5 - r * 4)
  const codes = [0, 1, 2, 3, 61, 63, 80, 95]
  const code = codes[Math.floor(r * codes.length)]
  return { date: dateStr, code, high, low, mock: true }
}

// 主入口：优先真实预报，失败/无数据回退到模拟
export async function fetchTripWeather(destination, startDate, endDate) {
  const dates = dateRange(startDate, endDate)
  if (!dates.length) return { list: [], cityName: '', source: 'none' }

  const coord = findCoord(destination)
  const cityName = coord?.name || destination || ''

  // 无坐标：直接模拟
  if (!coord) {
    return { list: dates.map((d) => mockDay(d, cityName, Number(d.slice(5, 7)))), cityName, source: 'mock' }
  }

  try {
    const start = dates[0]
    const end = dates[dates.length - 1]
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${coord.lat}&longitude=${coord.lng}` +
      `&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia%2FShanghai` +
      `&start_date=${start}&end_date=${end}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error('bad status')
    const json = await res.json()
    const daily = json.daily
    if (daily && daily.time && daily.time.length) {
      const map = {}
      daily.time.forEach((t, i) => {
        map[t] = {
          date: t,
          code: daily.weathercode[i],
          high: Math.round(daily.temperature_2m_max[i]),
          low: Math.round(daily.temperature_2m_min[i]),
          mock: false
        }
      })
      // 对区间内缺失的日期用模拟补齐
      const list = dates.map((d) => map[d] || mockDay(d, cityName, Number(d.slice(5, 7))))
      const anyReal = list.some((x) => !x.mock)
      return { list, cityName, source: anyReal ? 'live' : 'mock' }
    }
    throw new Error('no data')
  } catch (e) {
    return { list: dates.map((d) => mockDay(d, cityName, Number(d.slice(5, 7)))), cityName, source: 'mock' }
  }
}

export function formatDay(dateStr) {
  const d = new Date(dateStr)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return { md: `${d.getMonth() + 1}/${d.getDate()}`, week }
}
