import { UserProfile, OsintItem } from "../types";

/**
 * Cleans Instagram input, supporting full URLs (https://www.instagram.com/user/),
 * mobile URLs (https://m.instagram.com/user/), handles with @ (@user), or raw usernames.
 */
export function cleanInstagramInput(input: string): string {
  if (!input) return "";
  let clean = input.trim();
  // Strip protocols and domain: https://www.instagram.com/..., instagram.com/..., m.instagram.com/..., instagr.am/...
  clean = clean.replace(/^(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?(?:instagram\.com|instagr\.am)\/?/i, "");
  // If user pasted /stories/username or /reels/username or /reel/username or /p/username
  clean = clean.replace(/^(?:stories|reels|reel|p|channel|explore)\//i, "");
  // Strip trailing query parameters, anchors, or paths
  clean = clean.split("/")[0].split("?")[0].split("#")[0];
  // Strip leading @ or slashes
  clean = clean.replace(/^[@/]+/, "").replace(/[/]+$/, "");
  return clean.trim();
}

/**
 * Generates an authentic Instagram-style SVG/Avatar for profiles where direct CDN
 * avatar is CORS-restricted or not directly scrapeable.
 */
export function getInstagramAvatarUrl(username: string, customUrl?: string): string {
  if (customUrl && customUrl.startsWith("http")) {
    return customUrl;
  }
  const clean = cleanInstagramInput(username) || "user";
  // High quality SVG avatar with stylish gradient background
  const initials = clean.slice(0, 2).toUpperCase();
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    initials
  )}&background=E1306C&color=ffffff&size=256&bold=true&font-size=0.45&rounded=true`;
}

function cleanBoilerplate(str: string): string {
  return str
    .replace(/See Instagram photos and videos from [^.]*\.?/gi, "")
    .replace(/kullanıcısının Instagram fotoğraflarını ve videolarını gör:?/gi, "")
    .replace(/profilindeki fotoğrafları ve videoları gör:?/gi, "")
    .replace(/Instagram photos and videos/gi, "")
    .replace(/• Instagram photos and videos/gi, "")
    .replace(/• Instagram fotoğrafları ve videoları/gi, "")
    .replace(/^[0-9.,KMBkmb]+\s*(?:Followers|Takipçi)[^–—-]*(?:–|—|-)\s*/i, "")
    .trim();
}

function extractBioFromText(text: string, title: string, cleanUser: string): string {
  // 1. Quoted string in snippet or after on Instagram / Instagram'da
  const quotedMatch =
    text.match(/(?:on Instagram|Instagram'da|Instagram fotoğraflarını ve videolarını gör|Instagram photos and videos)[:\s]+["“'‘]([^"”'’]{3,})["”'’]/i) ||
    text.match(/["“]([^"”]{5,})["”]/) ||
    text.match(/'([^']{5,})'/);

  if (quotedMatch && quotedMatch[1] && quotedMatch[1].trim().length > 3) {
    const qBio = quotedMatch[1].trim();
    if (!qBio.toLowerCase().includes("see instagram photos") && !qBio.toLowerCase().includes("kullanıcısının instagram")) {
      return qBio;
    }
  }

  // 2. Text after colon (on Instagram: ... or Instagram'da: ...)
  const colonMatch = text.match(/(?:on Instagram|Instagram'da|videolarını gör):\s*([^\n|•]+)/i);
  if (colonMatch && colonMatch[1]) {
    const cBio = cleanBoilerplate(colonMatch[1].trim());
    if (cBio.length > 3) return cBio;
  }

  // 3. Text after " - "
  if (text.includes(" - ")) {
    const parts = text.split(" - ");
    for (let i = 1; i < parts.length; i++) {
      const candidate = cleanBoilerplate(parts[i].trim());
      if (
        candidate.length > 3 &&
        !candidate.toLowerCase().startsWith("see instagram photos") &&
        !candidate.toLowerCase().startsWith("kullanıcısının")
      ) {
        return candidate;
      }
    }
  }

  // 4. Direct text cleaning
  const cleanedSnippet = cleanBoilerplate(text);
  if (cleanedSnippet.length > 5 && !cleanedSnippet.toLowerCase().includes("see instagram photos")) {
    return cleanedSnippet;
  }

  return "";
}

export function parseInstagramProfileData(
  username: string,
  items: OsintItem[]
): UserProfile | null {
  const cleanUser = cleanInstagramInput(username).toLowerCase();
  if (!cleanUser) return null;

  let foundProfile: UserProfile | null = null;
  let detectedAvatarUrl: string | undefined;

  for (const it of items) {
    const isDirectProfile =
      it.link.includes(`instagram.com/${cleanUser}`) &&
      !it.link.includes("/p/") &&
      !it.link.includes("/reel/") &&
      !it.link.includes("/stories/");

    if (it.imageUrl && !detectedAvatarUrl) {
      detectedAvatarUrl = it.imageUrl;
    }

    const text = `${it.title} ${it.snippet}`;

    // Regex patterns for Followers / Takipçi
    const followerMatch =
      text.match(/([0-9.,KMBkmb]+)\s*(?:Followers|Takipçi)/i) ||
      text.match(/(?:Followers|Takipçi):\s*([0-9.,KMBkmb]+)/i);

    // Regex patterns for Following / Takip Edilen
    const followingMatch =
      text.match(/([0-9.,KMBkmb]+)\s*(?:Following|Takip Edilen)/i) ||
      text.match(/(?:Following|Takip Edilen):\s*([0-9.,KMBkmb]+)/i);

    // Regex patterns for Posts / Gönderi
    const postsMatch =
      text.match(/([0-9.,KMBkmb]+)\s*(?:Posts|Gönderi)/i) ||
      text.match(/(?:Posts|Gönderi):\s*([0-9.,KMBkmb]+)/i);

    // Extract Full Name from title (e.g., "Full Name (@target_user) • Instagram photos")
    let fullName = "";
    const nameMatch = it.title.match(/^([^(@•]+)\s*(?:\(@|\•|-)/);
    if (nameMatch && nameMatch[1].trim()) {
      fullName = nameMatch[1].trim();
    }

    // Extract Bio text
    const extractedBio = extractBioFromText(text, it.title, cleanUser);

    if (isDirectProfile || followerMatch || followingMatch || postsMatch || extractedBio) {
      const resolvedBio =
        (extractedBio && extractedBio.length > 3)
          ? extractedBio
          : (foundProfile?.bio || "");

      foundProfile = {
        username: cleanUser,
        fullName: fullName || foundProfile?.fullName || cleanUser,
        followers: followerMatch ? followerMatch[1] : (foundProfile?.followers || "—"),
        following: followingMatch ? followingMatch[1] : (foundProfile?.following || "—"),
        posts: postsMatch ? postsMatch[1] : (foundProfile?.posts || "—"),
        bio: resolvedBio,
        profileUrl: `https://www.instagram.com/${cleanUser}/`,
        profilePicUrl: detectedAvatarUrl || foundProfile?.profilePicUrl || getInstagramAvatarUrl(cleanUser),
        fetchMode: "index",
      };
      if (isDirectProfile) {
        it.isProfile = true;
      }
    }
  }

  // Fallback if no explicit profile row was flagged but items exist
  if (!foundProfile && items.length > 0) {
    const fallbackBio =
      extractBioFromText(items[0]?.snippet || "", items[0]?.title || "", cleanUser) || items[0]?.snippet || "";

    foundProfile = {
      username: cleanUser,
      fullName: cleanUser,
      followers: "—",
      following: "—",
      posts: `${items.length} Arama Kaydı`,
      bio: fallbackBio,
      profileUrl: `https://www.instagram.com/${cleanUser}/`,
      profilePicUrl: detectedAvatarUrl || getInstagramAvatarUrl(cleanUser),
      fetchMode: "index",
    };
  }

  return foundProfile;
}
