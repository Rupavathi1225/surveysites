import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Network configurations for tracking link generation
const NETWORK_CONFIGS = {
  cpamerchant: {
    networkId: 'cpamerchant',
    networkName: 'CPAMerchant',
    baseUrl: 'https://tracking.cpamerchant.com/aff_c',
    offerIdParam: 'offer_id',
    affIdParam: 'aff_id',
    defaultAffId: '3394'
  },
  chameleonads: {
    networkId: 'chameleonads',
    networkName: 'ChameleonAds',
    baseUrl: 'https://chameleonads.go2cloud.org/aff_c',
    offerIdParam: 'offer_id',
    affIdParam: 'aff_id',
    defaultAffId: '5696'
  },
  leadads: {
    networkId: 'leadads',
    networkName: 'LeadAds',
    baseUrl: 'https://leadads.go2jump.org/aff_c',
    offerIdParam: 'offer_id',
    affIdParam: 'aff_id',
    defaultAffId: '10843'
  }
};

// Tracking Link Generator for edge function
function generateTrackingLink(networkId: string, offerId: string, affId?: string): string {
  const config = NETWORK_CONFIGS[networkId.toLowerCase()];
  
  if (!config) {
    console.warn(`Unknown network: ${networkId}`);
    return '';
  }

  const affiliateId = affId || config.defaultAffId;
  const params = new URLSearchParams();
  params.append(config.offerIdParam, offerId.toString());
  params.append(config.affIdParam, affiliateId);

  return `${config.baseUrl}?${params.toString()}`;
}

type Action = "test" | "preview" | "import";

type HasOffersRequest = {
  network_id: string;
  api_key: string;
  action: Action;
  provider?: string;
  limit?: number;
  page?: number;
  import_options?: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    autoActivate: boolean;
    showInOfferwall: boolean;
  };
  offers?: any[];
};

