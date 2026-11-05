<script setup lang="ts">
/** Native date input (locale-aware picker on every platform). Value: YYYY-MM-DD. */
defineOptions({ inheritAttrs: false });
// `class`/`style` go to the wrapper; everything else (type, autocomplete, events…) to the control.
const attrs = useAttrs();
const controlAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
const model = defineModel<string | undefined>();
defineProps<{ label?: string; help?: string; error?: string; required?: boolean; min?: string; max?: string; type?: 'date' | 'time' }>();
</script>

<template>
  <UiField :class="attrs.class" :style="attrs.style" :label="label" :help="help" :error="error" :required="required">
    <template #default="{ id: fid, describedBy, invalid }">
      <input
        :id="fid"
        v-model="model"
        v-bind="controlAttrs"
        :type="type ?? 'date'"
        :min="min"
        :max="max"
        class="control"
        :required="required"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
      />
    </template>
  </UiField>
</template>
