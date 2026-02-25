// Utility functions for bulk offer imports

/**
 * Generate offer image using Pexels API (real photos)
 * Based on offer name, description, category and vertical
 * 
 * Get your free Pexels API key at: https://www.pexels.com/api/
 * Add VITE_PEXELS_API_KEY to your .env file
 */
export async function generateOfferImage(
  offerName: string,
  description: string | undefined,
  category: string | undefined,
  vertical: string | undefined
): Promise<string> {
  try {
    // Build search query from offer details
    const searchTerms: string[] = [];
    
    // Add category/vertical first (most relevant)
    if (category && category !== "GENERAL") {
      searchTerms.push(category.toLowerCase());
    }
    if (vertical && vertical !== "Other") {
      searchTerms.push(vertical.toLowerCase());
    }
    
    // Add key words from title (first 2-3 words for better results)
    const titleWords = offerName.split(/\s+/).slice(0, 3);
    searchTerms.push(...titleWords);
    
    // Create search query
    const searchQuery = searchTerms.join(" ").trim();
    
    // Check for Pexels API key
    const pexelsApiKey = import.meta.env.VITE_PEXELS_API_KEY;
    
    if (pexelsApiKey) {
      // Use Pexels API for real images
      const pexelsResponse = await fetch(
        `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchQuery)}&per_page=1&orientation=landscape`,
        {
          headers: {
            Authorization: pexelsApiKey,
          },
        }
      );
      
      if (pexelsResponse.ok) {
        const pexelsData = await pexelsResponse.json();
        if (pexelsData.photos && pexelsData.photos.length > 0) {
          // Return the large2x URL for quality, or medium for performance
          return pexelsData.photos[0].src.large2x || pexelsData.photos[0].src.medium;
        }
      }
    }
    
    // Fallback: Try using a free image service that doesn't require API key
    // Using picsum.photos with a seed for consistent images based on offer name
    const seed = offerName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const hash = seed.split("").reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    const imageId = Math.abs(hash) % 1000;
    
    // Use Lorem Picsum for real photos (free, no API key needed)
    // Size 600x400 for good quality
    return `https://picsum.photos/seed/${imageId}/600/400`;
    
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Ultimate fallback: Generate a colored placeholder with text
    // Create a consistent color based on the offer name
    const colors = ["3B82F6", "10B981", "F59E0B", "EF4444", "8B5CF6", "EC4899", "06B6D4", "84CC16"];
    const colorIndex = Math.abs(
      offerName.split("").reduce((a, b) => {
        a = ((a << 5) - a) + b.charCodeAt(0);
        return a & a;
      }, 0)
    ) % colors.length;
    
    return `https://placehold.co/600x400/${colors[colorIndex]}/FFFFFF?text=${encodeURIComponent(offerName.substring(0, 20))}`;
  }
}

/**
 * Auto-generate traffic source based on platform and offer name
 * Also generates from offer name/description if blank
 */
export function generateTrafficSource(
  platform: string | undefined,
  offerName: string,
  description?: string | undefined
): string {
  // First try to detect from offer name/description
  const fullText = `${offerName} ${description || ""}`.toLowerCase();
  
  // Detect from keywords in offer name/description
  if (fullText.includes("social") || fullText.includes("facebook") || 
      fullText.includes("instagram") || fullText.includes("tiktok") ||
      fullText.includes("twitter") || fullText.includes("linkedin")) {
    return "Social Media";
  }
  if (fullText.includes("email") || fullText.includes("mail") || fullText.includes("newsletter")) {
    return "Email";
  }
  if (fullText.includes("push") || fullText.includes("notification")) {
    return "Push Notifications";
  }
  if (fullText.includes("referral") || fullText.includes("invite") || fullText.includes("friend")) {
    return "Referral";
  }
  
  // Fall back to platform-based detection
  const sources = ["Social Media", "Email", "Push Notifications", "Direct", "Referral"];

  if (!platform) {
    return sources[Math.floor(Math.random() * sources.length)];
  }

  const lowerPlatform = platform.toLowerCase();
  if (lowerPlatform.includes("web")) return "Direct";
  if (lowerPlatform.includes("ios") || lowerPlatform.includes("android"))
    return "Push Notifications";

  return sources[Math.floor(Math.random() * sources.length)];
}

