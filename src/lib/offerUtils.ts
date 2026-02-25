// Offer utilities for categorization, validation, and data processing

export const categorizeOffer = (offer: any): string => {
  const title = (offer.title || "").toLowerCase();
  const description = (offer.description || "").toLowerCase();
  const content = `${title} ${description}`;
  
  // Finance keywords - expanded
  if (content.includes('finance') || content.includes('loan') || content.includes('credit') || 
      content.includes('bank') || content.includes('investment') || content.includes('insurance') ||
      content.includes('money') || content.includes('payment') || content.includes('crypto') ||
      content.includes('cash') || content.includes('debt') || content.includes('mortgage') ||
      content.includes('trading') || content.includes('forex') || content.includes('wallet') ||
      content.includes('transfer') || content.includes('save') || content.includes('interest') ||
      content.includes('card') || content.includes('account') || content.includes('fund')) {
    return 'FINANCE';
  }
  
  // Gaming keywords - expanded
  if (content.includes('game') || content.includes('gaming') || content.includes('casino') ||
      content.includes('poker') || content.includes('bet') || content.includes('play') ||
      content.includes('slot') || content.includes('roulette') || content.includes('blackjack') ||
      content.includes('lottery') || content.includes('bingo') || content.includes('sportsbook') ||
      content.includes('gamble') || content.includes('wager') || content.includes('jackpot')) {
    return 'Gaming';
  }
  
  // Travel keywords - expanded
  if (content.includes('travel') || content.includes('hotel') || content.includes('flight') ||
      content.includes('vacation') || content.includes('trip') || content.includes('airline') ||
      content.includes('booking') || content.includes('resort') || content.includes('cruise') ||
      content.includes('holiday') || content.includes('ticket') || content.includes('destination') ||
      content.includes('tour') || content.includes('package') || content.includes('car rental') ||
      content.includes('airport') || content.includes('taxi') || content.includes('uber')) {
    return 'TRAVEL';
  }
  
  // Shopping keywords - expanded
  if (content.includes('shop') || content.includes('buy') || content.includes('store') ||
      content.includes('product') || content.includes('deal') || content.includes('discount') ||
      content.includes('sale') || content.includes('purchase') || content.includes('retail') ||
      content.includes('mall') || content.includes('brand') || content.includes('fashion') ||
      content.includes('clothing') || content.includes('shoes') || content.includes('electronics') ||
      content.includes('amazon') || content.includes('ebay') || content.includes('walmart')) {
    return 'SHOPPING';
  }
  
  // Content keywords - expanded
  if (content.includes('content') || content.includes('video') || content.includes('music') ||
      content.includes('stream') || content.includes('watch') || content.includes('read') ||
      content.includes('movie') || content.includes('tv') || content.includes('show') ||
      content.includes('netflix') || content.includes('youtube') || content.includes('spotify') ||
      content.includes('entertainment') || content.includes('media') || content.includes('film') ||
      content.includes('series') || content.includes('documentary') || content.includes('podcast')) {
    return 'CONTENT';
  }
  
  // Utilities keywords - expanded
  if (content.includes('utility') || content.includes('app') || content.includes('tool') ||
      content.includes('service') || content.includes('software') || content.includes('vpn') ||
      content.includes('cleaner') || content.includes('antivirus') || content.includes('security') ||
      content.includes('productivity') || content.includes('organizer') || content.includes('manager') ||
      content.includes('converter') || content.includes('calculator') || content.includes('scanner') ||
      content.includes('backup') || content.includes('storage') || content.includes('cloud')) {
    return 'UTILITIES';
  }
  
  // Default to GENERAL
  return 'GENERAL';
};

export const detectCategory = (title: string, description: string): string => {
  return categorizeOffer({ title, description });
};

export const detectVertical = (title: string, description: string): string => {
  const content = `${title} ${description}`.toLowerCase();
  
  if (content.includes('mobile') || content.includes('app') || content.includes('android') || content.includes('ios')) {
    return 'Mobile';
  }
  if (content.includes('web') || content.includes('website') || content.includes('online')) {
    return 'Web';
  }
  if (content.includes('desktop') || content.includes('windows') || content.includes('mac')) {
    return 'Desktop';
  }
  
  return 'Web';
};

