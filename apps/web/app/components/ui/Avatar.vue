<script setup lang="ts">
const props = withDefaults(defineProps<{ src?: string | null; name: string; size?: number; rounded?: 'full' | 'xl' }>(), { size: 48, rounded: 'xl' });
const { initials } = useFormat();
const failed = ref(false);
// Deterministic calm tint per name (no rainbow): teal or peach family.
const tint = computed(() => ([...props.name].reduce((a, c) => a + c.charCodeAt(0), 0) % 2 === 0 ? 'bg-primary-soft text-primary' : 'bg-peach-soft text-[#9a4a2a]'));
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="name"
    :width="size"
    :height="size"
    loading="lazy"
    class="shrink-0 object-cover"
    :class="rounded === 'full' ? 'rounded-full' : 'rounded-[14px]'"
    :style="{ width: size + 'px', height: size + 'px' }"
    @error="failed = true"
  />
  <span
    v-else
    role="img"
    :aria-label="name"
    class="inline-flex shrink-0 items-center justify-center font-semibold"
    :class="[tint, rounded === 'full' ? 'rounded-full' : 'rounded-[14px]']"
    :style="{ width: size + 'px', height: size + 'px', fontSize: Math.round(size * 0.36) + 'px' }"
  >
    {{ initials(name) }}
  </span>
</template>
