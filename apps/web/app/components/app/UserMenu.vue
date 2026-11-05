<script setup lang="ts">
import { Bell, ChevronDown } from 'lucide-vue-next';
const auth = useAuthStore();
const localePath = useLocalePath();
const { t } = useI18n();
const open = ref(false);
async function logout() {
  await auth.logout();
  open.value = false;
  await navigateTo(localePath('/'));
}
</script>

<template>
  <div v-if="auth.user" class="flex items-center gap-1">
    <NuxtLink :to="localePath('/account/notifications')" class="relative inline-flex size-10 items-center justify-center rounded-lg hover:bg-bg" :aria-label="t('nav.notifications')">
      <Bell class="size-5 text-muted" aria-hidden="true" />
      <span v-if="auth.user.unreadNotifications" class="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-white">
        {{ auth.user.unreadNotifications > 9 ? '9+' : auth.user.unreadNotifications }}
      </span>
    </NuxtLink>
    <div class="relative" @focusout="(e: FocusEvent) => !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node) && (open = false)">
      <button type="button" class="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 hover:bg-bg" :aria-expanded="open" aria-haspopup="true" @click="open = !open">
        <UiAvatar :name="auth.user.name" :size="30" rounded="full" />
        <span class="hidden max-w-32 truncate text-[0.9375rem] lg:inline">{{ auth.user.name }}</span>
        <ChevronDown class="size-4 text-muted" aria-hidden="true" />
      </button>
      <ul v-show="open" class="absolute right-0 z-40 mt-1 w-56 rounded-[var(--radius-control)] border border-line bg-surface py-1 shadow-[var(--shadow-pop)]">
        <li><NuxtLink :to="localePath('/account')" class="flex min-h-10 items-center px-3 hover:bg-bg" @click="open = false">{{ t('nav.myAccount') }}</NuxtLink></li>
        <li v-if="auth.professional">
          <NuxtLink :to="localePath('/pro')" class="flex min-h-10 items-center px-3 hover:bg-bg" @click="open = false">{{ t('nav.proDashboard') }}</NuxtLink>
        </li>
        <li v-if="auth.isAdmin"><NuxtLink :to="localePath('/admin')" class="flex min-h-10 items-center px-3 hover:bg-bg" @click="open = false">{{ t('nav.admin') }}</NuxtLink></li>
        <li class="my-1 border-t border-line" role="separator" />
        <li><button type="button" class="flex min-h-10 w-full items-center px-3 text-left hover:bg-bg" @click="logout">{{ t('nav.logout') }}</button></li>
      </ul>
    </div>
  </div>
</template>
