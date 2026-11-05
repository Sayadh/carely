<script setup lang="ts">
const config = useRuntimeConfig();
const { t } = useI18n();
</script>

<template>
  <div v-if="config.public.demoMode" class="bg-peach-soft text-[0.8125rem] text-[#7a3b20]">
    <p class="container-page py-1.5 text-center">{{ t('demo.banner') }}</p>
  </div>
</template>
