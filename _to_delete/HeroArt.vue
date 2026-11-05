<script setup lang="ts">
/**
 * Editorial hero visual. If NUXT_PUBLIC_HERO_IMAGE points to a licensed photo it is used;
 * otherwise a calm illustration is shown (no stock faces, no fabricated people).
 */
const config = useRuntimeConfig();
const { t } = useI18n();
</script>

<template>
  <div class="relative aspect-[4/3.4] w-full overflow-hidden rounded-[22px] bg-peach-soft md:aspect-[5/5.2]">
    <img v-if="config.public.heroImage" :src="config.public.heroImage" :alt="t('home.heroImageAlt')" class="h-full w-full object-cover" fetchpriority="high" />
    <svg v-else viewBox="0 0 500 520" class="h-full w-full" role="img" :aria-label="t('home.heroArtAlt')">
      <defs>
        <clipPath id="win"><rect x="250" y="52" width="196" height="236" rx="98" /></clipPath>
      </defs>
      <rect width="500" height="520" fill="#FDF1EB" />
      <!-- window with soft daylight -->
      <rect x="250" y="52" width="196" height="236" rx="98" fill="#EAF3EE" />
      <g clip-path="url(#win)">
        <circle cx="390" cy="118" r="34" fill="#F2BA9F" opacity="0.9" />
        <path d="M250 240c40-30 80-30 120-8s56 18 76 6v50H250z" fill="#CFE3D8" />
        <path d="M250 262c50-22 92-14 130 2s50 10 66 4v20H250z" fill="#B7D6C8" />
      </g>
      <rect x="250" y="168" width="196" height="4" fill="#FDF1EB" />
      <rect x="346" y="52" width="4" height="236" fill="#FDF1EB" />
      <!-- table -->
      <rect x="40" y="380" width="420" height="16" rx="8" fill="#176B61" />
      <rect x="70" y="396" width="12" height="96" rx="6" fill="#12594F" />
      <rect x="418" y="396" width="12" height="96" rx="6" fill="#12594F" />
      <!-- plant -->
      <path d="M118 380c-4-30-2-56 8-80" stroke="#176B61" stroke-width="5" fill="none" stroke-linecap="round" />
      <path d="M124 318c-22-10-40-6-52 6 18 10 36 10 52-6z" fill="#5FA394" />
      <path d="M128 296c18-18 38-20 54-12-14 16-32 20-54 12z" fill="#7FB8AA" />
      <path d="M121 344c-18-4-32 2-40 14 16 4 30 0 40-14z" fill="#7FB8AA" />
      <rect x="96" y="346" width="52" height="36" rx="10" fill="#F2BA9F" />
      <!-- two cups -->
      <rect x="236" y="340" width="44" height="40" rx="10" fill="#FFFFFF" />
      <path d="M280 352h8a10 10 0 0 1 0 20h-8" stroke="#FFFFFF" stroke-width="6" fill="none" />
      <rect x="312" y="346" width="40" height="34" rx="10" fill="#EAF3EE" />
      <path d="M352 356h7a9 9 0 0 1 0 18h-7" stroke="#EAF3EE" stroke-width="6" fill="none" />
      <path d="M252 326c0-8 8-10 8-18M264 326c0-8 8-10 8-18" stroke="#D9A58B" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7" />
      <!-- book -->
      <path d="M380 372h56a6 6 0 0 1 6 6v2h-68v-2a6 6 0 0 1 6-6z" fill="#E4E7EC" />
      <rect x="378" y="362" width="60" height="10" rx="3" fill="#F7F8FA" />
      <!-- heart mark -->
      <path d="M200 470c-12-8.6-20-15.8-20-25.4a11.4 11.4 0 0 1 20-7.4 11.4 11.4 0 0 1 20 7.4c0 9.6-8 16.8-20 25.4z" fill="#176B61" opacity="0.12" />
    </svg>
  </div>
</template>