type HasOffersOffer = {
  id?: string | number;
  offer_id?: string | number;
  name?: string;
  title?: string;
  description?: string;
  Offer?: {
    id?: string | number;
    name?: string;
    description?: string;
    payout?: string | number;
    currency?: string;
    status?: string;
  };
  AffiliateOffer?: {
    Offer?: {
      id?: string | number;
      name?: string;
      description?: string;
      payout?: string | number;
      currency?: string;
      status?: string;
    };
  };
  payout?: string | number;
  currency?: string;
  status?: string;
  country?: string;
  countries?: string[];
  preview_url?: string;
  default_offer_url?: string;
  offer_url?: string;
  tracking_url?: string;
  image_url?: string;
  devices?: string[];
  platform?: string;
  url?: string;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Keyword bucket system for vertical classification
const verticalKeywords: Record<string, string[]> = {
  "Mobile Apps": ["app", "mobile", "android", "ios", "download", "install", "application", "smartphone", "tablet", "game", "utility", "productivity", "social", "entertainment", "software"],
  "Surveys": ["survey", "poll", "questionnaire", "research", "opinion", "feedback", "study", "market research", "consumer", "panel", "respondent", "data collection", "insights", "analytics", "responses"],
  "Gaming": ["game", "gaming", "casino", "poker", "slots", "betting", "gambling", "esports", "mmo", "rpg", "fps", "strategy", "puzzle", "arcade", "adventure"],
  "Finance": ["finance", "banking", "investment", "trading", "crypto", "bitcoin", "loan", "credit", "insurance", "mortgage", "savings", "budget", "financial", "money", "wealth"],
  "Health & Wellness": ["health", "wellness", "fitness", "diet", "weight loss", "exercise", "nutrition", "medical", "healthcare", "supplements", "vitamins", "mental health", "therapy", "medication", "pharmacy"],
  "Beauty & Cosmetics": ["beauty", "cosmetics", "makeup", "skincare", "hair care", "fragrance", "beauty products", "cosmetic", "makeover", "beauty tips", "beauty routine", "beauty treatment", "beauty salon", "beauty box", "beauty subscription"],
  "Education": ["education", "learning", "courses", "training", "certification", "degree", "online learning", "e-learning", "tutorial", "skills", "knowledge", "study", "academic", "educational", "career development"],
  "Entertainment": ["entertainment", "movies", "music", "tv shows", "streaming", "video", "concerts", "events", "tickets", "shows", "theater", "comedy", "drama", "celebrity", "media"],
  "Shopping & E-commerce": ["shopping", "ecommerce", "store", "buy", "sell", "product", "retail", "online shopping", "discount", "sale", "deal", "coupon", "promo", "marketplace", "shopping cart"],
  "Travel": ["travel", "vacation", "holiday", "trip", "flight", "hotel", "booking", "tourism", "destination", "resort", "cruise", "adventure travel", "business travel", "travel package", "travel deal"],
  "Technology": ["technology", "tech", "software", "hardware", "computer", "laptop", "smartphone", "gadget", "innovation", "digital", "IT", "programming", "development", "cloud", "cybersecurity"]
};

// Traffic sources by vertical
const trafficSourcesByVertical: Record<string, string[]> = {
  "Mobile Apps": ["App Store", "Google Play", "Mobile Ads", "Social Media", "App Discovery Platforms"],
  "Surveys": ["Email Marketing", "Social Media", "Survey Panels", "Market Research Sites", "Affiliate Networks"],
  "Gaming": ["Gaming Forums", "Twitch", "YouTube Gaming", "Discord", "Gaming Communities"],
  "Finance": ["Financial Blogs", "Investment Forums", "LinkedIn", "Financial News Sites", "Professional Networks"],
  "Health & Wellness": ["Health Blogs", "Fitness Apps", "Social Media", "Medical Forums", "Wellness Websites"],
  "Beauty & Cosmetics": ["Instagram", "YouTube Beauty", "Beauty Blogs", "Social Media", "Influencer Networks"],
  "Education": ["Educational Websites", "LinkedIn", "Professional Networks", "Online Learning Platforms", "Academic Forums"],
  "Entertainment": ["Social Media", "Entertainment News", "Streaming Platforms", "YouTube", "Celebrity Sites"],
  "Shopping & E-commerce": ["Price Comparison Sites", "Coupon Sites", "Social Media", "Email Marketing", "Search Engines"],
  "Travel": ["Travel Blogs", "Booking Sites", "Travel Forums", "Social Media", "Travel Agencies"],
  "Technology": ["Tech Blogs", "Developer Forums", "LinkedIn", "Tech News Sites", "Professional Networks"]
};

// Default image URLs by vertical
const defaultImagesByVertical: Record<string, string> = {
  "Mobile Apps": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=300&fit=crop",
  "Surveys": "https://images.unsplash.com/photo-1554224154-260325c0594e?w=400&h=300&fit=crop",
  "Gaming": "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400&h=300&fit=crop",
  "Finance": "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=400&h=300&fit=crop",
  "Health & Wellness": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop",
  "Beauty & Cosmetics": "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop",
  "Education": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop",
  "Entertainment": "https://images.unsplash.com/photo-1489599807961-c79686cb15c2?w=400&h=300&fit=crop",
  "Shopping & E-commerce": "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&h=300&fit=crop",
  "Travel": "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop",
  "Technology": "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop"
};

// Helper function to detect vertical based on name and description
function detectVertical(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [vertical, keywords] of Object.entries(verticalKeywords)) {
    scores[vertical] = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[vertical]++;
      }
    }
  }

  let maxScore = 0;
  let detectedVertical = "Technology"; // default fallback

  for (const [vertical, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedVertical = vertical;
    }
  }

  return detectedVertical;
}

// Helper function to detect category based on name and description
function detectCategory(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  
  // Category detection logic
  const categoryKeywords: Record<string, string[]> = {
    "Survey": ["survey", "poll", "questionnaire", "research", "study", "opinion"],
    "App Install": ["app", "install", "download", "mobile", "android", "ios", "iphone", "ipad"],
    "Lead Generation": ["lead", "signup", "register", "form", "submit", "contact"],
    "E-commerce": ["shop", "buy", "purchase", "store", "retail", "product", "sale"],
    "Gaming": ["game", "play", "casino", "bet", "wager", "poker", "slots"],
    "Finance": ["loan", "credit", "bank", "finance", "money", "investment", "trading"],
    "Health": ["health", "medical", "fitness", "wellness", "diet", "weight"],
    "Education": ["learn", "course", "study", "education", "training", "school"],
    "Travel": ["travel", "hotel", "flight", "vacation", "trip", "booking"],
    "Entertainment": ["movie", "music", "video", "streaming", "tv", "show"],
    "Dating": ["dating", "match", "relationship", "love", "chat", "meet"],
    "Insurance": ["insurance", "coverage", "policy", "claim", "protect"],
    "Real Estate": ["property", "real estate", "home", "house", "rent", "mortgage"],
    "Automotive": ["car", "auto", "vehicle", "drive", "motorcycle"],
    "Food": ["food", "restaurant", "delivery", "meal", "cook", "recipe"],
    "Beauty": ["beauty", "cosmetic", "makeup", "skin", "hair", "fashion"],
    "Technology": ["tech", "software", "computer", "digital", "online", "web"],
  };

  let maxScore = 0;
  let detectedCategory = "Technology"; // default fallback

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    let score = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        score++;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category;
    }
  }

  return detectedCategory;
}

