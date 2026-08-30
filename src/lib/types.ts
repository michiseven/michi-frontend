export type ProviderMode = "live" | "mock" | "unavailable" | string;

export interface ProviderModes {
  llm?: ProviderMode;
  place?: ProviderMode;
  crowd?: ProviderMode;
  [key: string]: ProviderMode | undefined;
}

export interface ScoreBreakdown {
  total: number;
  preference: number;
  crowd: number;
  distance: number;
  time: number;
  budget: number;
  diversity?: number;
  area?: number;
  /** Higher means the candidate is more suitable for tourism demand dispersion. */
  tourismDispersion?: number | null;
  localImpact?: number | null;
  alternativeSimilarity?: number | null;
  tourismFlow?: number | null;
}

export type TourismEvidenceLevel = "low" | "medium" | "high" | "unavailable";

export interface TourismEvidence {
  concentration: {
    /** Raw concentration direction: higher means relatively more concentrated. */
    value: number | null;
    level: TourismEvidenceLevel;
    scope: "place" | "area";
    areaName?: string | null;
    referencePeriod: string | null;
  };
  localDiscovery: {
    value: number | null;
    level: TourismEvidenceLevel;
  };
  isAlternative: boolean;
  sourceRef: string | null;
}

export interface StopExplanation {
  shortDescription: string;
  previousStopFit: string | null;
  nextStopFit: string | null;
  overallTripFit: string;
}

export interface TripExplanation {
  tripSummary: string;
  locale: "ko" | "ja";
  mode: "live" | "mock" | "fallback" | string;
  model: string | null;
  generatedAt?: string;
}

export interface MenuItemEvidence {
  name: string;
  priceKrw: number;
  recommend?: boolean;
}

export interface PriceEvidence {
  source: "kakao-place-menu" | "kto-detail" | "manual" | string;
  verificationStatus: "verified";
  sourceUrl?: string;
  sourceTitle?: string;
  representativeMenu?: string;
  menuList?: MenuItemEvidence[];
  averageCostKrw: number;
  minPriceKrw?: number | null;
  maxPriceKrw?: number | null;
  sampleCount?: number;
  lastFetchedAt: string;
  referencePeriod?: string;
  referenceDate?: string;
  disclaimer?: string;
}

export interface TripStop {
  id: string;
  order: number;
  dayNumber?: number;
  dayDate?: string | null;
  stopType?:
    | "airport"
    | "basecamp"
    | "fixed_appointment"
    | "meal"
    | "must_visit"
    | "general"
    | string;
  placeId: string;
  placeName: string;
  category: string;
  address?: string | null;
  latitude: number;
  longitude: number;
  imageUrl?: string | null;
  placeDetailLink?: {
    provider: "kakao-map";
    url: string;
  } | null;
  arrivalAt: string;
  leaveAt: string;
  estimatedStayMinutes: number;
  estimatedCost?: number | null;
  priceEvidence?: PriceEvidence | null;
  reason: string;
  explanation?: StopExplanation | null;
  placeDescription?: {
    text: string;
    locale: "ko" | "ja";
    provider: "openai-web-search" | string;
    fetchedAt: string;
    sources: Array<{ title: string; url: string }>;
  } | null;
  crowd?: {
    level?: string | null;
    scope: "area" | string;
    areaName?: string | null;
    observedAt?: string | null;
    disclaimer?: string;
    providerMode?: ProviderMode;
    requestedAreaName?: string;
    referenceDistanceMeters?: number;
  } | null;
  tourism?: TourismEvidence | null;
  rainFallback?: {
    placeId: string;
    placeName: string;
    category?: string | null;
  } | null;
  travelMinutesFromPrevious?: number | null;
  inboundRoute?: {
    distanceKm: number | null;
    durationMinutes: number;
    method:
      | "straight-line-walking-estimate"
      | "naver-directions-driving"
      | "seoul-subway-path-v1"
      | "seoul-subway-estimate-v1"
      | "seoul-bus-estimate-v1"
      | string;
    evidence: "estimated" | "measured" | "mixed" | "unavailable";
    transportMode: "walk" | "car" | "subway" | "bus";
    requestedTransportMode?: "walk" | "subway" | "bus" | "taxi" | null;
    measuredAt?: string;
    subwayDetails?: {
      departureStation: string;
      departureStationLine?: string;
      arrivalStation: string;
      arrivalStationLine?: string;
      subwayDurationMinutes: number;
      subwayDistanceKm: number | null;
      fareKrw: number | null;
      transferCount: number;
      pathSummary?: string;
      accessWalkMinutes: number;
      accessWalkDistanceKm: number;
      egressWalkMinutes: number;
      egressWalkDistanceKm: number;
      segments?: Array<{
        departureStation: string;
        arrivalStation: string;
        line: string | null;
        durationMinutes: number;
        distanceKm: number;
        transfer: boolean;
      }>;
    } | null;
    busDetails?: {
      note?: string;
    } | null;
    disclaimer: string;
  } | null;
  accessibility?: {
    status: "checked" | "unavailable";
    risk: "none-detected" | "steep" | "stairs" | "steep-and-stairs" | "unknown";
    derivedGradePercent: number | null;
    stairFeatureCount: number;
    steepFeatureCount: number;
    disclaimer: string;
  } | null;
  scoreBreakdown: ScoreBreakdown;
}

