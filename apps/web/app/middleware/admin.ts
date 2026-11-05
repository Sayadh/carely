export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  const localePath = useLocalePath();
  if (!auth.user) return navigateTo({ path: localePath('/auth/login'), query: { redirect: to.fullPath } });
  // UI guard only — every admin endpoint is authorized on the server.
  if (!auth.user.isAdmin) return navigateTo(localePath('/'));
});