// Helper function to detect countries from name and description
function detectCountries(name: string, description: string): string {
  const text = `${name} ${description}`.toLowerCase();
  
  // Country detection patterns
  const countryPatterns: Record<string, RegExp[]> = {
    "US": [/\busa?\b/, /\bunited states?\b/, /\bamerica\b/],
    "UK": [/\buk\b/, /\bunited kingdom?\b/, /\bbritain\b/],
    "CA": [/\bca\b/, /\bcanada\b/],
    "AU": [/\bau\b/, /\baustralia\b/],
    "DE": [/\bde\b/, /\bgermany\b/],
    "FR": [/\bfr\b/, /\bfrance\b/],
    "IT": [/\bit\b/, /\bitaly\b/],
    "ES": [/\bes\b/, /\bspain\b/],
    "IN": [/\bin\b/, /\bindia\b/],
    "JP": [/\bjp\b/, /\bjapan\b/],
    "BR": [/\bbr\b/, /\bbrazil\b/],
    "MX": [/\bmx\b/, /\bmexico\b/],
    "CN": [/\bcn\b/, /\bchina\b/],
    "RU": [/\bru\b/, /\brussia\b/],
    "NL": [/\bnl\b/, /\bnetherlands\b/],
    "SE": [/\bse\b/, /\bsweden\b/],
    "NO": [/\bno\b/, /\bnorway\b/],
    "DK": [/\bdk\b/, /\bdenmark\b/],
    "FI": [/\bfi\b/, /\bfinland\b/],
    "PL": [/\bpl\b/, /\bpoland\b/],
    "GR": [/\bgr\b/, /\bgreece\b/],
    "PT": [/\bpt\b/, /\bportugal\b/],
    "CH": [/\bch\b/, /\bswitzerland\b/],
    "AT": [/\bat\b/, /\baustria\b/],
    "BE": [/\bbe\b/, /\bbelgium\b/],
    "IE": [/\bie\b/, /\bireland\b/],
    "NZ": [/\bnz\b/, /\bnew zealand\b/],
    "ZA": [/\bza\b/, /\bsouth africa\b/],
    "SG": [/\bsg\b/, /\bsingapore\b/],
    "MY": [/\bmy\b/, /\bmalaysia\b/],
    "TH": [/\bth\b/, /\bthailand\b/],
    "PH": [/\bph\b/, /\bphilippines\b/],
    "ID": [/\bid\b/, /\bindonesia\b/],
    "VN": [/\bvn\b/, /\bvietnam\b/],
    "KR": [/\bkr\b/, /\bkorea\b/],
    "HK": [/\bhk\b/, /\bhong kong\b/],
    "TW": [/\btw\b/, /\btaiwan\b/],
  };

  const detectedCountries: string[] = [];

  for (const [countryCode, patterns] of Object.entries(countryPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        detectedCountries.push(countryCode);
        break; // Only add each country once
      }
    }
  }

  // If no countries detected, default to US
  if (detectedCountries.length === 0) {
    return "US";
  }

  return detectedCountries.join(", ");
}

// Helper function to generate traffic sources based on vertical
function generateTrafficSources(vertical: string): string[] {
  return trafficSourcesByVertical[vertical] || trafficSourcesByVertical["Technology"];
}

// Helper function to detect devices from API data
function detectDevices(offer: HasOffersOffer): string[] {
  const devices: string[] = [];
  const text = `${offer.name || ""} ${offer.description || ""} ${offer.platform || ""} ${(offer.devices || []).join(" ")}`.toLowerCase();

  if (text.includes("ios") || text.includes("iphone") || text.includes("ipad") || text.includes("apple")) {
    devices.push("iOS");
  }
  if (text.includes("android") || text.includes("google play")) {
    devices.push("Android");
  }
  if (text.includes("web") || text.includes("desktop") || text.includes("browser") || text.includes("online")) {
    devices.push("Web");
  }

  // If no devices detected, default to all
  if (devices.length === 0) {
    devices.push("iOS", "Android", "Web");
  }

  return devices;
}

