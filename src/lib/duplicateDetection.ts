import { supabase } from "@/integrations/supabase/client";

export interface DuplicateMatch {
  existingOfferId: string;
  existingOfferData: any;
  matchingFields: string[];
  matchScore: number; // 0-100
  isCriticalMatch: boolean; // If true, it's definitely a duplicate
}

/**
 * Normalize offer data for comparison
 * Handles country field normalization and device for duplicate detection
 */
function normalizeOfferForComparison(offer: any): any {
  // Handle country - could be in 'countries' or 'country' field
  // Normalize comma-separated countries to sorted array for comparison
  const rawCountry = offer.country || offer.countries || "";
  
  // Handle device - could be 'device' or 'devices' field
  const rawDevice = offer.device || offer.devices || "";
  
  return {
    title: (offer.title || "").toLowerCase().trim(),
    description: (offer.description || "").toLowerCase().trim(),
    country: rawCountry.toLowerCase().trim(),
    countriesRaw: rawCountry,
    // Normalize countries to sorted array for comparison
    countriesArray: rawCountry.split(",").map((c: string) => c.trim().toLowerCase()).sort(),
    platform: (offer.platform || "").toLowerCase().trim(),
    payout: Number(offer.payout) || 0,
    offer_id: (offer.offer_id || "").toLowerCase().trim(),
    device: rawDevice.toLowerCase().trim(),
  };
}

/**
 * Check if an offer already exists in the database
 * Matches on 5 criteria: offer_id, title, device, country, payout
 */
export async function checkOfferDuplicate(
  newOffer: any
): Promise<DuplicateMatch | null> {
  try {
    const {
      data: existingOffers,
      error,
    } = await supabase.from("offers").select("*").eq("status", "active");

    if (error) {
      console.error("Error checking duplicates:", error);
      return null;
    }

    if (!existingOffers || existingOffers.length === 0) {
      return null;
    }

    const normalizedNew = normalizeOfferForComparison(newOffer);

    let bestMatch: DuplicateMatch | null = null;

    for (const existing of existingOffers) {
      const normalizedExisting = normalizeOfferForComparison(existing);
      const matchResult = compareOffers(normalizedNew, normalizedExisting);

      // Only consider as duplicate if ALL 5 criteria match (strict mode)
      if (matchResult && matchResult.allCriteriaMatched && (!bestMatch || matchResult.score > (bestMatch?.matchScore || 0))) {
        bestMatch = {
          existingOfferId: existing.id,
          existingOfferData: existing,
          matchingFields: matchResult.matchingFields,
          matchScore: matchResult.score,
          isCriticalMatch: matchResult.isCritical,
        };
      }
    }

    // Only return if match is critical (ALL 5 criteria matched)
    return bestMatch && bestMatch.isCriticalMatch ? bestMatch : null;
  } catch (error) {
    console.error("Error in checkOfferDuplicate:", error);
    return null;
  }
}

/**
 * Compare two normalized offers and return match score
 * STRICT MODE: ALL 5 criteria must match for a duplicate to be detected
 * - offer_id (exact match)
 * - title (exact match)
 * - device (exact match)
 * - countries (exact match - handle comma-separated)
 * - payout (exact match)
 */
function compareOffers(
  newOffer: any,
  existingOffer: any
): {
  score: number;
  matchingFields: string[];
  isCritical: boolean;
  allCriteriaMatched: boolean;
} | null {
  const matchingFields: string[] = [];
  let score = 0;

  // Each field contributes 20 points (5 fields * 20 = 100)
  const fieldWeight = 20;

  // Check offer_id match (exact match required)
  const offerIdMatch = !!(
    newOffer.offer_id &&
    existingOffer.offer_id &&
    newOffer.offer_id.trim() !== "" &&
    newOffer.offer_id === existingOffer.offer_id
  );
  if (offerIdMatch) {
    matchingFields.push("offer_id");
    score += fieldWeight;
  }

  // Check title match (exact match required)
  const titleMatch = !!(
    newOffer.title &&
    existingOffer.title &&
    newOffer.title.trim() !== "" &&
    newOffer.title === existingOffer.title
  );
  if (titleMatch) {
    matchingFields.push("title");
    score += fieldWeight;
  }

  // Check device match (exact match required)
  const deviceMatch = !!(
    newOffer.device &&
    existingOffer.device &&
    newOffer.device.trim() !== "" &&
    newOffer.device === existingOffer.device
  );
  if (deviceMatch) {
    matchingFields.push("device");
    score += fieldWeight;
  }

  // Check country match (exact match required - handle comma-separated)
  // Compare sorted arrays of countries
  const newCountries = newOffer.countriesArray || [];
  const existingCountries = existingOffer.countriesArray || [];
  
  const countryMatch = !!(
    newCountries.length > 0 &&
    existingCountries.length > 0 &&
    JSON.stringify(newCountries) === JSON.stringify(existingCountries)
  );
  if (countryMatch) {
    matchingFields.push("countries");
    score += fieldWeight;
  }

  // Check payout match (exact match required)
  const payoutMatch = !!(
    newOffer.payout !== undefined &&
    existingOffer.payout !== undefined &&
    newOffer.payout === existingOffer.payout &&
    newOffer.payout > 0
  );
  if (payoutMatch) {
    matchingFields.push("payout");
    score += fieldWeight;
  }

  // STRICT MODE: ALL 5 criteria must match for duplicate to be detected
  // This means: offer_id AND title AND device AND countries AND payout ALL must match
  const allCriteriaMatched = offerIdMatch && titleMatch && deviceMatch && countryMatch && payoutMatch;

  // isCritical is true only when ALL 5 required criteria match
  const isCritical = allCriteriaMatched;

  return {
    score,
    matchingFields,
    isCritical,
    allCriteriaMatched,
  };
}

