<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    to?: string;
    block?: boolean;
  }>(),
  { variant: 'primary', size: 'md', type: 'button' },
);

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 font-medium rounded-[var(--radius-control)] transition-colors select-none',
  'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-ring',
  'disabled:cursor-not-allowed aria-disabled:cursor-not-allowed',
  props.block ? 'w-full' : '',
  {
    sm: 'min-h-9 px-3 text-sm',
    md: 'min-h-11 px-4 text-[0.9375rem]',
    lg: 'min-h-12 px-6 text-base',
  }[props.size],
  {
    primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-[#9cc3bc]',
    secondary: 'bg-surface text-ink border border-line-strong hover:bg-bg active:bg-line disabled:text-subtle',
    ghost: 'text-ink hover:bg-bg active:bg-line disabled:text-subtle',
    soft: 'bg-primary-soft text-primary hover:bg-[#dcebe3] active:bg-[#cfe3d8] disabled:text-subtle',
    danger: 'bg-danger text-white hover:bg-[#912018] disabled:bg-[#f0a39c]',
  }[props.variant],
]);
</script>

<template>
  <NuxtLink v-if="to && !disabled" :to="to" :class="classes"><slot /></NuxtLink>
  <button v-else :type="type" :class="classes" :disabled="disabled || loading" :aria-busy="loading || undefined">
    <Loader2 v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <slot />
  </button>
</template>
