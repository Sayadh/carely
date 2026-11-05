<script setup lang="ts">
defineOptions({ inheritAttrs: false });
// `class`/`style` go to the wrapper; everything else (type, autocomplete, events…) to the control.
const attrs = useAttrs();
const controlAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
const model = defineModel<string>();
const props = defineProps<{ label?: string; help?: string; error?: string; required?: boolean; maxlength?: number; rows?: number }>();
</script>

<template>
  <UiField :class="attrs.class" :style="attrs.style" :label="label" :help="help" :error="error" :required="required">
    <template #default="{ id: fid, describedBy, invalid }">
      <textarea
        :id="fid"
        v-model="model"
        v-bind="controlAttrs"
        :rows="rows ?? 4"
        :maxlength="maxlength"
        class="control resize-y leading-relaxed"
        :required="required"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
      />
      <p v-if="props.maxlength" class="mt-1 text-right text-xs text-muted" aria-live="off">{{ (model ?? '').length }} / {{ props.maxlength }}</p>
    </template>
  </UiField>
</template>
