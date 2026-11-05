import { defineStore } from 'pinia';
import type { SessionUserDto } from '@carely/shared';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SessionUserDto | null>(null);
  const loaded = ref(false);
  const favoriteIds = ref<string[]>([]);

  const isLoggedIn = computed(() => !!user.value);
  const isAdmin = computed(() => !!user.value?.isAdmin);
  const professional = computed(() => user.value?.professional ?? null);

  async function fetch() {
    const api = useApi();
    try {
      const res = await api<{ user: SessionUserDto | null }>('/auth/me');
      user.value = res.user;
    } catch {
      user.value = null;
    }
    loaded.value = true;
  }

  async function loadFavorites() {
    if (!user.value) return;
    try {
      favoriteIds.value = await useApi()<string[]>('/me/favorites/ids');
    } catch {
      favoriteIds.value = [];
    }
  }

  async function logout() {
    await useApi()('/auth/logout', { method: 'POST' }).catch(() => undefined);
    user.value = null;
    favoriteIds.value = [];
  }

  function set(u: SessionUserDto | null) {
    user.value = u;
    loaded.value = true;
  }

  return { user, loaded, favoriteIds, isLoggedIn, isAdmin, professional, fetch, loadFavorites, logout, set };
});