/**
 * Auto-detect device type from offer name and description
 */
export function detectDevice(offerName: string, description: string | undefined): string {
  const fullText = `${offerName} ${description || ""}`.toLowerCase();
  
  // Check for mobile-specific keywords
  const mobileKeywords = ["mobile", "app", "ios", "android", "smartphone", "iphone", "android phone", "cell"];
  if (mobileKeywords.some(keyword => fullText.includes(keyword))) {
    return "mobile";
  }
  
  // Check for desktop-specific keywords
  const desktopKeywords = ["desktop", "pc", "computer", "laptop", "web", "browser"];
  if (desktopKeywords.some(keyword => fullText.includes(keyword))) {
    return "desktop";
  }
  
  // Check for tablet-specific keywords
  const tabletKeywords = ["tablet", "ipad", "android tablet"];
  if (tabletKeywords.some(keyword => fullText.includes(keyword))) {
    return "tablet";
  }
  
  // Default to mobile if no match (most common)
  return "mobile";
}

/**
 * Auto-detect platform from offer name and description
 */
export function detectPlatform(offerName: string, description: string | undefined): string {
  const fullText = `${offerName} ${description || ""}`.toLowerCase();
  
  // Check for iOS
  if (fullText.includes("ios") || fullText.includes("iphone") || fullText.includes("ipad")) {
    return "ios";
  }
  
  // Check for Android
  if (fullText.includes("android") || fullText.includes("google play")) {
    return "android";
  }
  
  // Check for Web
  if (fullText.includes("web") || fullText.includes("desktop") || fullText.includes("pc") || 
      fullText.includes("browser") || fullText.includes("online")) {
    return "web";
  }
  
  // Check for both (cross-platform)
  if (fullText.includes("cross-platform") || fullText.includes("multi-platform")) {
    return "ios,android,web";
  }
  
  // Default to web if no match
  return "web";
}

/**
 * Simplify/truncate long offer names for display
 */
export function simplifyName(name: string, maxLength: number = 50): string {
  if (!name || name.length <= maxLength) return name;
  
  // Try to truncate at word boundary
  const truncated = name.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  
  if (lastSpace > maxLength * 0.7) {
    return truncated.substring(0, lastSpace) + "...";
  }
  
  return truncated + "...";
}

/**
 * Auto-detect vertical category from offer name and description
 */
export function detectVertical(offerName: string, description: string | undefined): string {
  const name = offerName.toLowerCase();
  const desc = (description || "").toLowerCase();
  const fullText = `${name} ${desc}`;

  const verticals: { [key: string]: string[] } = {
    Finance: ["bank", "loan", "credit", "mortgage", "investment", "trading", "forex"],
    Gaming: ["game", "casino", "slot", "poker", "bet", "play", "esport"],
    Dating: ["dating", "dating app", "single", "match", "romantic"],
    Shopping: ["shop", "store", "retail", "amazon", "ebay", "ecommerce"],
    Health: ["health", "medical", "doctor", "fitness", "diet", "wellness"],
    Education: ["course", "learn", "school", "university", "training"],
    "Real Estate": ["property", "house", "apartment", "real estate", "rent", "buy"],
    Travel: ["travel", "hotel", "flight", "booking", "vacation"],
    Utilities: ["vpn", "antivirus", "software", "cloud", "storage"],
    Content: ["movie", "music", "streaming", "subscription"],
  };

  for (const [vertical, keywords] of Object.entries(verticals)) {
    if (keywords.some((keyword) => fullText.includes(keyword))) {
      return vertical;
    }
  }

  return "Other";
}

