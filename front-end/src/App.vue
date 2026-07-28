<template>
  <div class="app-root">
    <router-view v-slot="{ Component }">
      <keep-alive :include="['Lists', 'Footprints', 'Mine']">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
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
