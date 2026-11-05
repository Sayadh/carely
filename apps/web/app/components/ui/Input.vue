<script setup lang="ts">
defineOptions({ inheritAttrs: false });
// `class`/`style` go to the wrapper; everything else (type, autocomplete, events…) to the control.
const attrs = useAttrs();
const controlAttrs = computed(() => {
  const { class: _c, style: _s, ...rest } = attrs;
  return rest;
});
const model = defineModel<string | number | null>();
defineProps<{ label?: string; help?: string; error?: string; required?: boolean; type?: string; id?: string }>();
</script>

<template>
  <UiField :class="attrs.class" :style="attrs.style" :id="id" :label="label" :help="help" :error="error" :required="required">
    <template #default="{ id: fid, describedBy, invalid }">
      <input
        :id="fid"
        v-model="model"
        v-bind="controlAttrs"
        :type="type ?? 'text'"
        class="control"
        :required="required"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
      />
    </template>
  </UiField>
</template>
