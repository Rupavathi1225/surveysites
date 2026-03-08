import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Activity, UserPlus, LogIn, Gift, Tag, CheckCircle, Plus, CreditCard, Bell } from "lucide-react";

interface TickerItem {
  id: string;
  username: string;
  source: string;
  amount: string;
  icon: "earning" | "signup" | "login" | "promocode" | "offer" | "payment" | "notification" | "offer_added" | "offer_completed";
  avatarUrl?: string;
  offerId?: string; // Add offerId for offer-related activities
  imageUrl?: string; // Add imageUrl for offer images
  notificationType?: string; // Add notification type for better handling
  created_at?: string; // Add created_at for time display
  offerwallName?: string; // Add offerwall name for logo display
}

const iconMap = {
  earning: TrendingUp,
  signup: UserPlus,
  login: LogIn,
  promocode: Gift,
  offer: CheckCircle,
  payment: CreditCard,
  notification: Bell,
  offer_added: Plus,
  offer_completed: CheckCircle,
};

// Activity logo mapping
const activityLogos = {
  earning: "https://img.icons8.com/color/48/money-bag.png", // Earnings/Offer Completed
  signup: "https://img.icons8.com/color/48/user-registration.png", // Signup
  login: "https://img.icons8.com/color/48/login.png", // Login
  promocode: "https://img.icons8.com/color/48/gift.png", // Promo Redeemed
  offer: null, // Will use offer image
  payment: "https://img.icons8.com/color/48/money-transfer.png", // Payment Requested/Completed
  notification: "https://img.icons8.com/color/48/announcement.png", // Announcement/System
  offer_added: null, // Will use offer image
  offer_completed: null, // Will use offer image
};

// Offerwall logo mapping
const offerwallLogos = {
  cpamerchant: "https://img.icons8.com/color/48/advertising.png", // CPAMerchant logo
  chameleonads: "https://img.icons8.com/color/48/chameleon.png", // ChameleonAds logo
  leadads: "https://img.icons8.com/color/48/lead-management.png", // LeadAds logo
  // Add more offerwall logos as needed
};

// Gender-specific avatar URLs
const genderAvatars = {
  male: "https://img.icons8.com/color/48/user-male.png",
  female: "https://img.icons8.com/color/48/user-female.png",
};

// Function to detect gender from name
const detectGender = (name: string): 'male' | 'female' | 'unknown' => {
  // Common female name indicators
  const femaleIndicators = [
    'a', 'e', 'i', 'o', 'u', // Common female endings in many languages
    'mary', 'sarah', 'jessica', 'emily', 'sophia', 'olivia', 'ava', 'mia', 'isabella',
    'elizabeth', 'charlotte', 'amelia', 'harper', 'evelyn', 'abigail', 'madison',
    'sophie', 'daisy', 'rose', 'lily', 'grace', 'violet', 'zoe', 'luna',
    'priya', 'anita', 'sunita', 'geeta', 'rani', 'pooja', 'kavita', 'meena',
    'fatima', 'aisha', 'khadija', 'zara', 'amina', 'layla', 'hajar', 'nadia'
  ];
  
  // Common male name indicators  
  const maleIndicators = [
    'k', 's', 'n', 'r', 't', 'd', 'v', // Common male endings
    'john', 'michael', 'david', 'james', 'robert', 'william', 'joseph',
    'richard', 'thomas', 'charles', 'christopher', 'daniel', 'matthew',
    'anthony', 'mark', 'donald', 'steven', 'paul', 'andrew', 'joshua',
    'rahul', 'raj', 'amit', 'vijay', 'suresh', 'anand', 'deepak', 'arjun',
    'mohammed', 'ahmed', 'ali', 'omar', 'hassan', 'khalid', 'yusuf'
  ];
  
  const lowerName = name.toLowerCase().trim();
  
  // Check for female indicators
  for (const indicator of femaleIndicators) {
    if (lowerName.includes(indicator)) {
      return 'female';
    }
  }
  
  // Check for male indicators
  for (const indicator of maleIndicators) {
    if (lowerName.includes(indicator)) {
      return 'male';
    }
  }
  
  return 'unknown';
};

