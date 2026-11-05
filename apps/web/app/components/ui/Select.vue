<script setup lang="ts">
/** Native select (best for accessibility and mobile pickers) with design-system styling. */
defineOptions({ inheritAttrs: false });
// `class`/`style` go to the wrapper; everything else (type, autocomplete, events…) to the control.
const attrs = useAttrs();
const controlAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
const model = defineModel<string | number | null | undefined>();
defineProps<{
  label?: string;
  help?: string;
  error?: string;
  required?: boolean;
  placeholder?: string;
  options: { value: string | number; label: string; disabled?: boolean }[];
  groups?: { label: string; options: { value: string | number; label: string }[] }[];
}>();
</script>

<template>
  <UiField :class="attrs.class" :style="attrs.style" :label="label" :help="help" :error="error" :required="required">
    <template #default="{ id: fid, describedBy, invalid }">
      <div class="relative">
        <select
          :id="fid"
          v-model="model"
          v-bind="controlAttrs"
          class="control appearance-none pr-10"
          :required="required"
          :aria-invalid="invalid || undefined"
          :aria-describedby="describedBy"
        >
          <option v-if="placeholder !== undefined" :value="undefined">{{ placeholder }}</option>
          <option v-for="o in options" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</option>
          <optgroup v-for="g in groups ?? []" :key="g.label" :label="g.label">
            <option v-for="o in g.options" :key="o.value" :value="o.value">{{ o.label }}</option>
          </optgroup>
        </select>
        <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </template>
  </UiField>
</template>
