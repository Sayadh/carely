import type { EducationLevel, Locale, PriceKind, PriceUnit, ProfileStatus, QualificationDto, SpokenLanguage } from '@carely/shared';

export interface OwnProfile {
  id: string;
  slug: string;
  status: ProfileStatus;
  rejectionReason: string | null;
  onboardingStep: number;
  submittedAt: string | null;
  approvedAt: string | null;
  intro: { displayName: string; headline: string; bio: string; originalLocale: Locale; phone: string; portraitMediaId: string | null; portraitUrl: string | null };
  translations: { locale: Locale; headline: string; bio: string }[];
  services: { categoryId: string | null; serviceIds: string[]; attributeIds: string[] };
  experience: { experienceYears: number; experienceSummary: string; birthYear: number | null; educationLevel: EducationLevel | null; availableFrom: string | null };
  area: { homeLocationId: string | null; serviceAreaIds: string[] };
  languages: SpokenLanguage[];
  offerings: { serviceId: string; priceKind: PriceKind; priceAmount: number | null; priceUnit: PriceUnit }[];
  rules: { weekday: number; startMinute: number; endMinute: number }[];
  exceptions: { id: string; date: string; available: boolean; startMinute: number | null; endMinute: number | null; note: string }[];
  qualifications: QualificationDto[];
  completeness: Record<'intro' | 'services' | 'experience' | 'area' | 'languages' | 'prices' | 'schedule', boolean>;
}

/** The signed-in professional's own (private) profile. */
export function useProProfile() {
  const api = useApi();
  const profile = useState<OwnProfile | null>('pro:own', () => null);
  async function load() {
    const res = await api<{ profile: OwnProfile | null }>('/me/professional');
    profile.value = res.profile;
    return res.profile;
  }
  async function save(path: string, body: unknown, method: 'PUT' | 'POST' | 'DELETE' = 'PUT') {
    profile.value = await api<OwnProfile>(`/me/professional${path}`, { method, body: method === 'DELETE' ? undefined : body });
    return profile.value;
  }
  return { profile, load, save };
}
