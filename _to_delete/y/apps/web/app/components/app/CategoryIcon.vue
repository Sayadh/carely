<script setup lang="ts">
/** Line-art category icons (24×24, currentColor, 1.6 stroke) — consistent outline style. */
defineProps<{ slug: string }>();
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <!-- Childcare: baby face with curl -->
    <template v-if="slug === 'childcare'">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 5c-1.6 0-2.4 1-2.4 1.9 0 .8.6 1.3 1.3 1.3" />
      <circle cx="9.2" cy="12.6" r=".6" fill="currentColor" stroke="none" />
      <circle cx="14.8" cy="12.6" r=".6" fill="currentColor" stroke="none" />
      <path d="M9.6 16c1.4 1.1 3.4 1.1 4.8 0" />
    </template>
    <!-- Elderly care: older face with hair bun and round glasses -->
    <template v-else-if="slug === 'elderly-care'">
      <circle cx="12" cy="3.6" r="1.6" />
      <path d="M5.6 12.2c0-4 2.9-6.9 6.4-6.9s6.4 2.9 6.4 6.9c0 3.9-2.9 7.3-6.4 7.3s-6.4-3.4-6.4-7.3z" />
      <path d="M6 10.2c1.8.2 4-.6 6-2.6 2 2 4.2 2.8 6 2.6" />
      <circle cx="9.4" cy="13" r="1.8" />
      <circle cx="14.6" cy="13" r="1.8" />
      <path d="M11.2 13h1.6" />
      <path d="M10.4 16.6c1 .6 2.2.6 3.2 0" />
    </template>
    <!-- Patient care: medical cross -->
    <template v-else-if="slug === 'patient-care'">
      <path d="M9.5 3.5h5v6h6v5h-6v6h-5v-6h-6v-5h6z" />
    </template>
    <!-- Pet care: paw -->
    <template v-else-if="slug === 'pet-care'">
      <ellipse cx="7" cy="9.5" rx="1.7" ry="2.2" />
      <ellipse cx="10.4" cy="6.2" rx="1.7" ry="2.3" />
      <ellipse cx="13.6" cy="6.2" rx="1.7" ry="2.3" />
      <ellipse cx="17" cy="9.5" rx="1.7" ry="2.2" />
      <path d="M12 11.5c-2.4 0-4.8 3-4.8 5.2 0 1.6 1.2 2.3 2.5 2.3 1 0 1.5-.5 2.3-.5s1.3.5 2.3.5c1.3 0 2.5-.7 2.5-2.3 0-2.2-2.4-5.2-4.8-5.2z" />
    </template>
    <template v-else>
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
    </template>
  </svg>
</template>
