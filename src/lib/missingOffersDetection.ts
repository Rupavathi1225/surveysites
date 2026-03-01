import { supabase } from "@/integrations/supabase/client";
import { normalizeOfferForComparison } from "./bulkImportUtils";

export interface MissingOfferResult {
  offerName: string;
  description: string;
  country: string;
  platform: string;
  payout: number;
  matchingCriteria: string[];
  isActuallyMissing: boolean;
}

/**
 * Compare uploaded offers with existing inventory
 * Returns which offers from the upload are missing from the system
 */
export async function detectMissingOffers(
  uploadedOffers: any[],
  matchingCriteria: string[] = ["name", "payout", "country", "platform"]
): Promise<{
  missingOffers: MissingOfferResult[];
  foundOffers: any[];
  totalUploaded: number;
}> {
  try {
    const { data: existingOffers, error } = await supabase
      .from("offers")
      .select("*")
      .eq("status", "active");

    if (error) {
      console.error("Error fetching existing offers:", error);
      return { missingOffers: [], foundOffers: [], totalUploaded: uploadedOffers.length };
    }

    const missingOffers: MissingOfferResult[] = [];
    const foundOffers: any[] = [];

    for (const uploadedOffer of uploadedOffers) {
      const normalized = normalizeOfferForComparison(uploadedOffer);
      let found = false;

      for (const existingOffer of existingOffers || []) {
        const normalizedExisting = normalizeOfferForComparison(existingOffer);

        if (offersMatch(normalized, normalizedExisting, matchingCriteria)) {
          found = true;
          foundOffers.push(uploadedOffer);
          break;
        }
      }

      if (!found) {
        missingOffers.push({
          offerName: uploadedOffer.title || "",
          description: uploadedOffer.description || "",
          country: uploadedOffer.country || uploadedOffer.countries || "",
          platform: uploadedOffer.platform || "",
          payout: Number(uploadedOffer.payout) || 0,
          matchingCriteria: matchingCriteria,
          isActuallyMissing: true,
        });
      }
    }

    return {
      missingOffers,
      foundOffers,
      totalUploaded: uploadedOffers.length,
    };
  } catch (error) {
    console.error("Error detecting missing offers:", error);
    return { missingOffers: [], foundOffers: [], totalUploaded: uploadedOffers.length };
  }
}

/**
 * Check if two offers match based on criteria
 */
function offersMatch(
  offer1: any,
  offer2: any,
  criteria: string[]
): boolean {
  for (const criterion of criteria) {
    switch (criterion) {
      case "name":
        if (offer1.title !== offer2.title) return false;
        break;
      case "payout":
        if (offer1.payout !== offer2.payout) return false;
        break;
      case "country":
        if (offer1.country !== offer2.country) return false;
        break;
      case "platform":
        if (offer1.platform !== offer2.platform) return false;
        break;
      case "description":
        if (offer1.description !== offer2.description) return false;
        break;
      case "offer_id":
        if (offer1.offer_id !== offer2.offer_id) return false;
        break;
      default:
        break;
    }
  }
  return true;
}

/**
 * Save missing offers report
 */
export async function saveMissingOffersReport(
  batchId: string,
  reportName: string,
  uploadedOffers: any[],
  missingOffers: MissingOfferResult[],
  matchingCriteria: string[]
): Promise<void> {
  try {
    await (supabase.from("missing_offers_report") as any).insert({
      batch_id: batchId,
      report_name: reportName,
      uploaded_offers: uploadedOffers,
      missing_offers: missingOffers,
      matching_criteria: matchingCriteria,
      report_data: {
        totalUploaded: uploadedOffers.length,
        totalMissing: missingOffers.length,
        totalFound: uploadedOffers.length - missingOffers.length,
        percentage: ((uploadedOffers.length - missingOffers.length) / uploadedOffers.length) * 100,
      },
    });
  } catch (error) {
    console.error("Error saving missing offers report:", error);
  }
}

/**
 * Get missing offers reports
 */
export async function getMissingOffersReports(): Promise<any[]> {
  try {
    const { data, error } = await (supabase.from("missing_offers_report") as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching missing offers reports:", error);
    return [];
  }
}

/**
 * Delete missing offers report
 */
export async function deleteMissingOffersReport(reportId: string): Promise<void> {
  try {
    await (supabase.from("missing_offers_report") as any).delete().eq("id", reportId);
  } catch (error) {
    console.error("Error deleting missing offers report:", error);
  }
}
