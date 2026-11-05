<script setup lang="ts">
import { Heart } from 'lucide-vue-next';
const props = defineProps<{ profileId: string; name: string }>();
const auth = useAuthStore();
const api = useApi();
const { t } = useI18n();
const toast = useToast();
const localePath = useLocalePath();
const route = useRoute();
const busy = ref(false);
const active = computed(() => auth.favoriteIds.includes(props.profileId));
async function toggle() {
  if (!auth.user) return navigateTo({ path: localePath('/auth/login'), query: { redirect: route.fullPath } });
  busy.value = true;
  try {
    if (active.value) {
      await api(`/me/favorites/${props.profileId}`, { method: 'DELETE' });
      auth.favoriteIds = auth.favoriteIds.filter((id) => id !== props.profileId);
    } else {
      await api(`/me/favorites/${props.profileId}`, { method: 'PUT' });
      auth.favoriteIds = [...auth.favoriteIds, props.profileId];
    }
  } catch {
    toast.error(t('errors.INTERNAL'));
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    class="inline-flex size-10 items-center justify-center rounded-full border border-line bg-surface transition-colors hover:border-line-strong"
    :aria-pressed="active"
    :aria-label="active ? t('favorites.remove', { name }) : t('favorites.add', { name })"
    :disabled="busy"
    @click="toggle"
  >
    <Heart class="size-5" :class="active ? 'fill-[#e8775a] text-[#e8775a]' : 'text-muted'" aria-hidden="true" />
  </button>
</template>