// Helper function to process and simplify name
function processName(name: string, country?: string): string {
  if (!name) return "Survey Offer";

  let processedName = name.trim();

  // Remove country codes and country names from the title
  const countryPatterns = [
    /\b[A-Z]{2}\b/g, // Country codes like US, UK, CA
    /\b(united states|usa|uk|united kingdom|canada|australia|germany|france|spain|italy|india|china|japan|brazil|mexico)\b/gi,
    /\b\s*-\s*[A-Z]{2}\s*$/g, // Trailing country codes like " - US"
    /\b\s*\([A-Z]{2}\)\s*$/g, // Trailing country codes in parentheses like " (US)"
    /\b\s*-\s*[A-Za-z\s]+\s*$/g, // Trailing country names like " - United States"
    /\b\s*\([A-Za-z\s]+\)\s*$/g, // Trailing country names in parentheses like " (United States)"
  ];

  for (const pattern of countryPatterns) {
    processedName = processedName.replace(pattern, "");
  }

  // Remove platform/device indicators
  const platformPatterns = [
    /\b(android|ios|iphone|ipad|mobile|desktop|web|pc|mac|windows)\b/gi,
    /\b\s*-\s*(android|ios|mobile|desktop|web)\s*$/gi,
    /\b\s*\((android|ios|mobile|desktop|web)\)\s*$/gi,
  ];

  for (const pattern of platformPatterns) {
    processedName = processedName.replace(pattern, "");
  }

  // Remove common affiliate marketing terms
  const affiliatePatterns = [
    /\b(survey|offer|app|application|download|install|free|trial|demo)\b/gi,
    /\b\s*-\s*(survey|offer|app|application)\s*$/gi,
    /\b\s*\((survey|offer|app|application)\)\s*$/gi,
  ];

  for (const pattern of affiliatePatterns) {
    processedName = processedName.replace(pattern, "");
  }

  // Remove special characters and clean up
  processedName = processedName
    .replace(/[|\\[\]{}()]/g, "") // Remove brackets and pipes
    .replace(/\s*-\s*/g, " ") // Replace dashes with spaces
    .replace(/\s+/g, " ") // Multiple spaces to single space
    .replace(/\s*-\s*$/g, "") // Remove trailing dashes
    .trim();

  // Capitalize each word properly
  processedName = processedName.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  // If name is too long, truncate it
  if (processedName.length > 50) {
    processedName = processedName.substring(0, 47) + "...";
  }

  // If after processing the name is empty or too short, return a default
  if (!processedName || processedName.length < 3) {
    return "Survey Offer";
  }

  return processedName;
}

