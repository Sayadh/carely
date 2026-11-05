<script setup lang="ts">
/** Label + help + error wrapper. Passes ids to the slot for aria wiring. */
const props = defineProps<{ label?: string; help?: string; error?: string; required?: boolean; id?: string }>();
const uid = props.id ?? useId();
const describedBy = computed(() => [props.help ? `${uid}-help` : '', props.error ? `${uid}-err` : ''].filter(Boolean).join(' ') || undefined);
</script>

<template>
  <div>
    <label v-if="label" :for="uid" class="field-label">
      {{ label }}<span v-if="required" class="text-danger" aria-hidden="true"> *</span>
    </label>
    <slot :id="uid" :described-by="describedBy" :invalid="!!error" />
    <p v-if="help && !error" :id="`${uid}-help`" class="field-help">{{ help }}</p>
    <p v-if="error" :id="`${uid}-err`" class="field-error" role="alert">{{ error }}</p>
  </div>
</template>