/**
 * Auto-detect category from offer name and description
 */
export function detectCategory(offerName: string, description: string | undefined): string {
  const vertical = detectVertical(offerName, description);

  const categoryMap: { [key: string]: string } = {
    Finance: "FINANCE",
    Gaming: "GAMING",
    Dating: "DATING",
    Shopping: "SHOPPING",
    Health: "HEALTH",
    Education: "EDUCATION",
    "Real Estate": "REAL_ESTATE",
    Travel: "TRAVEL",
    Utilities: "UTILITIES",
    Content: "CONTENT",
    Other: "GENERAL",
  };

  return categoryMap[vertical] || "GENERAL";
}

/**
 * Auto-detect countries from offer name and description
 */
export function detectCountries(offerName: string, description: string | undefined): string {
  const name = (offerName || "").toLowerCase();
  const desc = (description || "").toLowerCase();
  const fullText = `${name} ${desc}`;

  // Country detection patterns
  const countryPatterns: { [key: string]: RegExp[] } = {
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
      if (pattern.test(fullText)) {
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

/**
 * Auto-fill missing offer data based on existing data
 * Now includes auto-detection of device and platform from name/description
 */
export function autoFillOfferData(offer: any): any {
  // Auto-detect device and platform from title/description if not provided
  const detectedDevice = !offer.device && !offer.devices ? detectDevice(offer.title, offer.description) : "";
  const detectedPlatform = !offer.platform ? detectPlatform(offer.title, offer.description) : "";
  
  // Auto-generate countries if missing
  let countries = offer.countries || offer.country || "";
  if (!countries) {
    countries = detectCountries(offer.title, offer.description);
  }
  
  // Auto-detect vertical and category
  const vertical = offer.vertical || detectVertical(offer.title, offer.description);
  const category = offer.category || detectCategory(offer.title, offer.description);
  
  return {
    // Required fields
    title: offer.title || "",
    url: offer.url || "",
    preview_url: offer.preview_url || "",
    tracking_url: offer.tracking_url || "",
    payout: offer.payout ? Number(offer.payout) : 0,
    currency: offer.currency || "USD",
    
    // Optional fields with defaults and auto-detection
    offer_id: offer.offer_id || "",
    description: offer.description || `Auto-generated description for ${offer.title || "offer"}`,
    countries: countries,
    allowed_countries: countries,
    platform: offer.platform || detectedPlatform,
    device: offer.device || detectedDevice,
    devices: offer.devices || offer.device || detectedDevice,
    image_url: offer.image_url || "",
    traffic_sources: offer.traffic_sources || generateTrafficSource(offer.platform, offer.title, offer.description),
    vertical: vertical,
    category: category,
    payout_model: offer.payout_model || "CPA",
    percent: offer.percent ? Number(offer.percent) : 0,
    expiry_date: offer.expiry_date || offer.expiry || null,
    non_access_url: offer.non_access_url || "",
    status: offer.status || "active",
    is_public: offer.is_public === "false" || offer.is_public === "0" || offer.is_public === false ? false : true,
    
    // Approval fields
    approval_status: offer.approval_status || "pending",
    approved_date: offer.approved_date || null,
    approved_by: offer.approved_by || null,
    rejection_reason: offer.rejection_reason || "",
  };
}

/**
 * Validate offer data - super lenient version for bulk imports
 * Always returns valid=true to allow all offers through
 */
export function validateOfferData(offer: any): { valid: boolean; errors: string[] } {
  // Auto-fix all issues and always return valid=true
  
  // Fix title - use a default if missing
  if (!offer.title || !String(offer.title).trim()) {
    offer.title = "Untitled Offer";
  } else {
    offer.title = String(offer.title).trim();
  }

  // Auto-fix URL if missing or invalid
  if (!offer.url || !String(offer.url).trim()) {
    offer.url = "https://example.com/offer";
  } else {
    try { 
      new URL(String(offer.url)); 
    } catch { 
      offer.url = "https://example.com/offer"; 
    }
  }

  // Auto-fix payout
  const payoutNum = Number(offer.payout);
  offer.payout = isNaN(payoutNum) ? 0 : payoutNum;

  // Auto-fix currency
  const currency = String(offer.currency || "USD").toUpperCase();
  const validCurrencies = ["USD", "EUR", "INR", "GBP"];
  offer.currency = validCurrencies.includes(currency) ? currency : "USD";

  // Auto-fix payout model
  const model = String(offer.payout_model || "CPA").toUpperCase();
  const validModels = ["CPA", "CPL", "CPI", "CPC"];
  offer.payout_model = validModels.includes(model) ? model : "CPA";

  // Auto-fix percent
  const percentNum = Number(offer.percent);
  offer.percent = isNaN(percentNum) ? 0 : percentNum;

  // Ensure status
  offer.status = offer.status || "active";

  // Ensure is_public
  offer.is_public = offer.is_public !== false && offer.is_public !== "false" && offer.is_public !== "0";

  // Clear invalid optional URLs
  if (offer.preview_url) {
    try { new URL(String(offer.preview_url)); } catch { offer.preview_url = ""; }
  }
  if (offer.non_access_url) {
    try { new URL(String(offer.non_access_url)); } catch { offer.non_access_url = ""; }
  }

  return { valid: true, errors: [] };
}

/**
 * Parse Google Sheets data from URL
 * Extracts the sheet ID from the URL and fetches as CSV
 */
export async function parseGoogleSheet(sheetUrl: string): Promise<any[]> {
  try {
    // Extract sheet ID from URL
    // Format: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit#gid=0
    // Or: https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv
    
    const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new Error("Invalid Google Sheets URL");
    }
    
    const sheetId = match[1];
    
    // Export as CSV using Google's export feature
    const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
    
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch Google Sheet");
    }
    
    const csvText = await response.text();
    
    // Parse the CSV text
    return parseCSVText(csvText);
  } catch (error) {
    console.error("Error parsing Google Sheet:", error);
    throw error;
  }
}

/**
 * Parse CSV text (not from file)
 */
export function parseCSVText(text: string): any[] {
  const lines = text.split("\n");
  
  // Handle headers with possible spaces and special characters
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/[\s"']/g, ""));

  const data = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      // Simple CSV parsing (handles basic cases, not complex quoted values)
      const values: string[] = [];
      let current = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === "," && !insideQuotes) {
          values.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^"|"$/g, ""));

      const obj: any = {};
      headers.forEach((header, index) => {
        const normalizedHeader = normalizeHeader(header);
        obj[normalizedHeader] = values[index] || "";
      });

      return obj;
    });

  return data;
}