// Helper function to get image URL with fallback
function getImageUrl(offer: HasOffersOffer, vertical: string): string {
  // Try to get image from API first
  if (offer.image_url && offer.image_url.trim() !== "") {
    return offer.image_url;
  }

  // Check for common image URL patterns in the offer data
  const offerData = JSON.stringify(offer).toLowerCase();
  const imagePatterns = [
    /https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp)/gi,
    /image_url["\s:]+https?:\/\/[^\s"']+/gi,
    /thumbnail["\s:]+https?:\/\/[^\s"']+/gi,
  ];

  for (const pattern of imagePatterns) {
    const match = offerData.match(pattern);
    if (match && match[0]) {
      const url = match[0].match(/https?:\/\/[^\s"']+\.(jpg|jpeg|png|gif|webp)/i);
      if (url && url[0]) {
        return url[0];
      }
    }
  }

  // Fallback to vertical-based default image
  return defaultImagesByVertical[vertical] || defaultImagesByVertical["Technology"];
}

function json(headers: Record<string, string>, status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
}

function buildHasOffersUrl(networkId: string) {
  // Standard Tune/HasOffers API base URL
  return `https://${networkId}.api.hasoffers.com/Apiv3/json`;
}

function buildHasOffersUrlCandidates(networkId: string) {
  const trimmed = networkId.trim();
  return [
    `https://${trimmed}.api.hasoffers.com/Apiv3/json`,
    `https://${trimmed}.hasoffers.com/Apiv3/json`,
  ];
}

async function hasOffersRequest<T>(
  url: string,
  params: Record<string, string>,
) {
  const qs = new URLSearchParams(params);
  const fullUrl = `${url}?${qs.toString()}`;
  const res = await fetch(fullUrl, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HasOffers HTTP ${res.status}: ${text.substring(0, 200)}`);
  }

  if (!contentType.includes("application/json")) {
    throw new Error(`HasOffers did not return JSON. First 200 chars: ${text.substring(0, 200)}`);
  }

  return JSON.parse(text) as T;
}

async function fetchAllHasOffersOffers(
  attempts: Array<{ url: string; params: Record<string, string> }>,
  limit: number,
) {
  // Tune/HasOffers often paginates with page+limit. We keep fetching pages until we get < limit.
  let used: { url: string; params: Record<string, string> } | null = null;
  let payload: any = null;
  let lastError: string | null = null;

  const all: any[] = [];
  let page = 1;
  const maxPages = 50; // safety cap

  while (page <= maxPages) {
    let pagePayload: any = null;
    let pageUsed: { url: string; params: Record<string, string> } | null = null;

    for (const attempt of attempts) {
      try {
        const p = await hasOffersRequest<any>(attempt.url, { ...attempt.params, page: String(page), limit: String(limit) });
        pagePayload = p;
        pageUsed = attempt;
        break;
      } catch (e: any) {
        lastError = e?.message || String(e);
      }
    }

    if (!pagePayload || !pageUsed) {
      if (page === 1) {
        throw new Error(lastError || "Failed to call HasOffers API");
      }
      break;
    }

    if (!used) used = pageUsed;
    if (!payload) payload = pagePayload;

    const status = pagePayload?.response?.status;
    const httpStatus = pagePayload?.response?.httpStatus;
    const errorMessage = pagePayload?.response?.errorMessage;
    const errors = pagePayload?.response?.errors;
    const isFailure = status === 0 || status === "0" || (typeof httpStatus === "number" && httpStatus >= 400);
    if (isFailure) {
      const msg =
        errorMessage ||
        (Array.isArray(errors) && errors.length ? String(errors[0]) : null) ||
        pagePayload?.response?.error ||
        "HasOffers request failed";
      throw new Error(msg);
    }

    const pageOffers = extractHasOffersOffers(pagePayload);
    all.push(...pageOffers);

    if (pageOffers.length < limit) break;
    page++;
  }

  return { offers: all, used, payload: payload ?? null };
}

function extractHasOffersOffers(payload: any): HasOffersOffer[] {
  // Typical response shape:
  // { response: { status: 1, data: { <id>: { Offer: {...} } } } }
  const base = payload?.response?.data;
  if (!base) return [];

  // Tune often returns lists nested under response.data.data / items / results / offers
  const data =
    base?.data ??
    base?.items ??
    base?.results ??
    base?.offers ??
    base;

  // Sometimes data is already an array
  if (Array.isArray(data)) {
    return data
      .map((v) => (v as any)?.Offer ?? (v as any)?.offer ?? v)
      .filter((v) => v && typeof v === "object") as HasOffersOffer[];
  }

  if (typeof data !== "object") return [];

  const values = Object.values(data as Record<string, unknown>);
  const offers: HasOffersOffer[] = [];
  for (const v of values) {
    const offer =
      (v as any)?.Offer ??
      (v as any)?.AffiliateOffer ??
      (v as any)?.Affiliate_Offer ??
      (v as any)?.offer ??
      v;
    if (offer && typeof offer === "object") offers.push(offer as HasOffersOffer);
  }
  return offers;
}

function summarizeDataShape(data: any) {
  if (data == null) return { type: "null" };
  if (Array.isArray(data)) {
    const first = data[0];
    const firstKeys = first && typeof first === "object" ? Object.keys(first) : [];
    return { type: "array", length: data.length, firstKeys };
  }
  if (typeof data === "object") {
    return { type: "object", keys: Object.keys(data).slice(0, 50) };
  }
  return { type: typeof data };
}

function mapOffer(offer: HasOffersOffer, idx: number, provider: string, networkId?: string) {
  const offerCore = offer.Offer || offer?.AffiliateOffer?.Offer || undefined;
  const offerId = offer.offer_id ?? offerCore?.id ?? offer.id ?? `offer-${idx}`;
  
  // Get original data for processing
  const originalName = offer.name || offerCore?.name || offer.title || "Untitled Offer";
  const originalDescription = offer.description || offerCore?.description || "";
  
  // Auto-generate countries if missing
  let countries = "";
  if (Array.isArray(offer.countries) && offer.countries.length > 0) {
    countries = offer.countries.join(", ");
  } else if (offer.country) {
    countries = offer.country;
  } else {
    // Auto-detect countries from name and description
    countries = detectCountries(originalName, originalDescription);
  }
  
  // Detect vertical/category
  const vertical = detectVertical(originalName, originalDescription);
  const category = detectCategory(originalName, originalDescription);
  
  // Process name to remove country and shorten
  const processedName = processName(originalName, countries.split(", ")[0]);
  
  // Get URLs
  const previewUrl = offer.preview_url || offer.default_offer_url || offer.offer_url || offer.url || "";
  
  // Generate tracking URL using network-specific generator
  let trackingUrl = offer.tracking_url || offer.url || previewUrl;
  console.log(`Tracking URL generation for offer "${originalName}":`, {
    networkId: networkId,
    offerId: offerId.toString(),
    originalTrackingUrl: offer.tracking_url,
    originalUrl: offer.url,
    previewUrl: previewUrl,
    initialTrackingUrl: trackingUrl
  });
  
  if (networkId && NETWORK_CONFIGS[networkId as keyof typeof NETWORK_CONFIGS]) {
    trackingUrl = generateTrackingLink(networkId, offerId.toString());
    console.log(`Generated tracking URL:`, trackingUrl);
  } else {
    console.log(`Network ID "${networkId}" not found in NETWORK_CONFIGS`);
    console.log(`Available networks:`, Object.keys(NETWORK_CONFIGS));
  }
  
  // Get payout - improved extraction from multiple possible fields
  let payoutRaw = 0;
  const payoutFieldNames = [
    'payout',
    'default_payout', 
    'max_payout',
    'min_payout',
    'revenue',
    'price',
    'amount',
    'value',
    'cpa',
    'cpl',
    'cpi',
    'cpc'
  ];
  
  // Check offer object first
  for (const fieldName of payoutFieldNames) {
    const value = (offer as any)[fieldName];
    if (value !== null && value !== undefined && value !== "" && parseFloat(String(value)) > 0) {
      payoutRaw = parseFloat(String(value));
      break;
    }
  }
  
  // Check offerCore object if not found
  if (payoutRaw === 0 && offerCore) {
    for (const fieldName of payoutFieldNames) {
      const value = (offerCore as any)[fieldName];
      if (value !== null && value !== undefined && value !== "" && parseFloat(String(value)) > 0) {
        payoutRaw = parseFloat(String(value));
        break;
      }
    }
  }
  
  // Debug logging for payout extraction
  console.log(`Payout extraction for offer "${originalName}":`, {
    rawPayout: payoutRaw,
    offerFields: payoutFieldNames.map(name => ({ [name]: (offer as any)[name] })),
    offerCoreFields: offerCore ? payoutFieldNames.map(name => ({ [name]: (offerCore as any)[name] })) : []
  });
  
  // Detect devices
  const devices = detectDevices(offer);
  
  // Generate traffic sources
  const trafficSources = generateTrafficSources(vertical);
  
  // Get image URL with fallback
  const imageUrl = getImageUrl(offer, vertical);

  return {
    offer_id: offerId.toString(),
    title: processedName,
    description: originalDescription || `Auto-generated description for ${processedName}`,
    payout: Number.parseFloat(String(payoutRaw)) || 0,
    currency: offer.currency || offerCore?.currency || "USD",
    url: previewUrl, // Regular URL for offer landing page
    tracking_url: trackingUrl, // Tracking URL with affiliate parameters
    preview_url: previewUrl,
    countries: countries,
    allowed_countries: countries,
    vertical: vertical,
    category: category,
    platform: devices.join(", "), // Database expects platform as string
    device: devices.join(", "), // Database expects device as string
    devices: devices.join(", "), // Database expects devices as string
    traffic_sources: trafficSources.join(", "), // Database expects as string
    image_url: imageUrl,
    status: "pending",
    provider,
    source: "api",
    network_id: networkId, // Store the network_id from the import form
    is_public: true, // Default to public
    updated_at: new Date().toISOString(),
    // Add approval fields with default values
    approval_status: "pending",
    approved_date: null,
    approved_by: null,
    rejection_reason: "",
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  const headers = { ...corsHeaders };

  try {
    const body = (await req.json()) as Partial<HasOffersRequest>;
    const action = body.action;
    const networkId = (body.network_id || "").trim();
    const apiKey = (body.api_key || "").trim();
    const provider = (body.provider || "HasOffers").trim();
    const limit = Math.max(1, Math.min(5000, body.limit ?? 500));

    if (!action || !["test", "preview", "import"].includes(action)) {
      return json(headers, 400, { success: false, error: "Invalid action" });
    }
    if (!networkId) {
      return json(headers, 400, { success: false, error: "Network ID is required" });
    }
    if (!apiKey) {
      return json(headers, 400, { success: false, error: "API Key is required" });
    }

    const candidates = buildHasOffersUrlCandidates(networkId);

    const attempts: Array<{ url: string; params: Record<string, string> }> = [];
    for (const baseUrl of candidates) {
      attempts.push({
        url: baseUrl,
        params: {
          NetworkId: networkId,
          api_key: apiKey,
          Target: "Affiliate_Offer",
          Method: "findMyOffers",
          limit: String(limit),
        },
      });

      // Some Tune setups require explicit filters/fields
      attempts.push({
        url: baseUrl,
        params: {
          NetworkId: networkId,
          api_key: apiKey,
          Target: "Affiliate_Offer",
          Method: "findMyOffers",
          fields: "Offer.id,Offer.name,Offer.description,Offer.payout,Offer.currency,Offer.status",
          limit: String(limit),
        },
      });

      // Another common method name in some HasOffers/Tune installs
      attempts.push({
        url: baseUrl,
        params: {
          NetworkId: networkId,
          api_key: apiKey,
          Target: "Offer",
          Method: "findAll",
          ids: "",
        },
      });
    }

    let payload: any = null;
    let used: { url: string; params: Record<string, string> } | null = null;
    let offers: HasOffersOffer[] = [];
    try {
      const fetched = await fetchAllHasOffersOffers(attempts, limit);
      payload = fetched.payload;
      used = fetched.used;
      offers = fetched.offers as HasOffersOffer[];
    } catch (e: any) {
      return json(headers, 400, { success: false, error: e?.message || String(e) });
    }

    if (action === "test") {
      return json(headers, 200, {
        success: true,
        message: "Connection successful",
        count: offers.length,
      });
    }

    const transformedOffers = offers.map((offer, idx) => mapOffer(offer, idx, provider, networkId));

    if (action === "preview") {
      return json(headers, 200, {
        success: true,
        offers: transformedOffers,
        count: transformedOffers.length,
        debug: transformedOffers.length === 0
          ? {
              used_url: used?.url || null,
              used_params: used ? {
                ...used.params,
                api_key: "***",
              } : null,
              response_keys: Object.keys(payload?.response || {}),
              data_shape: summarizeDataShape(payload?.response?.data),
              errorMessage: payload?.response?.errorMessage || null,
            }
          : undefined,
      });
    }

    // import
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://gyafunimpnzctpfbqkgm.supabase.co";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5YWZ1bmltcG56Y3RwZmJxa2dtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDc2NzI1NiwiZXhwIjoyMDg2MzQzMjU2fQ.pBfkSsN_x5-tfm-y2W6yBiKc9nDnkL_AkYt4k5f3dY8";
    
    console.log('Environment check:');
    console.log('SUPABASE_URL exists:', !!supabaseUrl);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseServiceRole);
    
    if (!supabaseUrl || !supabaseServiceRole) {
      console.error('Missing environment variables');
      return json(headers, 500, { success: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    let imported = 0;
    let updated = 0;
    let failed = 0;
    const errorSamples: Array<{ offer_id: string; error: string }> = [];

    // Use offers from frontend if provided, otherwise use fetched offers
    const rawOffers = body.offers || transformedOffers;
    const importOptions = body.import_options || {
      skipDuplicates: true,
      updateExisting: true,
      autoActivate: true,
      showInOfferwall: true,
    };

    // Sanitize each offer before touching the DB.  We need to drop any
    // properties that correspond to UUID columns (id, import_batch_id, etc.)
    // because sending the string "undefined" triggers a Postgres error.
    // Also remove any leftover audit fields.
    const offersToImport = rawOffers.map((o: any) => {
      const sanitized: Record<string, any> = { ...o };
      ["id", "import_batch_id", "created_at", "updated_at"].forEach((k) => {
        if (Object.prototype.hasOwnProperty.call(sanitized, k)) {
          console.log(`dropping field ${k} from offer ${sanitized.offer_id}`);
          delete sanitized[k];
        }
      });

      // Also strip any property where the value is the literal string "undefined"
      for (const key of Object.keys(sanitized)) {
        const val = sanitized[key];
        if (typeof val === "string" && val.trim().toLowerCase() === "undefined") {
          console.log(`removing undefined-string field ${key} from offer ${sanitized.offer_id}`);
          delete sanitized[key];
        }
      }

      return sanitized;
    });

    // debug: show sanitized samples so we can verify bad keys are gone
    console.log('Sanitized sample offers:', offersToImport.slice(0,3));

    console.log(`Importing ${offersToImport.length} offers for provider: ${provider}`);
    console.log(`Import options:`, importOptions);
    console.log(`First offer sample:`, offersToImport[0]);
    
    // Log only first few offers to avoid spam
    console.log(`Sample offer IDs:`, offersToImport.slice(0, 5).map(o => o.offer_id));
    
    // Check what's already in the database for this provider
    const { data: existingOffers, error: checkAllError } = await supabase
      .from("offers")
      .select("offer_id, title, provider")
      .eq("provider", provider)
      .limit(10);
    
    console.log(`Existing offers for provider ${provider}:`, existingOffers);
    console.log(`Check all error:`, checkAllError);

    for (let i = 0; i < offersToImport.length; i++) {
      const offer = offersToImport[i];

      // Log only first few iterations
      if (i < 3) {
        console.log(`Processing offer ${i + 1}/${offersToImport.length}: ${offer.offer_id}`);
      }

      try {
        // Ensure required fields are present
        if (!offer.offer_id || !offer.title) {
          failed++;
          errorSamples.push({
            offer_id: offer.offer_id || "unknown",
            error: "Missing required fields: offer_id or title",
          });
          continue;
        }

        // Check if offer already exists in DB
        const { data: existing, error: checkError } = await supabase
          .from("offers")
          .select("id")
          .eq("offer_id", offer.offer_id)
          .eq("provider", provider)
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // any error other than "not found" is fatal for this offer
          console.error(`Error querying offer ${offer.offer_id}:`, checkError);
          failed++;
          if (errorSamples.length < 10) {
            errorSamples.push({
              offer_id: offer.offer_id,
              error: `Database check error: ${checkError.message}`,
            });
          }
          continue;
        }

        if (existing) {
          // offer already exists
          console.log(`Found existing offer ${offer.offer_id} with ID ${existing.id}`);
          
          if (importOptions.updateExisting) {
            console.log(`Updating existing offer ${offer.offer_id}`);
            const updateData = {
              title: offer.title,
              description: offer.description,
              payout: offer.payout,
              currency: offer.currency,
              url: offer.url,
              image_url: offer.image_url,
              status: "pending",
              countries: offer.countries,
              network_id: networkId, // Include network_id in update
              is_public: importOptions.showInOfferwall,
              updated_at: new Date().toISOString(),
            };

            const { error: upsertError } = await supabase
              .from("offers")
              .update(updateData)
              .eq("id", existing.id);

            if (upsertError) {
              console.error(`Error updating offer ${offer.offer_id}:`, upsertError, "updateData", updateData);
              failed++;
              if (errorSamples.length < 10) {
                errorSamples.push({
                  offer_id: offer.offer_id,
                  error: `${upsertError.message} (Code: ${upsertError.code})`,
                });
              }
              continue;
            }

            console.log(`Successfully updated offer ${offer.offer_id}`);
            updated++;
          } else {
            console.log(`Skipping existing offer ${offer.offer_id} (skipDuplicates enabled)`);
            continue;
          }
        } else {
          // insert new offer
          console.log(`Inserting new offer ${offer.offer_id}`);
          const insertData = {
            ...offer,
            network_id: networkId, // Include network_id in insert
            is_public: importOptions.showInOfferwall,
            status: "pending",
          };

          const { error: upsertError } = await supabase
            .from("offers")
            .upsert(insertData, { onConflict: "offer_id,provider" });

          if (upsertError) {
            // if unique constraint not present, fall back to plain insert
            const msg = String(upsertError.message || "").toLowerCase();
            if (msg.includes("on conflict") && msg.includes("no unique")) {
              console.warn(`Upsert failed due to missing unique index; attempting simple insert for ${offer.offer_id}`);
              const { error: insError } = await supabase
                .from("offers")
                .insert(insertData);
              if (insError) {
                console.error(`Fallback insert failed for offer ${offer.offer_id}:`, insError);
                failed++;
                if (errorSamples.length < 10) {
                  errorSamples.push({
                    offer_id: offer.offer_id,
                    error: `${insError.message} (Code: ${insError.code})`,
                  });
                }
                continue;
              }
              console.log(`Successfully inserted offer ${offer.offer_id} (fallback)`);
              imported++;
              continue;
            }

            console.error(`Error inserting offer ${offer.offer_id}:`, upsertError, "payload", insertData);
            failed++;
            if (errorSamples.length < 10) {
              errorSamples.push({
                offer_id: offer.offer_id,
                error: `${upsertError.message} (Code: ${upsertError.code})`,
              });
            }
            continue;
          }

          console.log(`Successfully inserted offer ${offer.offer_id}`);
          imported++;
        }
      } catch (error) {
        console.error(`Unexpected error processing offer ${offer.offer_id}:`, error);
        failed++;
        if (errorSamples.length < 10) {
          errorSamples.push({
            offer_id: offer.offer_id,
            error: `Unexpected error: ${String(error)}`,
          });
        }
      }
    }

    console.log(`Import completed: ${imported} imported, ${updated} updated, ${failed} failed`);
    
    if (failed > 0) {
      console.log('Error samples:', errorSamples.slice(0, 3));
    }

    return json(headers, 200, {
      success: true,
      message: "Import complete",
      imported,
      updated,
      failed,
      total: offersToImport.length,
      debug: {
        used_url: used?.url || null,
        provider,
        error_samples: errorSamples.length ? errorSamples : undefined,
        sample_errors: errorSamples.slice(0, 3), // Show first 3 errors for debugging
      },
    });
  } catch (error: any) {
    console.error("HasOffers import-offers error:", error);
    return json({ ...corsHeaders }, 500, {
      success: false,
      error: error?.message || "Internal server error",
    });
  }
});