// Function to extract offerwall name from notification message
const extractOfferwallName = (message: string): string | null => {
  console.log('🏢 Extracting offerwall name from message:', message);
  
  // Try to extract offerwall name from common patterns
  const patterns = [
    /completed\s+([^"]+?)\s+offer/i,
    /offer\s+from\s+([^"]+?)\s+and/i,
    /([^"]+?)\s+offer\s+completed/i,
    /completed\s+([^"]+?)\s+survey/i,
    /survey\s+from\s+([^"]+?)\s+and/i,
    /CPAMerchant|ChameleonAds|LeadAds/i, // Direct match for known offerwalls
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const offerwallName = match[1].trim().toLowerCase();
      console.log('✅ Extracted offerwall name:', offerwallName, 'using pattern:', pattern);
      return offerwallName;
    }
  }
  
  // Check for direct offerwall name matches
  const directMatches = ['cpamerchant', 'chameleonads', 'leadads'];
  for (const offerwall of directMatches) {
    if (message.toLowerCase().includes(offerwall)) {
      console.log('✅ Direct match found for offerwall:', offerwall);
      return offerwall;
    }
  }
  
  console.log('❌ No offerwall name extracted from message');
  return null;
};

// Function to extract offer name from notification message
const extractOfferName = (message: string): string | null => {
  console.log('🔍 Extracting offer name from message:', message);
  
  // Try to extract offer name from common patterns
  const patterns = [
    /New offer added:\s*([^—]+) —/i,
    /completed\s+["']([^"']+)["']/i,
    /completed\s+([^"]+?)\s+and\s+earned/i,  // For "completed OFFER_NAME and earned"
    /Offer\s+Completed:\s*([^:—]+)/i,
    /New\s+offer\s+added:\s*([^:—]+)/i,
    /offer\s+["']([^"']+)["']/i,
    /([^"]+?)\s+completed\s+and\s+earned/i,  // Alternative pattern
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const offerName = match[1].trim();
      console.log('✅ Extracted offer name:', offerName, 'using pattern:', pattern);
      return offerName;
    }
  }
  
  console.log('❌ No offer name extracted from message');
  return null;
};

// Function to extract survey provider name from notification message
const extractSurveyProviderName = (message: string): string | null => {
  console.log('🔍 Extracting survey provider name from message:', message);
  
  // Special check for Torox first
  if (message.toLowerCase().includes('torox')) {
    console.log('✅ Torox found in message - direct return');
    console.log('🔍 Detailed logging for Torox:');
    console.log('👉 Message:', message);
    console.log('👉 Extracted provider name:', 'torox');
    console.log('👉 Image URL:', 'https://example.com/torox-logo.png'); // Replace with actual image URL
    return 'torox';
  }
  
  // Check for direct offerwall name matches first - most reliable
  const directMatches = [
    { name: 'hello survey', patterns: ['hello survey', 'Hello Survey', 'HELLO SURVEY'] },
    { name: 'cpamerchant', patterns: ['cpamerchant', 'CPAMerchant', 'CPAMERCHANT'] },
    { name: 'chameleonads', patterns: ['chameleonads', 'ChameleonAds', 'CHAMELEONADS'] },
    { name: 'leadads', patterns: ['leadads', 'LeadAds', 'LEADADS'] },
    { name: 'lootably', patterns: ['lootably', 'Lootably', 'LOOTABLY'] },
    { name: 'moustache', patterns: ['moustache', 'Moustache', 'MOUSTACHE'] },
    { name: 'torox', patterns: ['torox', 'Torox', 'TOROX'] },
    { name: 'adsensedmedia', patterns: ['adsensedmedia', 'AdsensedMedia', 'ADSENSEDMEDIA'] }
  ];
  
  for (const provider of directMatches) {
    for (const pattern of provider.patterns) {
      if (message.includes(pattern)) {
        console.log('✅ Direct match found for survey provider:', provider.name, 'with pattern:', pattern);
        return provider.name;
      }
    }
  }
  
  // More aggressive pattern matching for survey provider names
  const patterns = [
    // Match provider names at the start of message
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+survey/i,
    // Match "completed ProviderName survey"
    /completed\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+survey/i,
    // Match "ProviderName survey completed"
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+survey\s+completed/i,
    // Match "survey from ProviderName"
    /survey\s+from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      const providerName = match[1].trim();
      console.log('✅ Extracted survey provider name:', providerName, 'using pattern:', pattern);
      return providerName;
    }
  }
  
  // Fallback: try to find words before "survey" in message
  const surveyIndex = message.toLowerCase().indexOf('survey');
  if (surveyIndex > 0) {
    // Get text before "survey" and extract the last 2 words
    const beforeSurvey = message.substring(0, surveyIndex).trim();
    const words = beforeSurvey.split(/\s+/);
    console.log('🔍 Words before "survey":', words);
    
    // Check for known provider names in the words
    const knownProviders = ['Lootably', 'Hello Survey', 'CPAMerchant', 'ChameleonAds', 'LeadAds', 'Moustache', 'AdsensedMedia', 'Torox'];
    for (const word of words) {
      for (const provider of knownProviders) {
        if (word.toLowerCase() === provider.toLowerCase()) {
          console.log('✅ Found known provider:', provider);
          return provider;
        }
      }
    }
    
    if (words.length >= 2) {
      const providerName = words.slice(-2).join(' ');
      console.log('✅ Fallback extraction - provider name:', providerName);
      return providerName;
    } else if (words.length === 1) {
      console.log('✅ Single word fallback - provider name:', words[0]);
      return words[0];
    }
  }
  
  console.log('❌ No survey provider name extracted from message');
  return null;
};

const ActivityTicker = ({ userId }: { userId?: string }) => {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      const allItems: TickerItem[] = [];

      // 1. Earning history (offer/survey completed)
      const { data: earnings } = await supabase
        .from("earning_history")
        .select("id, amount, offer_name, user_id, description, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      // 2. Recent signups (profiles)
      const { data: recentUsers } = await supabase
        .from("profiles")
        .select("id, username, first_name, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 3. Login logs
      const { data: logins } = await supabase
        .from("login_logs")
        .select("id, user_id, created_at, location")
        .order("created_at", { ascending: false })
        .limit(5);

      // 4. Promocode redemptions
      const { data: promoRedemptions } = await supabase
        .from("promocode_redemptions")
        .select("id, user_id, promocode_id, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 5. Withdrawals (payment requested / completed)
      const { data: withdrawals } = await supabase
        .from("withdrawals")
        .select("id, user_id, amount, status, payment_method, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      // 6. Global notifications
      const { data: globalNotifications } = await supabase
        .from("notifications")
        .select("id, message, type, created_at, user_id, is_global")
        .eq("is_global", true)
        .order("created_at", { ascending: false })
        .limit(5);

      // 7. All notifications (including user-specific ones like offer completions)
      const { data: allNotifications } = await supabase
        .from("notifications")
        .select("id, message, type, created_at, user_id, is_global")
        .order("created_at", { ascending: false })
        .limit(20);

      // Collect all user IDs for profile lookup
      const allUserIds = new Set<string>();
      const offerNames = new Set<string>();
      earnings?.forEach(e => {
        allUserIds.add(e.user_id);
        if (e.offer_name) offerNames.add(e.offer_name);
      });
      logins?.forEach(l => { if (l.user_id) allUserIds.add(l.user_id); });
      promoRedemptions?.forEach(p => allUserIds.add(p.user_id));
      withdrawals?.forEach(w => allUserIds.add(w.user_id));
      
      // Extract offer names from notifications
      [...(globalNotifications || []), ...(allNotifications || [])].forEach(n => {
        const offerName = extractOfferName(n.message || "");
        if (offerName) offerNames.add(offerName);
      });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, first_name, avatar_url")
        .in("id", [...allUserIds]);

      // Fetch offer images for earnings
      const { data: offerImages } = await supabase
        .from("offers")
        .select("title, image_url")
        .in("title", [...offerNames]);

      console.log('🖼️ Offer images fetched:', offerImages);
      console.log('🏷️ Offer names being searched:', [...offerNames]);

      // Fetch survey providers for survey completed notifications
      const { data: surveyProviders } = await supabase
        .from("survey_providers")
        .select("id, name, image_url")
        .limit(50); // Get more survey providers

      console.log('📊 Survey providers fetched:', surveyProviders);
      console.log('📊 Survey provider names in database:', surveyProviders?.map(sp => sp.name));
      console.log('📊 Survey provider images in database:', surveyProviders?.map(sp => ({ name: sp.name, image: sp.image_url })));
      
      // Log each survey provider with its image URL
      surveyProviders?.forEach((sp, index) => {
        console.log(`🏢 Survey Provider ${index + 1}:`, sp.name, '→', sp.image_url, sp.image_url ? '✅' : '❌');
      });
      
      const profileMap = new Map(
        (profiles || []).map((p) => [p.id, { name: p.username || p.first_name || "Anonymous", avatar: p.avatar_url }])
      );

      const offerImageMap = new Map(
        (offerImages || []).map((o) => [o.title, o.image_url])
      );

      const surveyProviderImageMap = new Map(
        (surveyProviders || []).map((sp) => [sp.name.toLowerCase(), sp.image_url])
      );
      
      console.log('🗺️ Survey provider image map created (lowercase keys):', Array.from(surveyProviderImageMap.entries()));

      // Earnings
      earnings?.forEach((e) => {
        const prof = profileMap.get(e.user_id);
        const offerImage = e.offer_name ? offerImageMap.get(e.offer_name) : undefined;
        
        // Try to get survey provider image from description or offer_name
        let surveyProviderImage = undefined;
        if (e.description || e.offer_name) {
          const searchText = `${e.description || ''} ${e.offer_name || ''}`.toLowerCase();
          
          // Special handling for Torox - ensure it shows database logo
          if (e.description.toLowerCase().includes('torox')) {
            const toroxProvider = surveyProviders?.find(sp => sp.name.toLowerCase() === 'torox');
            if (toroxProvider?.image_url) {
              surveyProviderImage = toroxProvider.image_url;
              console.log('🔴 Torox detected - using database logo:', toroxProvider.image_url);
            } else {
              console.log('❌ Torox provider not found in database');
            }
          } else {
            // Try to find survey provider by matching name in description
            const surveyProvider = surveyProviders?.find(sp => 
              searchText.includes(sp.name.toLowerCase())
            );
            
            if (surveyProvider?.image_url) {
              surveyProviderImage = surveyProvider.image_url;
              console.log('📸 Found exact survey provider image:', surveyProvider.name, '→', surveyProvider.image_url);
            } else {
              console.log('❌ No exact survey provider image found');
              console.log('🔍 Available survey providers:', surveyProviders?.map(sp => ({ name: sp.name, image: sp.image_url })));
              
              // Try case-insensitive matching
              const descriptionLower = e.description?.toLowerCase();
              const foundProvider = surveyProviders?.find(sp => 
                descriptionLower.includes(sp.name.toLowerCase()) || sp.name.toLowerCase().includes(descriptionLower)
              );
              
              if (foundProvider?.image_url) {
                surveyProviderImage = foundProvider.image_url;
                console.log('📸 Found case-insensitive survey provider image:', foundProvider.name, '→', foundProvider.image_url);
              } else {
                console.log('❌ Still no survey provider image found after case-insensitive match');
              }
            }
          }
        }
        
        allItems.push({
          id: `e-${e.id}`,
          username: prof?.name || "User",
          source: e.offer_name || e.description || "Completed a task",
          amount: `$ ${(e.amount || 0).toFixed(2)}`,
          icon: "earning",
          avatarUrl: prof?.avatar || undefined,
          imageUrl: surveyProviderImage || offerImage, // Use survey provider image first, then offer image
          created_at: e.created_at,
        });
      });

      // Signups
      recentUsers?.forEach((u) => {
        allItems.push({
          id: `s-${u.id}`,
          username: u.username || u.first_name || "New User",
          source: "Just joined the platform!",
          amount: "",
          icon: "signup",
          created_at: u.created_at,
        });
      });

      // Logins
      logins?.forEach((l) => {
        const prof = l.user_id ? profileMap.get(l.user_id) : null;
        allItems.push({
          id: `l-${l.id}`,
          username: prof?.name || "User",
          source: "Logged in",
          amount: "",
          icon: "login",
          created_at: l.created_at,
        });
      });

      // Promocode redemptions
      promoRedemptions?.forEach((p) => {
        const prof = profileMap.get(p.user_id);
        allItems.push({
          id: `p-${p.id}`,
          username: prof?.name || "User",
          source: "Redeemed a promocode",
          amount: "",
          icon: "promocode",
          created_at: p.created_at,
        });
      });

      // Withdrawals
      withdrawals?.forEach((w) => {
        const prof = profileMap.get(w.user_id);
        const isPaid = w.status === "approved" || w.status === "completed";
        allItems.push({
          id: `w-${w.id}`,
          username: prof?.name || "User",
          source: isPaid ? `Payment completed via ${w.payment_method}` : `Requested withdrawal via ${w.payment_method}`,
          amount: `$ ${(w.amount || 0).toFixed(2)}`,
          icon: "payment",
        });
      });

      // Global notifications
      globalNotifications?.forEach((n) => {
        console.log('🌐 Processing global notification:', JSON.stringify(n, null, 2));
        const offerName = extractOfferName(n.message || "");
        const offerwallName = extractOfferwallName(n.message || "");
        
        // Try multiple approaches to find offer image
        let offerImage = undefined;
        let surveyProviderImage = undefined;
        let offerwallLogo = undefined;
        
        // 1. Try exact match for offers
        if (offerName) {
          offerImage = offerImageMap.get(offerName);
        }
        
        // 2. Try to match survey provider name from message for ANY notification type
        const messageLower = (n.message || "").toLowerCase();
        const matchedProvider = surveyProviders?.find(sp => 
          messageLower.includes(sp.name.toLowerCase())
        );
        if (matchedProvider?.image_url) {
          surveyProviderImage = matchedProvider.image_url;
        }
        
        // 3. Try to get offerwall logo
        if (offerwallName) {
          offerwallLogo = offerwallLogos[offerwallName as keyof typeof offerwallLogos];
          console.log('🏢 Offerwall logo match - Offerwall:', offerwallName, 'Logo URL:', offerwallLogo);
        }
        
        // 4. If no exact match, try partial match (case-insensitive)
        if (!offerImage && offerName) {
          const lowerOfferName = offerName.toLowerCase();
          for (const [mapOfferName, imageUrl] of offerImageMap.entries()) {
            if (mapOfferName.toLowerCase().includes(lowerOfferName) || 
                lowerOfferName.includes(mapOfferName.toLowerCase())) {
              offerImage = imageUrl;
              console.log('🔍 Partial match found:', mapOfferName, 'for:', offerName);
              break;
            }
          }
        }
        
        // 5. If still no match, try to extract from message differently
        if (!offerImage) {
          console.log('🔍 Trying alternative extraction for:', n.message);
          // Try to extract offer name from different patterns
          const altPatterns = [
            /([^"]+?)\s+completed/i,
            /completed\s+([^"]+?)/i,
            /([^"]+?)\s+and\s+earned/i,
          ];
          
          for (const pattern of altPatterns) {
            const match = n.message?.match(pattern);
            if (match && match[1]) {
              const altOfferName = match[1].trim();
              offerImage = offerImageMap.get(altOfferName);
              console.log('🔄 Alternative extraction:', altOfferName, 'Image:', offerImage);
              if (offerImage) break;
            }
          }
        }
        
        console.log('🗺️ Available offer images in map:', Array.from(offerImageMap.entries()));
        console.log('🗺️ Available survey provider images in map:', Array.from(surveyProviderImageMap.entries()));
        console.log('🏢 Available offerwall logos:', Object.keys(offerwallLogos));
        console.log('🔍 Looking for exact match:', offerName, 'in map keys:', Array.from(offerImageMap.keys()));
        console.log('📸 Final offer image:', offerImage);
        console.log('📸 Final survey provider image:', surveyProviderImage);
        console.log('🏢 Final offerwall logo:', offerwallLogo);
        
        // Determine icon based on notification type
        let iconType: TickerItem['icon'] = "notification";
        let amount = "";
        
        switch (n.type) {
          case "offer_added":
            iconType = "offer_added";
            amount = "";
            break;
          case "offer_completed":
            iconType = "offer_completed";
            amount = "";
            break;
          case "survey_completed":
            iconType = "offer_completed";
            amount = "";
            break;
          case "announcement":
            iconType = "notification";
            amount = "";
            break;
          case "credits":
            iconType = "earning";
            amount = "";
            break;
          case "signup":
            iconType = "signup";
            amount = "";
            break;
          case "promo_redeemed":
            iconType = "promocode";
            amount = "";
            break;
          case "payment_requested":
            iconType = "payment";
            amount = "";
            break;
          case "payment_completed":
            iconType = "payment";
            amount = "";
            break;
          default:
            iconType = "notification";
            amount = "";
        }
        
        const finalItem = {
          id: `n-${n.id}`,
          username: "System",
          source: n.message,
          amount: amount,
          icon: iconType,
          notificationType: n.type,
          created_at: n.created_at,
          imageUrl: surveyProviderImage || offerImage || undefined,
          offerwallName: offerwallName || undefined,
        };
        
        console.log('🎯 Final item created:', JSON.stringify(finalItem, null, 2));
        console.log('🖼️ Image URL in final item:', finalItem.imageUrl);
        console.log('🏢 Offerwall name in final item:', finalItem.offerwallName);
        allItems.push(finalItem);
      });

      // All notifications (including user-specific ones like offer completions)
      allNotifications?.forEach((n) => {
        console.log('📝 Processing notification:', n);
        // Skip global notifications since they're already processed above
        if (n.is_global) return;
        
        // Determine icon based on notification type
        let iconType: TickerItem['icon'] = "notification";
        let amount = "";
        
        switch (n.type) {
          case "offer_added":
            iconType = "offer_added";
            amount = "";
            break;
          case "offer_completed":
            iconType = "offer_completed";
            amount = "";
            break;
          case "announcement":
            iconType = "notification";
            amount = "";
            break;
          case "credits":
            iconType = "earning";
            amount = "";
            break;
          case "signup":
            iconType = "signup";
            amount = "";
            break;
          case "promo_redeemed":
            iconType = "promocode";
            amount = "";
            break;
          case "payment_requested":
            iconType = "payment";
            amount = "";
            break;
          case "payment_completed":
            iconType = "payment";
            amount = "";
            break;
          default:
            iconType = "notification";
            amount = "";
        }
        
        const offerName = extractOfferName(n.message || "");
        const offerImage = offerName ? offerImageMap.get(offerName) : undefined;
        
        // Match survey provider image from message
        const msgLower = (n.message || "").toLowerCase();
        const matchedSP = surveyProviders?.find(sp => msgLower.includes(sp.name.toLowerCase()));
        const spImage = matchedSP?.image_url || undefined;
        
        allItems.push({
          id: `n-${n.id}`,
          username: "System",
          source: n.message,
          amount: amount,
          icon: iconType,
          notificationType: n.type,
          imageUrl: spImage || offerImage || undefined,
        });
      });

      // Sort by created_at descending (latest first) and limit to 20
      allItems.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setItems(allItems.slice(0, 20));
    };

    fetchAll();

    // Real-time subscriptions
    const ch1 = supabase
      .channel("ticker-all-activities")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "earning_history" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "login_logs" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "promocode_redemptions" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "withdrawals" }, () => fetchAll())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchAll()) // Listen to ALL notifications
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
    };
  }, [userId]);

  if (items.length === 0) return null;

  const triplication = [...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items, ...items];

// Function to get relative time
const getRelativeTime = (created_at?: string): string => {
  if (!created_at) return "";
  
  const now = new Date();
  const created = new Date(created_at);
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// Function to get initial from username
const getInitial = (name: string): string => {
  if (!name) return "?";
  return name.charAt(0).toUpperCase();
};

// Function to truncate text for 2 lines (more aggressive)
const truncateTextTwoLines = (text: string, maxLength: number = 35): string => {
  if (!text) return "";
  
  // Common phrases to shorten
  const shortenings = {
    "completed": "✓",
    "and earned": "+",
    "points": "pts",
    "survey from": "survey:",
    "offer from": "offer:",
    "completed survey": "survey",
    "completed offer": "offer",
    "just joined": "joined",
    "logged in": "login",
    "redeemed a promocode": "promo",
    "requested withdrawal": "withdraw",
    "payment completed": "paid",
  };
  
  let shortenedText = text;
  
  // Apply shortenings
  Object.entries(shortenings).forEach(([long, short]) => {
    shortenedText = shortenedText.replace(new RegExp(long, "gi"), short);
  });
  
  // Remove extra words to make it more concise
  shortenedText = shortenedText
    .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  
  // Final length check
  if (shortenedText.length <= maxLength) return shortenedText;
  return shortenedText.substring(0, maxLength) + "...";
};

const getAvatarContent = (item: TickerItem) => {
  console.log('🎭 Getting avatar content for item:', JSON.stringify(item, null, 2));
  console.log('🖼️ Item imageUrl:', item.imageUrl);
  console.log('🏢 Item offerwallName:', item.offerwallName);
  
  // Priority 1: Survey provider logos (highest priority)
  if (item.imageUrl && (item.icon === "earning" || item.notificationType === "survey_completed")) {
    console.log('🖼️ Showing survey provider image:', item.imageUrl);
    return (
      <img 
        src={item.imageUrl} 
        alt="Survey Provider" 
        className="w-full h-full object-contain rounded-lg"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }
  
  // Priority 2: Offer images
  if (item.imageUrl && (item.icon === "offer_added" || item.icon === "offer_completed")) {
    console.log('🖼️ Showing offer image:', item.imageUrl);
    return (
      <img 
        src={item.imageUrl} 
        alt="Offer" 
        className="w-8 h-8 object-cover rounded-lg"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }
  
  // Priority 3: User activities (gender-specific avatars)
  if (["signup", "login"].includes(item.icon)) {
    const gender = detectGender(item.username);
    console.log('👤 Detected gender:', gender, 'for username:', item.username);
    
    if (gender !== 'unknown' && genderAvatars[gender]) {
      console.log('👨‍🦱 Showing gender avatar:', genderAvatars[gender]);
      return (
        <img 
          src={genderAvatars[gender]} 
          alt={`${gender} avatar`}
          className="w-full h-full object-cover rounded-lg"
          onError={(e) => {
            // Fallback to initial if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const fallback = target.nextElementSibling as HTMLSpanElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      );
    }
  }
  
  // For other activities, show activity logos
  const logoUrl = activityLogos[item.icon];
  if (logoUrl) {
    console.log('🎨 Showing activity logo:', logoUrl, 'for icon:', item.icon);
    return (
      <img 
        src={logoUrl} 
        alt={item.icon}
        className="w-8 h-8 object-contain"
        onError={(e) => {
          // Fallback to initial if logo fails to load
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const fallback = target.nextElementSibling as HTMLSpanElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
    );
  }
  
  // Fallback to initial
  console.log('🔤 Showing fallback initial for:', item.username);
  return <span className="text-base font-bold text-white">{getInitial(item.username)}</span>;
};

  const gradients = [
    "from-purple-100 to-white",
    "from-white to-purple-100",
    "from-purple-200 to-white",
    "from-white to-purple-200",
    "from-purple-100 to-gray-50",
    "from-gray-50 to-purple-100",
  ];

  return (
    <div className="w-full overflow-hidden bg-card/50 border border-border rounded-xl py-3 px-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Live Activity Feed</span>
        <p className="text-xs text-muted-foreground hidden sm:block">Real-time activity from our community</p>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-emerald-400 font-medium">LIVE</span>
        </div>
      </div>

      <div className="relative overflow-hidden">
        <div className="flex gap-4 animate-scroll-slow whitespace-nowrap" style={{ width: "max-content" }}>
          {triplication.map((item, i) => {
            const Icon = iconMap[item.icon] || TrendingUp;
            return (
              <div
                key={`${item.id}-${i}`}
                className={`inline-flex items-center gap-4 shrink-0 bg-gradient-to-r ${gradients[i % gradients.length]} rounded-2xl px-6 py-4 min-w-[300px] shadow-xl`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base font-bold text-gray-900 truncate">{item.username}</span>
                    <span className="text-base text-gray-500">•</span>
                    <span className="text-base text-gray-600">{getRelativeTime(item.created_at)}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-base text-gray-700 line-clamp-2 leading-snug">{truncateTextTwoLines(item.source, 50)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-lg font-bold text-gray-900">{item.amount}</span>
                  {(item.icon === "earning" || item.icon === "offer_added" || item.icon === "offer_completed" || item.notificationType === "survey_completed") && item.imageUrl ? (
                    <div className="w-24 h-24 flex items-center justify-center shrink-0">
                      <img 
                        src={item.imageUrl} 
                        alt="Survey Provider" 
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    </div>
                  ) : item.offerwallName && offerwallLogos[item.offerwallName as keyof typeof offerwallLogos] ? (
                    <div className="w-24 h-24 flex items-center justify-center shrink-0">
                      <img 
                        src={offerwallLogos[item.offerwallName as keyof typeof offerwallLogos]} 
                        alt={item.offerwallName}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    </div>
                  ) : activityLogos[item.icon] ? (
                    <div className="w-24 h-24 flex items-center justify-center shrink-0">
                      <img 
                        src={activityLogos[item.icon]} 
                        alt={item.icon}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback to initial if logo fails to load
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLSpanElement;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    </div>
                  ) : (
                    <Icon className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActivityTicker;