/**
 * Parse CSV data from file or text
 */
export async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n");
        
        // Handle headers with possible spaces and special characters
        const headers = lines[0]
          .split(",")
          .map((h) => h.trim().toLowerCase().replace(/[\s"']/g, ""));

        const data = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            // Simple CSV parsing (handles basic cases, not complex quoted values)
            const values: string[] = [];
            let current = "";
            let insideQuotes = false;

            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === "," && !insideQuotes) {
                values.push(current.trim().replace(/^"|"$/g, ""));
                current = "";
              } else {
                current += char;
              }
            }
            values.push(current.trim().replace(/^"|"$/g, ""));

            const obj: any = {};
            headers.forEach((header, index) => {
              const normalizedHeader = normalizeHeader(header);
              obj[normalizedHeader] = values[index] || "";
            });

            return obj;
          });

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/**
 * Normalize CSV header to database column names
 */
function normalizeHeader(header: string): string {
  const headerMap: { [key: string]: string } = {
    offerid: "offer_id",
    title: "title",
    url: "url",
    country: "countries",
    payout: "payout",
    description: "description",
    platform: "platform",
    previewurl: "preview_url",
    vertical: "vertical",
    device: "device",
    imageurl: "image_url",
    trafficsources: "traffic_sources",
    expiry: "expiry_date",
    devices: "devices",
    nonaccessurl: "non_access_url",
    allowedcountries: "allowed_countries",
    payoutmodel: "payout_model",
    currency: "currency",
    percent: "percent",
    category: "category",
    ispublic: "is_public",
    status: "status",
  };

  return headerMap[header] || header;
}

