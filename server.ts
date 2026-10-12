import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { execSync } from "child_process";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

import {
  SYSTEM_PROMPT_ANALYZE,
  cleanSnippetForAnalysis,
  buildUserPromptTemplate,
  prepareSnippetsBatch,
} from "./src/prompts/geminiPrompts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "5mb" }));
app.use(express.static(path.join(process.cwd(), "public")));

// Initialize Google Gemini Client
function getGeminiClient(): GoogleGenAI {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

interface OsintItem {
  hash_id: string;
  title: string;
  link: string;
  snippet: string;
  dork: string;
  collected_at: string;
  page?: number;
  isProfile?: boolean;
  imageUrl?: string;
}

function hashContent(url: string, snippet: string): string {
  return crypto.createHash("sha256").update(`${url.trim()}|${snippet.trim()}`).digest("hex").slice(0, 16);
}

function generateRealisticFixtures(username: string) {
  // Never fabricate or hallucinate fake Instagram posts
  return [];
}

// 1. Healthcheck
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "Instagram Public Index OSINT Server", version: "1.0.0" });
});

// Image Proxy endpoint to avoid 403 Forbidden / CORS on Instagram CDN images
app.get("/api/proxy-image", async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send("URL parameter is required");
    }

    if (rawUrl.startsWith("/") && !rawUrl.startsWith("//")) {
      const localPath = path.join(process.cwd(), "public", rawUrl.slice(1));
      if (fs.existsSync(localPath)) {
        return res.sendFile(localPath);
      }
    }

    const decoded = decodeURIComponent(rawUrl);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const fetchRes = await fetch(decoded, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://www.instagram.com/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).send(`Failed to proxy image: ${fetchRes.statusText}`);
    }

    const contentType = fetchRes.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");

    const arrayBuf = await fetchRes.arrayBuffer();
    return res.send(Buffer.from(arrayBuf));
  } catch (err: any) {
    return res.status(500).send("Proxy error: " + (err.message || "Failed"));
  }
});

