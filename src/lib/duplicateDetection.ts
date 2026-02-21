import { supabase } from "@/integrations/supabase/client";
import { normalizeOfferForComparison } from "./bulkImportUtils";

export interface DuplicateMatch {
  existingOfferId: string;
  existingOfferData: any;
  matchingFields: string[];
  matchScore: number; // 0-100
  isCriticalMatch: boolean; // If true, it's definitely a duplicate
}

/**
 * Check if an offer already exists in the database
 * Matches on multiple criteria: name, description, country, platform
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

      // Only consider as duplicate if ALL 4 criteria match (strict mode)
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

    // Only return if match is critical (ALL 4 criteria matched)
    return bestMatch && bestMatch.isCriticalMatch ? bestMatch : null;
  } catch (error) {
    console.error("Error in checkOfferDuplicate:", error);
    return null;
  }
}

/**
 * Compare two normalized offers and return match score
 * STRICT MODE: ALL 3 criteria must match for a duplicate to be detected
 * - offer_id (serial number)
 * - country
 * - title (name)
 * 
 * Description is NOT checked for duplicate detection anymore
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

  // Check offer_id match (serial number)
  const offerIdMatch = !!(
    newOffer.offer_id &&
    existingOffer.offer_id &&
    newOffer.offer_id.trim() !== "" &&
    newOffer.offer_id === existingOffer.offer_id
  );
  if (offerIdMatch) {
    matchingFields.push("offer_id");
    score += 33.33;
  }

  // Check title match (offer name)
  const titleMatch = !!(
    newOffer.title &&
    existingOffer.title &&
    compareStrings(newOffer.title, existingOffer.title) > 0.8
  );
  if (titleMatch) {
    matchingFields.push("title");
    score += 33.33;
  }

  // Check country match
  const countryMatch = !!(
    newOffer.country &&
    existingOffer.country &&
    newOffer.country.trim() !== "" &&
    newOffer.country === existingOffer.country
  );
  if (countryMatch) {
    matchingFields.push("country");
    score += 33.33;
  }

  // Description is NOT checked for duplicate detection anymore
  // Platform match (optional - not required for strict duplicate detection)
  if (
    newOffer.platform &&
    existingOffer.platform &&
    newOffer.platform === existingOffer.platform
  ) {
    matchingFields.push("platform");
    score += 5;
  }

  // Payout match (optional - not required for strict duplicate detection)
  if (
    newOffer.payout &&
    existingOffer.payout &&
    Math.abs(newOffer.payout - existingOffer.payout) / existingOffer.payout < 0.1
  ) {
    matchingFields.push("payout");
    score += 5;
  }

  // STRICT MODE: ALL 3 criteria must match for duplicate to be detected
  // This means: offer_id AND title AND country ALL must match
  const allCriteriaMatched = offerIdMatch && titleMatch && countryMatch;

  // isCritical is true only when ALL 3 required criteria match
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
