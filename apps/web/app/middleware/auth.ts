/** Requires a signed-in user; preserves the target path for after sign-in. */
export default defineNuxtRouteMiddleware((to) => {
  const auth = useAuthStore();
  if (!auth.user) {
    const localePath = useLocalePath();
    return navigateTo({ path: localePath('/auth/login'), query: { redirect: to.fullPath } });
  }
});
