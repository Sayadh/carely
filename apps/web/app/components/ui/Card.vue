<script setup lang="ts">
withDefaults(defineProps<{ as?: string; padded?: boolean }>(), { as: 'div', padded: true });
</script>

<template>
  <component :is="as" class="card" :class="padded ? 'p-5 md:p-6' : ''"><slot /></component>
</template>
