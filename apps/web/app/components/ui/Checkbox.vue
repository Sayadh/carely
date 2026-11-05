<script setup lang="ts">
const model = defineModel<boolean | string[]>();
const props = defineProps<{ label: string; value?: string; hint?: string; disabled?: boolean }>();
const id = useId();
</script>

<template>
  <label :for="id" class="flex min-h-10 cursor-pointer items-start gap-3 py-1.5" :class="{ 'opacity-60': disabled }">
    <input
      :id="id"
      v-model="model"
      type="checkbox"
      :value="props.value"
      :disabled="disabled"
      class="mt-0.5 size-5 shrink-0 rounded-[5px] border-line-strong accent-primary"
    />
    <span class="text-base leading-snug">
      {{ label }}
      <span v-if="hint" class="block text-sm text-muted">{{ hint }}</span>
    </span>
  </label>
</template>
