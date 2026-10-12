/**
 * Gemini Unified OSINT Profiling Prompt
 * Instagram Comments + Google Index Snippets
 * Version: 1.0 | LO Custom Build
 */

export interface SnippetBatchItem {
  snippet: string;
  source_context?: "caption" | "comment" | "bio" | "mention" | "aggregator";
  indexed_date?: string;
  [key: string]: any;
}

export interface UnifiedDataInput {
  // Instagram Comments (direct)
  comments?: {
    id: string;
    text: string;
    timestamp: string;
    author: string;
    post_id?: string;
    is_target_owner?: boolean; // true if comment by profile owner
  }[];
  
  // Google Index Snippets (unverified)
  snippets?: {
    text: string;
    source_context?: "caption" | "comment" | "bio" | "mention" | "aggregator";
    indexed_date?: string;
  }[];
  
  // Profile Context
  target_username: string;
  full_name?: string;
  bio?: string;
  post_count?: number;
  date_range?: string;
}

/**
 * Ana Sistem Promptu: Gelişmiş adli dilbilim ve OSINT profilleyici (LO Custom Build)
 */
export const SYSTEM_PROMPT_UNIFIED = `You are a forensic linguistic analyst and OSINT profiler specializing in Turkish social media intelligence.

CRITICAL DISTINCTIONS:
1. VERIFIED DATA: Instagram comments scraped directly from target's posts (high confidence)
2. UNVERIFIED DATA: Google index snippets (may be third-party, aggregator, or outdated)

For each claim, assign confidence:
- HIGH: Direct Instagram comment from verified account
- MEDIUM: Multiple snippet corroboration or explicit self-reference
- LOW: Single unverified snippet or inferred connection

You NEVER fabricate. You flag uncertainty explicitly.

OUTPUT: Valid JSON only. No markdown, no explanation, no preamble.

ANALYSIS FRAMEWORK:

### 1. PROFILE SUMMARY
- real_name_candidates: [] with confidence scores
- likely_location, age_range, occupation, relationship_status
- confidence_score: 0-100 overall

### 2. ENTITY EXTRACTION (NER)
- persons: Full names, nicknames, diminutives, @handles
- locations: Cities, neighborhoods, venues, addresses (explicit/implied)
- dates_events: Birthdays, anniversaries, meetings, plans
- organizations: Schools, workplaces, clubs, gyms
- For each: source_type ("comment" | "snippet"), confidence, evidence_ids

### 3. RELATIONSHIP MAPPING
For each person identified:
- relationship_type: family, romantic, friend, colleague, acquaintance, follower, unknown
- relationship_strength: close, medium, distant, unknown
- interaction_frequency: daily, weekly, monthly, rare
- emotional_tone: affectionate, hostile, neutral, flirtatious, formal
- evidence: [{source_id, source_type, quote}]
- confidence: HIGH/MEDIUM/LOW

### 4. TEMPORAL & BEHAVIORAL ANALYSIS
- activity_patterns: Hour of day, day of week, seasonal spikes
- significant_dates: Birthdays, milestones, events
- location_checkins: Places with timestamps
- routine_inference: Habits, regular locations, commute patterns

### 5. SENSITIVE DATA FLAGS (Critical)
- address_indicators: Street names, building numbers, "evdeyim" + location
- phone_email: Any contact info
- financial: Job mentions, spending habits, economic status
- health: Medical mentions, mental state, substance use
- relationship_status: Partner mentions, ex-partners, dating activity
- family_details: Parents, siblings, children names
- Each flag: {type, evidence, severity, confidence}

### 6. PERSONALITY PROFILE
- big_five_traits: {openness, conscientiousness, extraversion, agreeableness, neuroticism} (0-100)
- communication_style: formal, casual, aggressive, passive, humorous
- emotional_patterns: positive, negative, volatile, stable
- interests_hobbies: Recurring topics
- political_social: Ideological indicators
- risk_behaviors: Substance use, dangerous activities

### 7. NETWORK GRAPH
nodes: [{id, type: person/location/org/event, attributes, confidence}]
edges: [{source, target, relationship, strength, evidence, confidence}]

### 8. UNCERTAINTIES & LIMITATIONS
- Attribution gaps
- Potential contamination (aggregator spam, unrelated mentions)
- Recommended verification steps

OUTPUT SCHEMA:
{
  "profile_summary": {...},
  "entities": {...},
  "relationships": [...],
  "temporal": {...},
  "sensitive_flags": [...],
  "personality": {...},
  "network": {...},
  "uncertainties": [...],
  "recommendations": [...]
}`;

