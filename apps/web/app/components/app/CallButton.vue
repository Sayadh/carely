<script setup lang="ts">
import { Phone } from 'lucide-vue-next';

/** "Call us" link to the Carely team (NUXT_PUBLIC_SUPPORT_PHONE). Renders nothing until a number is configured. */
withDefaults(defineProps<{ variant?: 'primary' | 'secondary' | 'ghost' | 'soft'; size?: 'sm' | 'md' | 'lg'; block?: boolean; showNumber?: boolean }>(), {
  variant: 'secondary',
  size: 'lg',
  showNumber: true,
});
const { t } = useI18n();
const phone = useSupportPhone();
</script>

<template>
  <UiButton v-if="phone" :to="phone.href" :variant="variant" :size="size" :block="block" :aria-label="t('call.ariaLabel', { phone: phone.display })">
    <Phone class="size-4" aria-hidden="true" />
    <span>{{ showNumber ? phone.display : t('call.button') }}</span>
  </UiButton>
</template>
