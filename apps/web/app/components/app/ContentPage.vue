<script setup lang="ts">
defineProps<{ title: string; lead?: string; narrow?: boolean }>();
</script>

<template>
  <div class="container-page py-10 md:py-14">
    <div :class="narrow ? 'mx-auto max-w-3xl' : ''">
      <h1 class="text-3xl font-semibold md:text-4xl">{{ title }}</h1>
      <p v-if="lead" class="mt-3 max-w-2xl text-lg text-[#475467]">{{ lead }}</p>
      <div class="mt-8"><slot /></div>
    </div>
  </div>
</template>