/**
 * Calculate string similarity using Levenshtein distance
 * Returns value between 0 and 1
 */
function compareStrings(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1;

  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1;

  const editDistance = levenshteinDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];

  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }

  return costs[s2.length];
}

/**
 * Batch check for duplicates
 */
export async function checkBatchDuplicates(
  offers: any[]
): Promise<Map<number, DuplicateMatch>> {
  const duplicates = new Map<number, DuplicateMatch>();

  for (let i = 0; i < offers.length; i++) {
    const match = await checkOfferDuplicate(offers[i]);
    if (match) {
      duplicates.set(i, match);
    }
  }

  return duplicates;
}

/**
 * Log duplicate detection result
 * Note: This function logs to console as the duplicate_detection_logs table may not exist
 * In production, you would create a migration for this table
 */
export async function logDuplicateDetection(
  batchId: string,
  offerName: string,
  matchingOfferId: string | null,
  matchingCriteria: string[],
  action: "skipped" | "merged" | "import_new"
): Promise<void> {
  // Log to console for now - can be extended to database later
  console.log("Duplicate Detection Log:", {
    batchId,
    offerName,
    matchingOfferId,
    matchingCriteria,
    action,
    timestamp: new Date().toISOString(),
  });
  
  // Optionally, you could insert to a table if it exists:
  // try {
  //   await supabase.from("duplicate_detection_logs").insert({
  //     batch_id: batchId,
  //     offer_name: offerName,
  //     matching_offer_id: matchingOfferId,
  //     matching_criteria: matchingCriteria,
  //     action,
  //   } as any);
  // } catch (error) {
  //   console.error("Error logging duplicate detection:", error);
  // }
}

/**
 * Find duplicate offers in the database
 * Groups offers by offer_id + title + device + countries + payout
 * Returns grouped duplicates with list of matching offers
 */
export async function findDuplicateOffers(): Promise<{
  duplicateGroups: Array<{
    key: string;
    offer_id: string;
    title: string;
    device: string;
    countries: string;
    payout: number;
    offers: any[];
  }>;
  totalDuplicates: number;
}> {
  try {
    // Fetch all offers (both active and inactive)
    const { data: allOffers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching offers for duplicate detection:", error);
      return { duplicateGroups: [], totalDuplicates: 0 };
    }

    if (!allOffers || allOffers.length === 0) {
      return { duplicateGroups: [], totalDuplicates: 0 };
    }

    // Group offers by the 5 key fields
    const groups = new Map<string, any[]>();

    for (const offer of allOffers) {
      // Normalize the key fields
      const offerId = (offer.offer_id || "").toLowerCase().trim();
      const title = (offer.title || "").toLowerCase().trim();
      const device = (offer.device || offer.devices || "").toLowerCase().trim();
      const countries = (offer.countries || "").toLowerCase().trim().split(",").map((c: string) => c.trim()).sort().join(",");
      const payout = Number(offer.payout) || 0;

      // Skip offers without required fields
      if (!offerId || !title || !device || !countries) {
        continue;
      }

      const key = `${offerId}|${title}|${device}|${countries}|${payout}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(offer);
    }

    // Filter to only groups with more than 1 offer (actual duplicates)
    const duplicateGroups: Array<{
      key: string;
      offer_id: string;
      title: string;
      device: string;
      countries: string;
      payout: number;
      offers: any[];
    }> = [];

    let totalDuplicates = 0;

    groups.forEach((offers, key) => {
      if (offers.length > 1) {
        const [offer_id, title, device, countries, payoutStr] = key.split("|");
        const payout = Number(payoutStr);
        
        duplicateGroups.push({
          key,
          offer_id,
          title,
          device,
          countries,
          payout,
          offers
        });
        totalDuplicates += offers.length;
      }
    });

    return { duplicateGroups, totalDuplicates };
  } catch (error) {
    console.error("Error in findDuplicateOffers:", error);
    return { duplicateGroups: [], totalDuplicates: 0 };
  }
}
