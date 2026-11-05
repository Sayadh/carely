import tailwindcss from '@tailwindcss/vite';
import { CATEGORY_SLUGS } from '@carely/shared';

const siteUrl = process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// Optional hero photo override per category, e.g. NUXT_PUBLIC_HERO_IMAGE_ELDERLY_CARE. Falls back to the single
// NUXT_PUBLIC_HERO_IMAGE, then to the built-in public/images/hero/<slug>.webp — see HomeHero.vue.
const heroImageEnvVar = (slug: string) => `NUXT_PUBLIC_HERO_IMAGE_${slug.toUpperCase().replace(/-/g, '_')}`;
const heroImages = Object.fromEntries(CATEGORY_SLUGS.map((slug) => [slug, process.env[heroImageEnvVar(slug)] || '']));

export default defineNuxtConfig({
  compatibilityDate: '2025-10-01',
  devtools: { enabled: false },
  modules: ['@nuxtjs/i18n', '@pinia/nuxt'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss() as any],
  },
  typescript: { strict: true, typeCheck: false },
  runtimeConfig: {
    // Server-only: where the Nuxt server reaches the NestJS API.
    apiInternalUrl: process.env.NUXT_API_INTERNAL_URL || 'http://127.0.0.1:4000',
    public: {
      siteUrl,
      demoMode: process.env.NUXT_PUBLIC_DEMO_MODE === 'true',
      heroImage: process.env.NUXT_PUBLIC_HERO_IMAGE || '',
      heroImages,
      supportEmail: process.env.NUXT_PUBLIC_SUPPORT_EMAIL || '',
      // Carely team phone for "Call us" buttons. NUXT_PUBLIC_SUPPORT_PHONE overrides the default.
      supportPhone: process.env.NUXT_PUBLIC_SUPPORT_PHONE || '+37493999913',
    },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'hy' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#176B61' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  i18n: {
    strategy: 'prefix',
    defaultLocale: 'hy',
    baseUrl: siteUrl,
    // Armenian is deliberately the default; browser language never overrides it.
    detectBrowserLanguage: false,
    vueI18n: './i18n.config.ts',
    locales: [
      { code: 'hy', language: 'hy-AM', name: 'Հայերեն', file: 'hy.json' },
      { code: 'ru', language: 'ru-RU', name: 'Русский', file: 'ru.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
  },
  routeRules: {
    '/*/account/**': { ssr: true, headers: { 'cache-control': 'private, no-store' } },
    '/*/pro/**': { headers: { 'cache-control': 'private, no-store' } },
    '/*/admin/**': { headers: { 'cache-control': 'private, no-store' } },
    '/*/requests/**': { headers: { 'cache-control': 'private, no-store' } },
  },
  nitro: {
    compressPublicAssets: true,
  },
});