// Geriye dönük uyumluluk takma adı (Server & Report bileşenleri için)
export const SYSTEM_PROMPT_ANALYZE = SYSTEM_PROMPT_UNIFIED;

/**
 * URL ve domain referanslarını temizleme fonksiyonu
 */
export function cleanSnippetForAnalysis(text: string): string {
  let cleaned = text.replace(/https?:\/\/\S+|www\.\S+/gi, "");
  cleaned = cleaned.replace(/instagram\.com\/\S*/gi, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

/**
 * Ham snippet dizisini alıp temizlenmiş metin parçalarına çevirir
 */
export function prepareSnippetsBatch(items: SnippetBatchItem[]): string[] {
  return items
    .map((it, idx) => {
      const cleaned = cleanSnippetForAnalysis(it.snippet || "");
      return cleaned ? `[Snippet ${idx + 1}]: ${cleaned}` : null;
    })
    .filter((s): s is string => Boolean(s));
}

/**
 * Kullanıcı Batch Prompt Şablonu (Tekil arama parçacıkları veya birleşik girdi için)
 */
export function buildUserPromptTemplate(
  username: string,
  cleanedSnippets: string[]
): string {
  const cleanUser = (username || "target_user").replace(/^@/, "").trim();
  return buildUnifiedPrompt({
    target_username: cleanUser,
    snippets: cleanedSnippets.map((text, idx) => ({
      text,
      source_context: "aggregator",
    })),
  });
}

/**
 * Unified Prompt Oluşturucu (Yorumlar + Google Arama İndeksi Parçacıkları)
 */
export function buildUnifiedPrompt(data: UnifiedDataInput): string {
  const { target_username, full_name, bio, post_count, date_range, comments, snippets } = data;
  
  const sections: string[] = [];
  
  // Context section
  sections.push(`TARGET: @${target_username.replace(/^@/, "")}`);
  if (full_name) sections.push(`NAME: ${full_name}`);
  if (bio) sections.push(`BIO: ${bio}`);
  if (post_count) sections.push(`POSTS ANALYZED: ${post_count}`);
  if (date_range) sections.push(`DATE RANGE: ${date_range}`);
  
  // Verified comments section
  if (comments && comments.length > 0) {
    sections.push(`
VERIFIED INSTAGRAM COMMENTS (${comments.length} items):
${comments.map((c, i) => 
  `[C${i+1}] ${c.timestamp} | @${c.author}: "${c.text}"${c.is_target_owner ? " [TARGET'S OWN COMMENT]" : ""}`
).join("\n")}`);
  }
  
  // Unverified snippets section
  if (snippets && snippets.length > 0) {
    sections.push(`
UNVERIFIED SEARCH INDEX SNIPPETS (${snippets.length} items):
${snippets.map((s, i) => 
  `[S${i+1}]${s.source_context ? ` [${s.source_context}]` : ""}${s.indexed_date ? ` [${s.indexed_date}]` : ""}: "${s.text}"`
).join("\n")}

WARNING: Snippets may be third-party content. Treat with lower confidence.`);
  }
  
  sections.push(`
Execute full analysis. Distinguish VERIFIED (C#) vs UNVERIFIED (S#) sources in all evidence fields.
Output valid JSON only.`);
  
  return sections.join("\n\n");
}
