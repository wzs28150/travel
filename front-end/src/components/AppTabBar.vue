<template>
  <t-tab-bar :value="active" theme="tag" @change="onChange" class="app-tab-bar">
    <t-tab-bar-item value="lists">
      清单
      <template #icon><t-icon name="view-list" /></template>
    </t-tab-bar-item>
    <t-tab-bar-item value="footprints">
      足迹
      <template #icon><t-icon name="location" /></template>
    </t-tab-bar-item>
    <t-tab-bar-item value="mine">
      我的
      <template #icon><t-icon name="user" /></template>
    </t-tab-bar-item>
  </t-tab-bar>
</template>

<script setup>
import { useRouter } from 'vue-router'

defineProps({
  active: { type: String, required: true }
})

const router = useRouter()
const map = {
  lists: '/lists',
  footprints: '/footprints',
  mine: '/mine'
}
function onChange(val) {
  if (map[val]) router.replace(map[val])
}
</script>

<style scoped>
.app-tab-bar {
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 100%;
  z-index: 200;
}
:deep(.t-tab-bar) {
  width: 100%;
}
</style>