export interface AnchorPlacePreference {
  name: string;
  targetTime?: string | null;
  role?: string | null;
}

export interface FixedAppointmentPreference {
  name: string;
  targetTime: string;
  durationMinutes: number;
  isMandatory: boolean;
  category?: string | null;
}

export interface MealWindowPreference {
  mealType: "lunch" | "dinner";
  targetTime: string;
  durationMinutes: number;
  cuisinePreferences?: string[];
  area?: string | null;
}

export interface DayTripPreference {
  dayNumber: number;
  date?: string | null;
  title?: string | null;
  area: string | null;
  startTime: string;
  endTime: string;
  dailyBudgetKrw?: number | null;
  startAnchor?: AnchorPlacePreference | null;
  endAnchor?: AnchorPlacePreference | null;
  fixedAppointments?: FixedAppointmentPreference[];
  mealWindows?: MealWindowPreference[];
  mustVisitPlaces?: string[];
  interests: string[];
  preferences: string[];
  avoid: string[];
  maxWalkMinutes?: number | null;
  anchorPlace?: AnchorPlacePreference | null;
}

export interface TripPreference {
  tripTitle?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  totalDays?: number;
  totalBudgetKrw?: number | null;
  partySize?: number;
  companions?: string | null;
  pace?: string | null;
  baseCamp?: {
    name: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    dailyReturnTime?: string | null;
  } | null;
  airport?: string | null;
  mobilityConstraint?: {
    maxWalkMinutesPerLeg: number;
    avoidSteepInclineOrStairs: boolean;
    preferredTransit?: string | null;
  } | null;
  userPriorities?: string[];
  rainFallbackPolicy?: string | null;

  area?: string | null;
  startTime: string;
  endTime: string;
  budget?: number | null;
  interests: string[];
  preferences: string[];
  avoid: string[];
  maxWalkMinutes?: number | null;
  anchorPlace?: AnchorPlacePreference | null;

  days?: DayTripPreference[];
}

export interface Trip {
  id: string;
  editToken?: string | null;
  isEditable?: boolean;
  title?: string;
  date: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  totalBudgetKrw?: number | null;
  partySize?: number;
  companions?: string | null;
  pace?: string | null;
  baseCamp?: {
    name: string;
    checkInTime?: string | null;
    checkOutTime?: string | null;
    dailyReturnTime?: string | null;
  } | null;
  airport?: string | null;
  mobilityConstraint?: {
    maxWalkMinutesPerLeg: number;
    avoidSteepInclineOrStairs: boolean;
    preferredTransit?: string | null;
  } | null;
  days?: DayTripPreference[];
  startArea?: string;
  startTime: string;
  endTime: string;
  status?: "ready" | "modified";
  budget?: number | null;
  estimatedTotalCost?: number | null;
  explanation?: TripExplanation | null;
  preference?: TripPreference;
  appliedWeights?: Omit<ScoreBreakdown, "total">;
  stops: TripStop[];
  providerModes: ProviderModes;
  providerSources?: {
    place?: string;
    crowd?: string;
  };
  warnings: string[];
}

export interface GenerateTripInput {
  text: string;
  travelDate?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  budget?: number;
  startArea?: string;
  airport?: string;
  hotel?: string;
  locale?: "ja" | "ko";
}

export type StopPatch =
  | { action: "remove"; stopId: string }
  | { action: "reorder"; stopIds: string[] }
  | { action: "replace"; stopId: string; newPlaceId: string }
  | { action: "recalculate" };