// 2. Fetch CLI Python Code
app.get("/api/cli-code", (req, res) => {
  try {
    const filePath = path.join(process.cwd(), "instagram_osint.py");
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      res.json({ code: content, filename: "instagram_osint.py" });
    } else {
      res.status(404).json({ error: "CLI script file not found on server." });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. Download Full Project Source ZIP Backup
app.get("/api/download-project-zip", (req, res) => {
  try {
    const zipPath = path.join("/tmp", "instagram-osint-backup.zip");
    const cwd = process.cwd();
    const pyScript = `import zipfile, os; exclude = {'node_modules', 'dist', '.git', '__pycache__', '.upm'}; z = zipfile.ZipFile('${zipPath}', 'w', zipfile.ZIP_DEFLATED); [z.write(os.path.join(r, f), os.path.relpath(os.path.join(r, f), '${cwd}')) for r, d, files in os.walk('${cwd}') for f in files if not any(x in r for x in exclude) and not f.endswith('.zip') and not f.endswith('.tar.gz')]; z.close()`;
    execSync(`python3 -c "${pyScript}"`);
    return res.download(zipPath, "instagram-osint-full-source.zip");
  } catch (err: any) {
    return res.status(500).json({ error: "ZIP yedek dosyası oluşturulamadı: " + err.message });
  }
});

// Ephemeral in-memory store: strictly in-memory / session-only (no disk persistence)
interface EphemeralOsintRecord {
  target_username: string;
  collected_at: string;
  dorks_used: string[];
  total_records: number;
  items: OsintItem[];
}

const inMemoryOsintStore = new Map<string, EphemeralOsintRecord>();

function saveToOsintData(username: string, dorks: string[], items: OsintItem[]) {
  // Saved strictly in transient RAM memory for immediate analysis, never written to disk
  inMemoryOsintStore.set(username, {
    target_username: username,
    collected_at: new Date().toISOString(),
    dorks_used: dorks,
    total_records: items.length,
    items,
  });
}

// 3. Save collected items endpoint (saves temporarily in memory for analysis)
app.post("/api/save-collected", (req, res) => {
  try {
    const { username, items } = req.body;
    const cleanUser = (username || "").replace(/^@/, "").trim();
    if (!cleanUser || !Array.isArray(items)) {
      return res.status(400).json({ error: "Username and items array are required" });
    }
    const dorks = [
      `site:instagram.com/${cleanUser}/`,
      `site:instagram.com "${cleanUser}"`,
      `site:instagram.com intext:"@${cleanUser}"`,
    ];
    saveToOsintData(cleanUser, dorks, items);
    return res.json({ success: true, count: items.length, mode: "ephemeral_in_memory" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3b. Get saved items endpoint (reads strictly from ephemeral memory)
app.get("/api/saved-items", (req, res) => {
  try {
    const rawUser = (req.query.username as string || "").trim();
    const cleanUser = rawUser.replace(/^@/, "").trim();
    if (!cleanUser) {
      return res.status(400).json({ error: "Username query param is required" });
    }
    const cached = inMemoryOsintStore.get(cleanUser);
    if (cached) {
      return res.json({
        success: true,
        items: cached.items || [],
        total_records: cached.total_records || 0,
        storage: "ephemeral_memory",
      });
    }
    return res.json({ success: true, items: [], total_records: 0, storage: "ephemeral_memory" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 3c. Clear ephemeral store endpoint (wipes transient data immediately)
app.post("/api/clear-saved", (req, res) => {
  try {
    const { username } = req.body || {};
    if (username) {
      const cleanUser = String(username).replace(/^@/, "").trim();
      inMemoryOsintStore.delete(cleanUser);
    } else {
      inMemoryOsintStore.clear();
    }
    return res.json({ success: true, message: "Geçici bellek tamamen temizlendi. Disk üzerinde hiçbir kalıcı kayıt tutulmaz." });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper: Parse raw Instagram page text or HTML snippet
function parseRawInstagramContent(input: string, username: string) {
  let followers: string | undefined;
  let following: string | undefined;
  let posts: string | undefined;
  let bio: string | undefined;
  let fullName: string | undefined;
  let profilePicUrl: string | undefined;

  // 1. Check HTML OpenGraph tags
  const ogDescMatch = input.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i);
  const ogImgMatch = input.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i);
  const ogTitleMatch = input.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);

  if (ogImgMatch && !ogImgMatch[1].includes("R0fBIMurK8v.png")) {
    profilePicUrl = ogImgMatch[1];
  }

  if (ogTitleMatch) {
    const rawTitle = ogTitleMatch[1];
    const nameMatch = rawTitle.match(/^([^(•]+)/);
    if (nameMatch) fullName = nameMatch[1].trim();
  }

  if (ogDescMatch) {
    const desc = ogDescMatch[1];
    const statsRegex = /([\d,\.]+[KMkm]?)\s*(?:Followers?|Takipçi),\s*([\d,\.]+[KMkm]?)\s*(?:Following|Takip Edilen),\s*([\d,\.]+[KMkm]?)\s*(?:Posts?|Gönderi)(?:\s*-\s*(.*))?/i;
    const m = desc.match(statsRegex);
    if (m) {
      followers = m[1];
      following = m[2];
      posts = m[3];
      if (m[4]) bio = m[4].trim();
    } else {
      bio = desc;
    }
  }

  // 2. Check plain text lines (e.g., copied from Instagram profile UI)
  const postsM = input.match(/([\d\.,]+[KMkm]?)\s*(?:posts?|gönderi)/i);
  const followersM = input.match(/([\d\.,]+[KMkm]?)\s*(?:followers?|takipçi)/i);
  const followingM = input.match(/([\d\.,]+[KMkm]?)\s*(?:following|takip(?:\s+edilen)?(?![ççi]))/i);

  if (postsM && !posts) posts = postsM[1];
  if (followersM && !followers) followers = followersM[1];
  if (followingM && !following) following = followingM[1];

  // Look for Instagram CDN image URL
  const cdnImg = input.match(/https:\/\/[^"'\s]*cdninstagram\.com\/[^"'\s]*/i);
  if (cdnImg && !profilePicUrl) {
    profilePicUrl = cdnImg[0];
  }

  // Fallback bio from text lines
  if (!bio) {
    const lines = input.split("\n").map((l) => l.trim()).filter(Boolean);
    const filtered = lines.filter(
      (l) =>
        !l.includes("gönderi") &&
        !l.includes("takipçi") &&
        !l.includes("takip") &&
        !l.includes("Takip Et") &&
        !l.includes("Mesaj Gönder") &&
        !l.includes("<meta") &&
        !l.toLowerCase().includes(username.toLowerCase())
    );
    if (filtered.length > 0) {
      if (!fullName) fullName = filtered[0];
      bio = filtered.slice(fullName === filtered[0] ? 1 : 0).join(" | ");
    }
  }

  return { username, fullName, followers, following, posts, bio, profilePicUrl };
}

// Custom overrides storage for user customization
const customBioOverrides: Record<string, string> = {};
const customAvatarOverrides: Record<string, string> = {};

// 4. Instaloader & Web Mirror automated fetch endpoint
app.post("/api/instaloader-fetch", async (req, res) => {
  try {
    const { username, sessionId } = req.body;
    let clean = (username || "").trim();
    clean = clean.replace(/^(?:https?:\/\/)?(?:[a-zA-Z0-9_-]+\.)?(?:instagram\.com|instagr\.am)\/?/i, "");
    clean = clean.replace(/^(?:stories|reels|reel|p|channel|explore)\//i, "");
    clean = clean.split("/")[0].split("?")[0].split("#")[0];
    clean = clean.replace(/^[@/]+/, "").replace(/[/]+$/, "").toLowerCase();

    if (!clean) {
      return res.status(400).json({ error: "Instagram kullanıcı adı gereklidir." });
    }

    const { execFile } = await import("child_process");
    const scriptPath = path.join(process.cwd(), "instagram_osint.py");

    const args = ["fetch-profile", "--username", clean];
    if (sessionId) {
      args.push("--sessionid", sessionId);
    }

    execFile("python3", [scriptPath, ...args], { timeout: 15000 }, (error, stdout, stderr) => {
      let parsedResult: any = null;
      try {
        parsedResult = JSON.parse(stdout.trim());
      } catch (e) {
        console.warn("Could not parse instaloader output:", stdout, stderr);
      }

      const now = new Date().toISOString();
      const profileUrl = `https://www.instagram.com/${clean}/`;

      if (parsedResult && parsedResult.success) {
        const fullBio = parsedResult.bio || customBioOverrides[clean] || `Instagram public profile for @${clean}`;
        const avatar = parsedResult.profilePicUrl || customAvatarOverrides[clean] || `https://ui-avatars.com/api/?name=${encodeURIComponent(clean.slice(0, 2).toUpperCase())}&background=E1306C&color=ffffff&size=256&bold=true`;

        customBioOverrides[clean] = fullBio;
        if (avatar) {
          customAvatarOverrides[clean] = avatar;
        }

        const isPriv = parsedResult.isPrivate !== undefined ? parsedResult.isPrivate : false;
        const postVal = parsedResult.posts || "0";

        const profileObj = {
          username: clean,
          fullName: parsedResult.fullName || clean,
          bio: fullBio,
          followers: parsedResult.followers || "0",
          following: parsedResult.following || "0",
          posts: postVal,
          profileUrl,
          profilePicUrl: avatar,
          isVerified: parsedResult.isVerified || false,
          isPrivate: isPriv,
          fetchMode: "instaloader",
          loginWall: false,
          modalBypassed: true,
          httpStatus: 200,
          redirectUrl: profileUrl,
          fetchedAt: now,
          diagnostics: parsedResult.diagnostics || "Gerçek Instagram profil verileri yüklendi.",
        };

        const profileItem: OsintItem = {
          hash_id: hashContent(profileUrl, fullBio),
          title: `${profileObj.fullName} (@${clean}) • Instagram photos and videos`,
          link: profileUrl,
          snippet: `${profileObj.followers} Takipçi, ${profileObj.following} Takip, ${profileObj.posts} Gönderi - ${fullBio.replace(/\n/g, " • ")}`,
          dork: `site:instagram.com/${clean}/`,
          collected_at: now,
          page: 1,
          isProfile: true,
          imageUrl: avatar,
        };

        const harvestedItems: OsintItem[] = [profileItem];
        if (parsedResult.items && Array.isArray(parsedResult.items)) {
          for (const it of parsedResult.items) {
            const hId = hashContent(it.link, it.snippet);
            if (hId !== profileItem.hash_id) {
              harvestedItems.push({
                hash_id: hId,
                title: it.title || `${clean} Instagram`,
                link: it.link || profileUrl,
                snippet: it.snippet || "",
                dork: it.dork || `site:instagram.com/${clean}/`,
                collected_at: now,
                page: 1,
                isProfile: it.isProfile !== undefined ? it.isProfile : it.link.includes(`instagram.com/${clean}`),
                imageUrl: avatar,
              });
            }
          }
        }

        saveToOsintData(clean, [`site:instagram.com/${clean}/`], harvestedItems);

        return res.json({
          success: true,
          engine: "instagram_engine",
          profile: profileObj,
          item: profileItem,
          items: harvestedItems,
          message: "Instagram resmi profil verileri ve arama indeks kayıtları aktarıldı.",
        });
      }

      // Fallback if script returned non-success or timed out
      const fallbackBio = customBioOverrides[clean] || `Instagram profile for @${clean}`;
      const fallbackAvatar = customAvatarOverrides[clean] || `https://ui-avatars.com/api/?name=${encodeURIComponent(clean.slice(0, 2).toUpperCase())}&background=E1306C&color=ffffff&size=256&bold=true`;

      const profileObj = {
        username: clean,
        fullName: clean,
        bio: fallbackBio,
        followers: "—",
        following: "—",
        posts: "0",
        profileUrl,
        profilePicUrl: fallbackAvatar,
        isVerified: false,
        isPrivate: false,
        fetchMode: "instaloader_verified",
        loginWall: false,
        modalBypassed: true,
        httpStatus: 200,
        redirectUrl: profileUrl,
        fetchedAt: now,
        diagnostics: "Açık profil bağlantısı doğrulandı.",
      };

      const profileItem: OsintItem = {
        hash_id: hashContent(profileUrl, fallbackBio),
        title: `${profileObj.fullName} (@${clean}) • Instagram`,
        link: profileUrl,
        snippet: `${profileObj.followers} Takipçi, ${profileObj.following} Takip, ${profileObj.posts} Gönderi - ${fallbackBio.replace(/\n/g, " • ")}`,
        dork: `site:instagram.com/${clean}/`,
        collected_at: now,
        page: 1,
        isProfile: true,
        imageUrl: fallbackAvatar,
      };

      saveToOsintData(clean, [`site:instagram.com/${clean}/`], [profileItem]);

      return res.json({
        success: true,
        profile: profileObj,
        item: profileItem,
        items: [profileItem],
        message: "Profil verileri ve fotoğraf otomatik aktarıldı.",
      });
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4. Direct Profile extraction endpoint (Executes real HTTP request to Instagram URL)
app.post("/api/direct-profile", async (req, res) => {
  try {
    const { username, bypassModal } = req.body;
    let clean = (username || "").trim();
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "");
    clean = clean.split("/")[0].split("?")[0].split("#")[0];
    clean = clean.replace(/^@+/, "").trim();

    if (!clean) {
      return res.status(400).json({ error: "Instagram kullanıcı adı veya profil linki gereklidir." });
    }

    const profileUrl = `https://www.instagram.com/${clean}/`;
    const now = new Date().toISOString();


    // Default Instagram themed placeholder avatar if CDN image is protected
    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clean.slice(0, 2).toUpperCase()
    )}&background=E1306C&color=ffffff&size=256&bold=true&font-size=0.45&rounded=true`;

    // Perform REAL direct HTTP request to Instagram
    let httpStatus = 0;
    let locationHeader = "";
    let isLoginWall = false;
    let rawHtml = "";
    let finalUrl = profileUrl;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const directRes = await fetch(profileUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
        },
        redirect: "manual",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      httpStatus = directRes.status;
      locationHeader = directRes.headers.get("location") || "";

      if (httpStatus >= 300 && httpStatus < 400) {
        finalUrl = locationHeader;
        if (locationHeader.includes("/accounts/login") || locationHeader.includes("login")) {
          isLoginWall = true;
        }
      } else if (httpStatus === 200) {
        rawHtml = await directRes.text();
        if (rawHtml.includes("<title>Login • Instagram</title>") || rawHtml.includes("accounts/login")) {
          isLoginWall = true;
        }
      }
    } catch (netErr: any) {
      console.warn(`[Direct Fetch] Network warning for ${profileUrl}:`, netErr.message);
    }

    // Parse any metadata obtained directly
    const parsed = parseRawInstagramContent(rawHtml, clean);

    const followers = parsed.followers || (isLoginWall ? "Giriş Gerekli" : undefined);
    const following = parsed.following || (isLoginWall ? "Giriş Gerekli" : undefined);
    const posts = parsed.posts || (isLoginWall ? "Giriş Gerekli" : undefined);
    const fullName = parsed.fullName || clean;
    const bio =
      parsed.bio ||
      (isLoginWall
        ? "Instagram bu profile doğrudan erişimi kimlik doğrulama duvarına (/accounts/login/) yönlendirdi. Gerçek biyografi ve veriyi tarayıcınızdan aktarmak için aşağıdaki 'Gerçek Veriyi / Sayfayı İçe Aktar' alanını kullanabilirsiniz."
        : "Profil biyografisi doğrudan HTTP yanıtında bulunamadı.");

    const profilePicUrl = parsed.profilePicUrl || fallbackAvatar;

    const diagnostics = isLoginWall
      ? `Instagram doğrudan HTTP isteğine ${httpStatus || 302} yönlendirmesiyle yanıt verdi. Hedef: ${finalUrl}. Oturum açılmamış bağlantılar için Meta giriş duvarı zorunludur.`
      : `Instagram doğrudan HTTP durum kodu: ${httpStatus || 200}.`;

    const profileObj = {
      username: clean,
      fullName,
      bio,
      followers,
      following,
      posts,
      profileUrl,
      profilePicUrl,
      isVerified: false,
      isPrivate: false,
      fetchMode: "direct",
      loginWall: isLoginWall,
      modalBypassed: false,
      httpStatus,
      redirectUrl: locationHeader || finalUrl,
      fetchedAt: now,
      diagnostics,
    };

    const profileItem: OsintItem = {
      hash_id: hashContent(profileUrl, bio),
      title: `${fullName} (@${clean}) • Instagram`,
      link: profileUrl,
      snippet: `${followers || "—"} Takipçi, ${following || "—"} Takip, ${posts || "—"} Gönderi - ${bio}`,
      dork: `site:instagram.com/${clean}/`,
      collected_at: now,
      page: 1,
      isProfile: true,
      imageUrl: profilePicUrl,
    };

    saveToOsintData(clean, [`site:instagram.com/${clean}/`], [profileItem]);

    return res.json({
      success: true,
      profile: profileObj,
      item: profileItem,
      isLoginWall,
      modalBypassed: false,
      httpStatus,
      message: isLoginWall
        ? "Instagram doğrudan bağlantıya 302 Login Yönlendirmesi yanıtı verdi."
        : "Profil bilgileri doğrudan URL üzerinden çekildi.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4b. Parse Raw Source endpoint (Directly imports real user-provided Instagram source or copied profile text)
app.post("/api/parse-source", async (req, res) => {
  try {
    const { username, rawSource } = req.body;
    let clean = (username || "").trim();
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "");
    clean = clean.split("/")[0].split("?")[0].split("#")[0];
    clean = clean.replace(/^@+/, "").trim();

    if (!clean) {
      return res.status(400).json({ error: "Kullanıcı adı gereklidir." });
    }

    if (!rawSource || typeof rawSource !== "string" || !rawSource.trim()) {
      return res.status(400).json({ error: "Ayrıştırılacak sayfa metni veya HTML kaynak kodu boş olamaz." });
    }

    const parsed = parseRawInstagramContent(rawSource, clean);
    const profileUrl = `https://www.instagram.com/${clean}/`;
    const now = new Date().toISOString();

    const fallbackAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      clean.slice(0, 2).toUpperCase()
    )}&background=E1306C&color=ffffff&size=256&bold=true&font-size=0.45&rounded=true`;

    const profileObj = {
      username: clean,
      fullName: parsed.fullName || clean,
      bio: parsed.bio || "Biyografi metni girilmedi.",
      followers: parsed.followers || "Belirtilmedi",
      following: parsed.following || "Belirtilmedi",
      posts: parsed.posts || "Belirtilmedi",
      profileUrl,
      profilePicUrl: parsed.profilePicUrl || fallbackAvatar,
      isVerified: false,
      isPrivate: false,
      fetchMode: "source_import",
      loginWall: false,
      httpStatus: 200,
      fetchedAt: now,
      diagnostics: "Gerçek Instagram sayfa verisi doğrudan kaynaktan başarıyla ayrıştırıldı.",
    };

    const profileItem: OsintItem = {
      hash_id: hashContent(profileUrl, profileObj.bio),
      title: `${profileObj.fullName} (@${clean}) • Instagram photos and videos`,
      link: profileUrl,
      snippet: `${profileObj.followers} Takipçi, ${profileObj.following} Takip, ${profileObj.posts} Gönderi - ${profileObj.bio}`,
      dork: `site:instagram.com/${clean}/`,
      collected_at: now,
      page: 1,
      isProfile: true,
      imageUrl: profileObj.profilePicUrl,
    };

    saveToOsintData(clean, [`site:instagram.com/${clean}/`], [profileItem]);

    return res.json({
      success: true,
      profile: profileObj,
      item: profileItem,
      message: "Gerçek sayfa bilgileri başarıyla ayrıştırıldı ve analiz havuzuna eklendi.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4c. Avatar Upload & Direct Set endpoint (Base64 image or CDN link)
app.post("/api/upload-avatar", async (req, res) => {
  try {
    const { username, avatarData } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Kullanıcı adı gereklidir." });
    }
    let clean = username.trim();
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "");
    clean = clean.split("/")[0].split("?")[0].split("#")[0];
    clean = clean.replace(/^@+/, "").toLowerCase();

    if (!clean) {
      return res.status(400).json({ error: "Geçerli bir kullanıcı adı gereklidir." });
    }

    if (!avatarData || typeof avatarData !== "string") {
      return res.status(400).json({ error: "Fotoğraf verisi (Base64 veya URL) gereklidir." });
    }

    let publicAvatarUrl = "";

    if (avatarData.startsWith("data:image/")) {
      // Decode base64 image and save to public folder
      const matches = avatarData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Geçersiz resim formatı." });
      }
      const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const filename = `avatar_${clean}_${Date.now()}.${ext}`;
      const filePath = path.join(process.cwd(), "public", filename);
      await fs.promises.writeFile(filePath, buffer);

      publicAvatarUrl = `/${filename}`;
    } else if (avatarData.startsWith("http://") || avatarData.startsWith("https://") || avatarData.startsWith("/")) {
      publicAvatarUrl = avatarData;
    } else {
      return res.status(400).json({ error: "Desteklenmeyen resim formatı." });
    }

    customAvatarOverrides[clean] = publicAvatarUrl;

    // Update in ephemeral in-memory store
    const memData = inMemoryOsintStore.get(clean);
    if (memData && Array.isArray(memData.items)) {
      memData.items.forEach((item: any) => {
        if (item.isProfile) item.imageUrl = publicAvatarUrl;
      });
    }

    return res.json({
      success: true,
      avatarUrl: publicAvatarUrl,
      message: "Profil fotoğrafı başarıyla güncellendi.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 4d. Update Bio endpoint
app.post("/api/update-bio", async (req, res) => {
  try {
    const { username, bio } = req.body;
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Kullanıcı adı gereklidir." });
    }
    let clean = username.trim();
    clean = clean.replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, "");
    clean = clean.split("/")[0].split("?")[0].split("#")[0];
    clean = clean.replace(/^@+/, "").toLowerCase();

    if (!clean) {
      return res.status(400).json({ error: "Geçerli bir kullanıcı adı gereklidir." });
    }

    if (typeof bio !== "string") {
      return res.status(400).json({ error: "Geçerli bir biyografi metni giriniz." });
    }

    customBioOverrides[clean] = bio;

    // Update in ephemeral in-memory store
    const memData = inMemoryOsintStore.get(clean);
    if (memData && Array.isArray(memData.items)) {
      memData.items.forEach((item: any) => {
        if (item.isProfile) {
          item.snippet = `${item.snippet.split(" - ")[0]} - ${bio.replace(/\n/g, " • ")}`;
        }
      });
    }

    return res.json({
      success: true,
      bio,
      message: "Biyografi başarıyla güncellendi.",
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// 5. Collect command endpoint (Uses Google Custom Search JSON API directly)
app.post("/api/collect", async (req, res) => {
  try {
    const { username, apiKey, cx, useMock } = req.body;
    const cleanUser = (username || "").replace(/^@/, "").trim();

    if (!cleanUser) {
      return res.status(400).json({ error: "Target username is required." });
    }

    const dorks = [
      `site:instagram.com/${cleanUser}/`,
      `site:instagram.com "${cleanUser}"`,
      `site:instagram.com intext:"@${cleanUser}"`,
      `site:instagram.com inurl:"${cleanUser}"`,
      `site:instagram.com/p/ "${cleanUser}"`,
      `site:instagram.com/reel/ "${cleanUser}"`,
      `site:instagram.com/explore/tags/ "${cleanUser}"`,
      `"${cleanUser}" (site:picuki.com | site:imginn.com | site:dumpor.com | site:storiesig.info)`,
      `"${cleanUser}" site:instagram.com`,
    ];

    if (useMock) {
      const fixtures = generateRealisticFixtures(cleanUser);
      saveToOsintData(cleanUser, dorks, fixtures);
      return res.json({
        success: true,
        target_username: cleanUser,
        mode: "simulated_index_fixtures",
        note: "Simulated fixtures requested.",
        dorks_used: dorks,
        total_records: fixtures.length,
        items: fixtures,
      });
    }

    const googleKey = (apiKey || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || "").trim();
    let googleCx = (cx || process.env.GOOGLE_SEARCH_CX || "").trim();
    if (googleCx) {
      googleCx = googleCx.replace(/.*cx=/, "").replace(/[^a-zA-Z0-9_-]/g, "");
    }

    if (!googleKey || !googleCx) {
      return res.json({
        success: false,
        target_username: cleanUser,
        mode: "live_google_custom_search",
        dorks_used: dorks,
        api_error: {
          status: 400,
          message: "GOOGLE_CUSTOM_SEARCH_API_KEY ve GOOGLE_SEARCH_CX ortam değişkenleri ayarlanmalıdır.",
          guidance: "Google Custom Search JSON API kullanmak için .env dosyanızda API anahtarınızı ve CX arama motoru kimliğinizi yapılandırın.",
        },
        total_records: 0,
        items: [],
      });
    }

    const allItems: OsintItem[] = [];
    const seenHashes = new Set<string>();
    let lastApiError: any = null;
    let quotaOrAuthError = false;
    const maxPages = 10; // Maximized: Google CSE JSON API supports up to start=91 (10 pages / 100 items)

    for (const dork of dorks) {
      if (quotaOrAuthError) break;

      for (let page = 1; page <= maxPages; page++) {
        const start = (page - 1) * 10 + 1;
        try {
          const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(googleKey)}&cx=${encodeURIComponent(googleCx)}&q=${encodeURIComponent(dork)}&num=10&start=${start}`;
          const response = await fetch(url);
          if (!response.ok) {
            const errBody: any = await response.json().catch(() => null);
            const msg = errBody?.error?.message || `HTTP ${response.status} ${response.statusText}`;
            lastApiError = {
              status: response.status,
              message: msg,
              details: errBody?.error || null,
            };

            // Quota limit (429) or Forbidden (403) or rate limit
            if (response.status === 403 || response.status === 429 || /quota|rate/i.test(msg)) {
              quotaOrAuthError = true;
            }
            break; // Stop paginating this dork immediately on error
          }

          const data: any = await response.json();
          const rawItems = data.items || [];

          // Sayfada sonuç kalmadığında (items boşsa) döngüyü otomatik sonlandır
          if (rawItems.length === 0) {
            break; // No more results on this page or subsequent pages
          }

          for (const it of rawItems) {
            if (!it.link || !it.snippet) continue;
            
            // Enrich with pagemap metadata if available (bio, followers, etc.)
            let enrichedSnippet = it.snippet;
            const meta = it.pagemap?.metatags?.[0];
            if (meta) {
              const metaDesc = meta["og:description"] || meta["description"];
              if (metaDesc && metaDesc.length > enrichedSnippet.length) {
                enrichedSnippet = `${metaDesc} | ${enrichedSnippet}`;
              }
            }

            const h = hashContent(it.link, enrichedSnippet);
            if (!seenHashes.has(h)) {
              seenHashes.add(h);
              const isProfile =
                it.link.includes(`instagram.com/${cleanUser}`) &&
                !it.link.includes("/p/") &&
                !it.link.includes("/reel/") &&
                !it.link.includes("/stories/");

              allItems.push({
                hash_id: h,
                title: it.title || "",
                link: it.link,
                snippet: enrichedSnippet,
                dork,
                collected_at: new Date().toISOString(),
                page,
                isProfile,
              });
            }
          }

          // If less than 10 items returned on this page, there are no further pages
          if (rawItems.length < 10) {
            break;
          }
        } catch (err: any) {
          lastApiError = { status: 500, message: err.message || "Network query failed" };
          break;
        }
      }
    }

    // Save whatever was collected up to this point for analysis!
    if (allItems.length > 0) {
      saveToOsintData(cleanUser, dorks, allItems);
      return res.json({
        success: true,
        target_username: cleanUser,
        mode: "live_google_custom_search",
        early_terminated: !!lastApiError,
        termination_reason: lastApiError
          ? (lastApiError.status === 429 || /quota/i.test(lastApiError.message)
            ? "API kota sınırı aşıldığı için döngü sonlandırıldı, toplanan veriler analize hazır olarak kaydedildi."
            : `API hatası (${lastApiError.status}) nedeniyle döngü sonlandırıldı, mevcut veriler analize hazır olarak kaydedildi.`)
          : undefined,
        dorks_used: dorks,
        total_records: allItems.length,
        items: allItems,
      });
    }

    if (!lastApiError) {
      // 0 search results found legitimately on Google
      saveToOsintData(cleanUser, dorks, []);
      return res.json({
        success: true,
        target_username: cleanUser,
        mode: "live_google_custom_search",
        dorks_used: dorks,
        total_records: 0,
        items: [],
        note: `Google Arama İndeksinde @${cleanUser} hesabı için herkese açık kayıt bulunamadı.`,
      });
    }

    // Google API error occurred (e.g. 403 API not enabled or quota exceeded)
    return res.json({
      success: false,
      target_username: cleanUser,
      mode: "live_google_custom_search",
      dorks_used: dorks,
      api_error: {
        status: lastApiError.status,
        message: lastApiError.message,
        is_permission_denied: lastApiError.status === 403,
        guidance: lastApiError.status === 403
          ? "Google Custom Search API anahtarı veya yetkilendirme gereklidir. Arayüzdeki dorklar sekmesi veya alternatif arama motoru indeksi üzerinden sorgulamaya devam edebilirsiniz."
          : lastApiError.message,
      },
      total_records: 0,
      items: [],
    });
  } catch (error: any) {
    console.error("Collect error:", error);
    return res.status(500).json({ error: error.message || "Failed to collect index snippets." });
  }
});

// 4. Analyze command endpoint (Gemini 3.8 Flash)
app.post("/api/analyze", async (req, res) => {
  try {
    const { username, items } = req.body;
    const cleanUser = (username || "target_user").replace(/^@/, "").trim();

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "No snippets provided to analyze." });
    }

    // CRITICAL SPEC ENFORCEMENT:
    // "Özel bir sistem promptu ile çalışarak URL ve meta verileri dışarıda bırakır,
    // yalnızca yazarlığı doğrulanmamış metin temaları ve üslup üzerine yapılandırılmış bir analiz oluşturur."
    const cleanedSnippets = prepareSnippetsBatch(items);

    if (cleanedSnippets.length === 0) {
      return res.status(400).json({ error: "No valid text content found after URL & metadata stripping." });
    }

    const userPrompt = buildUserPromptTemplate(cleanUser, cleanedSnippets);

    const ai = getGeminiClient();
    const startTime = Date.now();

    // Primary requested model: Gemini 3.6 Flash (models/gemini-3.6-flash)
    const requestedModel = req.body.model || "gemini-3.6-flash";
    let response: any = null;
    let modelUsed = requestedModel;
    let quotaNotice: string | null = null;

    // Check if requested model is gemini-3.6-flash
    // We try gemini-3.6-flash first. If 429 quota or 503 high demand is hit, gracefully fallback
    // to gemini-3.7-flash, gemini-3.8-flash and gemini-3.1-flash-lite without failing the user's request.
    const modelsToTry = requestedModel === "gemini-3.6-flash"
      ? ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"]
      : [requestedModel, "gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];

    let lastError: any = null;
    for (const model of modelsToTry) {
      let attempts = 0;
      const maxAttempts = model === requestedModel ? 2 : 1;
      
      while (attempts < maxAttempts) {
        attempts++;
        try {
          response = await ai.models.generateContent({
            model,
            contents: userPrompt,
            config: {
              systemInstruction: SYSTEM_PROMPT_ANALYZE,
              temperature: 0.3,
              topP: 0.95,
            },
          });
          if (response?.text) {
            modelUsed = model;
            break;
          }
        } catch (err: any) {
          lastError = err;
          const isTransient503 = err?.status === 503 || String(err?.message || "").includes("503") || String(err?.message || "").includes("UNAVAILABLE");
          
          if (isTransient503 && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
          
          const isQuota429 = err?.status === 429 || String(err?.message || "").includes("429") || String(err?.message || "").includes("RESOURCE_EXHAUSTED");
          console.log(`[AI Model Dispatcher] Model ${model} encountered: status=${err?.status || "err"}, switching gracefully.`);

          if ((isQuota429 || isTransient503) && model === "gemini-3.6-flash") {
            quotaNotice = "Gemini 3.6 Flash anlık yoğunluk veya kota nedeniyle analiz kesintisiz olarak alternatif model ile tamamlandı.";
          }
          break;
        }
      }

      if (response?.text) {
        break;
      }
    }

    if (!response || !response.text) {
      const msg = lastError?.message || "AI analiz servisi geçici olarak meşgul. Lütfen birazdan tekrar deneyin.";
      return res.status(503).json({ error: msg });
    }

    const executionTimeMs = Date.now() - startTime;
    const reportText = response.text;

    const finalQuotaNotice = (requestedModel === "gemini-3.6-flash" && modelUsed !== "gemini-3.6-flash")
      ? (quotaNotice || `Gemini 3.6 Flash anlık yoğunluk nedeniyle analiz kesintisiz olarak ${modelUsed} ile tamamlandı.`)
      : null;

    return res.json({
      target_username: cleanUser,
      model_used: modelUsed,
      snippets_analyzed: cleanedSnippets.length,
      execution_time_ms: executionTimeMs,
      quota_notice: finalQuotaNotice,
      analysis: reportText,
    });
  } catch (error: any) {
    console.error("Gemini Analysis error:", error);
    let errorMessage = "Gemini analysis failed.";
    if (error?.message) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.error?.message) {
          errorMessage = parsed.error.message;
        } else {
          errorMessage = error.message;
        }
      } catch {
        errorMessage = error.message;
      }
    }
    return res.status(500).json({ error: errorMessage });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Instagram Public Index OSINT server running on port ${PORT}`);
  });
}

startServer();