export const detectCountryFromTitle = (title: string, description: string): string => {
  const text = `${title} ${description}`.toLowerCase();
  
  // Common country detection patterns
  const countryPatterns = [
    { pattern: /usa|united states|america|us|usd/g, country: 'US' },
    { pattern: /brazil|brasil|br/g, country: 'BR' },
    { pattern: /mexico|mexico|mx/g, country: 'MX' },
    { pattern: /canada|canadian|ca/g, country: 'CA' },
    { pattern: /uk|united kingdom|britain|gb/g, country: 'GB' },
    { pattern: /germany|deutschland|de/g, country: 'DE' },
    { pattern: /france|fr/g, country: 'FR' },
    { pattern: /spain|españa|es/g, country: 'ES' },
    { pattern: /italy|italia|it/g, country: 'IT' },
    { pattern: /india|in/g, country: 'IN' },
    { pattern: /australia|au/g, country: 'AU' },
    { pattern: /japan|jp/g, country: 'JP' },
    { pattern: /china|cn/g, country: 'CN' },
    { pattern: /russia|ru/g, country: 'RU' },
    { pattern: /global|worldwide|international|all countries/g, country: 'Global' }
  ];
  
  for (const { pattern, country } of countryPatterns) {
    if (pattern.test(text)) {
      return country;
    }
  }
  
  // Default to US if no country detected
  return 'US';
};

export const generateTrafficSource = (): string => {
  const sources = ['Organic', 'Paid', 'Social', 'Email', 'Direct', 'Referral'];
  return sources[Math.floor(Math.random() * sources.length)];
};

export const validateOfferData = (offer: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!offer.title || offer.title.trim().length < 3) {
    errors.push('Title is required and must be at least 3 characters');
  }
  
  if (!offer.url || !isValidUrl(offer.url)) {
    errors.push('Valid URL is required');
  }
  
  if (offer.payout && (isNaN(offer.payout) || offer.payout < 0)) {
    errors.push('Payout must be a valid positive number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

export const checkBatchDuplicates = async (offers: any[]): Promise<Map<number, any>> => {
  const duplicates = new Map<number, any>();
  
  // Simple duplicate detection based on title
  const titleMap = new Map<string, number>();
  
  offers.forEach((offer, index) => {
    const normalizedTitle = offer.title?.toLowerCase().trim();
    if (normalizedTitle && titleMap.has(normalizedTitle)) {
      duplicates.set(index, {
        existingOfferId: titleMap.get(normalizedTitle),
        matchingFields: ['title']
      });
    } else if (normalizedTitle) {
      titleMap.set(normalizedTitle, index);
    }
  });
  
  return duplicates;
};

export const autoFillOfferData = (offer: any): any => {
  return {
    ...offer,
    category: offer.category || detectCategory(offer.title || '', offer.description || ''),
    vertical: offer.vertical || detectVertical(offer.title || '', offer.description || ''),
    countries: offer.countries || detectCountryFromTitle(offer.title || '', offer.description || ''),
    traffic_sources: offer.traffic_sources || generateTrafficSource(),
    status: offer.status || 'active'
  };
};

export const logDuplicateDetection = async (
  batchId: string, 
  offerTitle: string, 
  existingOfferId: number | null, 
  matchingFields: string[], 
  action: string
): Promise<void> => {
  // This would typically log to a database
  console.log('Duplicate detection logged:', {
    batchId,
    offerTitle,
    existingOfferId,
    matchingFields,
    action,
    timestamp: new Date().toISOString()
  });
};

export const detectMissingOffers = async (uploadedOffers: any[]): Promise<{ missingOffers: any[], totalUploaded: number }> => {
  // This would typically check against existing offers in the database
  // For now, return all offers as "missing" for demonstration
  return {
    missingOffers: uploadedOffers,
    totalUploaded: uploadedOffers.length
  };
};

export const saveMissingOffersReport = async (
  reportId: string,
  reportName: string,
  uploadedData: any[],
  missingOffers: any[],
  fields: string[]
): Promise<void> => {
  // This would typically save to a database
  console.log('Missing offers report saved:', {
    reportId,
    reportName,
    totalUploaded: uploadedData.length,
    missingOffers: missingOffers.length,
    fields
  });
};

export const getMissingOffersReports = async (): Promise<any[]> => {
  // This would typically fetch from a database
  return [];
};
