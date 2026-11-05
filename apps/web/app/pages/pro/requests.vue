<script setup lang="ts">
// Client requests now go to the Carely team, which contacts professionals directly. Old links land on the dashboard.
definePageMeta({ layout: 'dashboard', section: 'pro', middleware: 'auth' });
await navigateTo(useLocalePath()('/pro'), { replace: true });
</script>

<template>
  <div />
</template>
