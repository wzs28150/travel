<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Lists', 'Footprints', 'Mine']">
        <component :is="Component" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
</script>

<style>
.app-root {
  height: 100%;
}
</style>
