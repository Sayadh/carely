export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore();
  if (auth.user) return navigateTo(useLocalePath()('/account'));
});