export interface User {
  id: string;
  displayName: string;
  email: string;
  locale: "ja" | "ko";
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  expiresIn: number;
}

export interface UserSavedTrip {
  id: string;
  userId: string;
  tripId: string;
  title: string;
  travelDate: string;
  stopsCount: number;
  estimatedTotalCost: number | null;
  tripSnapshot?: Trip | null;
  memo?: string | null;
  savedAt: string;
}

export interface PaginatedSavedTrips {
  items: UserSavedTrip[];
  total: number;
  page: number;
  limit: number;
}

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  locale?: "ja" | "ko";
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  locale?: "ja" | "ko";
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SaveTripInput {
  tripId: string;
  title?: string;
  travelDate?: string;
  stopsCount?: number;
  estimatedTotalCost?: number | null;
  tripSnapshot?: Trip;
  memo?: string;
}

export interface StopAlternativeItem {
  placeId: string;
  name: string;
  category: string;
  address: string;
  roadAddress: string | null;
  latitude: number;
  longitude: number;
  estimatedCost: number | null;
  priceEvidence?: PriceEvidence | null;
  reason: string;
  description?: string | null;
  distanceMeters?: number;
}

export interface StopAlternativesResponse {
  targetStop: {
    id: string;
    name: string;
    category: string;
  };
  alternatives: StopAlternativeItem[];
}

export interface SearchHotelItem {
  name: string;
  roadAddress: string | null;
  address: string | null;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface VerifiedPlaceFacts {
  placeId: string;
  name: string;
  sourceName: string;
  category: string | null;
  address: string | null;
  roadAddress: string | null;
  overview: string | null;
  businessHours: string | null;
  priceEvidence: {
    minPrice: number | null;
    maxPrice: number | null;
    sourceTitle?: string | null;
    sourceUrl?: string | null;
  } | null;
  crowdContext: {
    level: string | null;
    areaName: string | null;
    disclaimer: string | null;
  } | null;
  placeDetailLink: {
    provider: "kakao-map";
    url: string;
  } | null;
  source: string;
  sourcePlaceId: string | null;
  webEvidence: PlaceDetailEvidenceView | null;
}

export interface PlaceDetailEvidenceSource {
  title: string;
  url: string;
}

export interface PlaceDetailEvidenceFact {
  status: "sourced" | "conflicting" | "unavailable";
  value: string | null;
  sources: PlaceDetailEvidenceSource[];
}

export interface PlaceDetailEvidenceView {
  provider: "openai-web-search";
  model: string;
  status: "sourced" | "partial" | "conflicting" | "unavailable";
  evidence: {
    placeMatched: boolean;
    matchedName: string | null;
    matchedAddress: string | null;
    businessHours: PlaceDetailEvidenceFact;
    price: PlaceDetailEvidenceFact;
    warnings: string[];
  };
  fetchedAt: string;
  expiresAt: string;
  cacheHit: boolean;
}

export interface ReplacementCandidate {
  placeId: string;
  name: string;
  category: string;
  distanceMeters?: number;
  reason: string;
  evidenceStatus: string;
  estimatedCost: number | null;
  priceEvidence?: {
    minPrice: number | null;
    maxPrice: number | null;
    sourceTitle?: string | null;
    sourceUrl?: string | null;
  } | null;
  address?: string | null;
}

export interface PendingTripMutation {
  type: "trip_mutation_confirmation";
  action: "remove" | "replace";
  tripId: string;
  targetStop: {
    stopId: string;
    placeId: string;
    placeName: string;
  };
  alternatives: ReplacementCandidate[];
  warnings: string[];
}

export interface ActionChip {
  label: string;
  query: string;
  type?: string;
}

export type ChatRunStatus =
  "completed" | "awaiting_confirmation" | "rejected" | "failed";

export interface CreateThreadResponse {
  threadId: string;
  threadSecret: string;
}

export interface ChatResponse {
  threadId: string;
  threadSecret?: string;
  editToken?: string;
  status: ChatRunStatus;
  responseMessage: string;
  actionChips?: ActionChip[];
  pendingAction?: PendingTripMutation | null;
  alternatives?: ReplacementCandidate[];
  verifiedPlaceFacts?: VerifiedPlaceFacts | null;
  resultTripId?: string | null;
  resultTrip?: Trip | null;
  errorCode?: string | null;
}
