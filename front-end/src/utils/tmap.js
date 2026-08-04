// 腾讯地图 GL JS 按需加载器
// 仅当配置了 VITE_TMAP_KEY 时才注入 SDK；未配置则 reject，由调用方优雅降级。
// 这样仓库在没有任何地图 Key 的情况下也能正常构建与运行，地图 Tab 显示友好提示。

let pending = null

export function ensureTMap() {
  if (typeof window !== 'undefined' && window.TMap) {
    return Promise.resolve(window.TMap)
  }
  if (pending) return pending

  const key = import.meta.env.VITE_TMAP_KEY
  if (!key) {
    return Promise.reject(new Error('no-key'))
  }

  pending = new Promise((resolve, reject) => {
    try {
      const sec = import.meta.env.VITE_TMAP_SECURITY
      if (sec) {
        window._TMapSecurityConfig = { securityJsCode: sec }
      }
      const s = document.createElement('script')
      s.type = 'text/javascript'
      s.src = 'https://map.qq.com/api/gljs?v=1.exp&key=' + encodeURIComponent(key)
      s.async = true
      s.onload = () => {
        if (window.TMap) resolve(window.TMap)
        else reject(new Error('tmap-load-fail'))
      }
      s.onerror = () => reject(new Error('tmap-load-error'))
      document.head.appendChild(s)
    } catch (e) {
      reject(e)
    }
  })
  return pending
}