/**
 * Export offers to CSV with all columns in the specified order
 */
export function offersToCsv(offers: any[]): string {
  if (offers.length === 0) return "";

  // Column order as specified by user
  const columnOrder = [
    "offer_id",
    "title",
    "url",
    "countries",
    "payout",
    "description",
    "platform",
    "preview_url",
    "vertical",
    "device",
    "image_url",
    "traffic_sources",
    "expiry_date",
    "devices",
    "non_access_url",
    "allowed_countries",
    "payout_model",
    "currency",
    "percent",
    "category",
    "is_public",
    "status",
  ];

  const csv = [
    columnOrder.join(","),
    ...offers.map((offer) =>
      columnOrder
        .map((header) => {
          const value = offer[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value === undefined || value === null ? "" : String(value);
        })
        .join(",")
    ),
  ];

  return csv.join("\n");
}

/**
 * Download CSV file
 */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Normalize offer data for comparison
 * Handles country field normalization for duplicate detection
 */
export function normalizeOfferForComparison(offer: any): any {
  // Handle country - could be in 'countries' or 'country' field
  // Also normalize comma-separated countries to sorted array for comparison
  const rawCountry = offer.country || offer.countries || "";
  const normalizedCountry = rawCountry.toLowerCase().trim();
  
  return {
    title: (offer.title || "").toLowerCase().trim(),
    description: (offer.description || "").toLowerCase().trim(),
    country: normalizedCountry,
    // Also store the raw countries for exact matching
    countriesRaw: rawCountry,
    platform: (offer.platform || "").toLowerCase().trim(),
    payout: Number(offer.payout) || 0,
    offer_id: (offer.offer_id || "").toLowerCase().trim(),
  };
}

/**
 * Generate CSV template for users to fill in
 */
export function generateImportTemplate(): string {
  const headers = [
    "offer_id",
    "title",
    "url",
    "country",
    "payout",
    "description",
    "platform",
    "preview_url",
    "vertical",
    "device",
    "image_url",
    "traffic_sources",
    "expiry",
    "devices",
    "non_access_url",
    "allowed_countries",
    "payout_model",
    "currency",
    "percent",
  ];

  const exampleRows = [
    [
      "OFF-001",
      "Gaming App X",
      "https://example.com/game",
      "US,UK,CA",
      "10",
      "Casual gaming app with rewards",
      "ios",
      "https://example.com/game/preview",
      "Gaming",
      "mobile",
      "https://api.dicebear.com/7.x/icons/svg?seed=gaming",
      "Push Notifications",
      "2026-12-31",
      "mobile",
      "https://example.com/game/blocked",
      "US,UK,CA",
      "CPA",
      "USD",
      "0",
    ],
    [
      "OFF-002",
      "Finance Loan",
      "https://example.com/loan",
      "US",
      "25",
      "Quick loan approval app",
      "web",
      "https://example.com/loan/preview",
      "Finance",
      "desktop",
      "https://api.dicebear.com/7.x/icons/svg?seed=finance",
      "Direct",
      "2026-12-31",
      "desktop",
      "https://example.com/loan/blocked",
      "US",
      "CPL",
      "USD",
      "5",
    ],
  ];

  const rows = [
    headers.join(","),
    ...exampleRows.map((row) => row.map((cell) => (cell.includes(",") ? `"${cell}"` : cell)).join(",")),
  ];

  return rows.join("\n");
}

/**
 * Download CSV template
 */
export function downloadTemplate(): void {
  const template = generateImportTemplate();
  downloadCsv(template, "offers-import-template.csv");
}
