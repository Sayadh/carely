<script setup lang="ts">
const route = useRoute();
// Pages shared by both roles (request detail) can override the section for the current view.
const override = useState<'account' | 'pro' | null>('dashboard-section', () => null);
const section = computed(() => override.value ?? (route.meta.section as 'account' | 'pro') ?? 'account');
watch(() => route.path, () => {
  if (!route.meta.sharedSection) override.value = null;
});
</script>

<template>
  <AppDashboardShell :section="section"><slot /></AppDashboardShell>
</template>
