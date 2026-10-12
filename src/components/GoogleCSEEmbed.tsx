import React, {
  useEffect,
  useState,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Search,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Layers,
  Loader2,
  RefreshCw,
  BookOpen,
  Square,
  StopCircle,
} from "lucide-react";
import { OsintItem, UserProfile } from "../types";
import { parseInstagramProfileData } from "../utils/instagramParser";

export interface GoogleCSEEmbedRef {
  startAutomatedCrawl: (dorkToUse?: string, multiDork?: boolean) => Promise<OsintItem[]>;
  startAutomated5PageCrawl: (dorkToUse?: string) => Promise<OsintItem[]>;
  stopCrawl: () => void;
  isCrawling: () => boolean;
}

interface GoogleCSEEmbedProps {
  username: string;
  onImportItems: (items: OsintItem[], profile?: UserProfile | null) => void;
  apiError?: {
    status?: number;
    message?: string;
    activation_url?: string;
    guidance?: string;
  } | null;
  triggerAutoCrawl?: number;
  onProgress?: (progressText: string, pageNum: number) => void;
}

export const GoogleCSEEmbed = forwardRef<GoogleCSEEmbedRef, GoogleCSEEmbedProps>(
  ({ username, onImportItems, apiError, triggerAutoCrawl = 0, onProgress }, ref) => {
    const [crawlProgress, setCrawlProgress] = useState<string | null>(null);
    const [isCrawling, setIsCrawling] = useState(false);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalFound, setTotalFound] = useState<number>(0);

    const cleanUser = username.replace(/^@/, "").trim() || "target_user";
    const isCrawlingRef = useRef(false);
    const abortCrawlRef = useRef(false);
    const lastTriggerRef = useRef(0);

    // Ensure CSE script is loaded if CX is configured
    useEffect(() => {
      const cxId =
        (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_GOOGLE_SEARCH_CX) || "";
      if (!cxId) return;

      const existingScript = document.getElementById("google-cse-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-cse-script";
        script.src = `https://cse.google.com/cse.js?cx=${encodeURIComponent(cxId)}`;
        script.async = true;
        document.head.appendChild(script);
      }
    }, []);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const cancellableSleep = async (ms: number): Promise<boolean> => {
      const step = 80;
      let elapsed = 0;
      while (elapsed < ms) {
        if (abortCrawlRef.current) return false;
        await sleep(Math.min(step, ms - elapsed));
        elapsed += step;
      }
      return !abortCrawlRef.current;
    };

    // Safe, non-blocking cleanup helper for Google CSE overlays
    const cleanupGoogleOverlays = () => {
      if (typeof document === "undefined") return;
      if (document.body.classList.contains("gsc-overflow-hidden")) {
        document.body.classList.remove("gsc-overflow-hidden");
      }
      const overlays = document.querySelectorAll(
        ".gsc-modal-background-image, .gsc-results-wrapper-overlay, .gsc-modal-background-image-visible, .gsc-results-wrapper-overlay-visible, .gsc-overflow-hidden-overlay"
      );
      overlays.forEach((el) => {
        const h = el as HTMLElement;
        if (h.style.display !== "none") {
          h.style.display = "none";
          h.style.visibility = "hidden";
          h.style.pointerEvents = "none";
        }
      });
      const closeBtn = document.querySelector(".gsc-results-close-btn") as HTMLElement;
      if (closeBtn) {
        try { closeBtn.click(); } catch {}
      }
    };

    // Run safe cleanup on mount and unmount only
    useEffect(() => {
      cleanupGoogleOverlays();
      return () => {
        cleanupGoogleOverlays();
      };
    }, []);

    const extractCurrentPageResults = async (pageNum: number): Promise<OsintItem[]> => {
      const resultNodes = document.querySelectorAll(".gsc-webResult.gsc-result");
      const harvested: OsintItem[] = [];

      for (const node of Array.from(resultNodes)) {
        const titleEl = node.querySelector(".gs-title a") || node.querySelector(".gs-title");
        const snippetEl = node.querySelector(".gs-snippet");
        const urlEl = node.querySelector(".gs-visibleUrl");

        const title = (titleEl?.textContent || "").trim();
        const snippet = (snippetEl?.textContent || "").trim();
        const link =
          (titleEl as HTMLAnchorElement)?.href ||
          (urlEl?.textContent
            ? `https://${urlEl.textContent.trim()}`
            : `https://www.instagram.com/${cleanUser}/`);

        if (!snippet && !title) continue;

        // SHA-256 hash for deduplication
        const hashBuffer = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(`${link}|${snippet}`)
        );
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);

        const isProfile =
          link.includes(`instagram.com/${cleanUser}`) &&
          !link.includes("/p/") &&
          !link.includes("/reel/") &&
          !link.includes("/stories/");

        const imgEl =
          node.querySelector(".gs-image-box img") ||
          node.querySelector(".gsc-thumbnail-inside img") ||
          node.querySelector("img.gs-image");
        const imageUrl = (imgEl as HTMLImageElement)?.src || undefined;

        harvested.push({
          hash_id: hashHex,
          title: title || `${cleanUser} on Instagram`,
          link,
          snippet: snippet || title,
          dork: `site:instagram.com "${cleanUser}"`,
          collected_at: new Date().toISOString(),
          page: pageNum,
          isProfile,
          imageUrl,
        });
      }

      return harvested;
    };

    const executeDorkSafely = async (dorkQuery: string): Promise<boolean> => {
      try {
        (window as any).google?.search?.cse?.element?.go();
      } catch {}

      for (let attempt = 0; attempt < 25; attempt++) {
        if (abortCrawlRef.current) return false;

        try {
          const gElement = (window as any).google?.search?.cse?.element?.getElement("osint-search");
          if (gElement && typeof gElement.execute === "function") {
            gElement.execute(dorkQuery);
            return true;
          }
        } catch {}

        const input = document.querySelector(".gsc-input-box input.gsc-input") as HTMLInputElement;
        const searchBtn = document.querySelector("button.gsc-search-button") as HTMLButtonElement;
        if (input && searchBtn) {
          input.value = dorkQuery;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          searchBtn.click();
          return true;
        }

        if (attempt === 3 || attempt === 8) {
          try {
            (window as any).google?.search?.cse?.element?.go();
          } catch {}
        }

        const ok = await cancellableSleep(200);
        if (!ok) return false;
      }
      return false;
    };

    // Check Google CSE DOM for empty results, API error, or quota limit
    const checkCseStatus = (): {
      hasError: boolean;
      isQuotaExceeded: boolean;
      noResults: boolean;
      reason?: string;
    } => {
      if (typeof document === "undefined") {
        return { hasError: false, isQuotaExceeded: false, noResults: false };
      }
      const cseBox = document.querySelector(".gcse-search, .gsc-control-cse");
      const pageText = ((cseBox?.textContent || "") + " " + (document.body?.innerText || "")).toLowerCase();

      const hasErrorEl = !!document.querySelector(".gs-error-result, .gsc-error");
      const hasNoResultsEl = !!document.querySelector(".gs-no-results-result");

      const isQuota =
        pageText.includes("quota") ||
        pageText.includes("rate limit") ||
        pageText.includes("daily limit") ||
        pageText.includes("too many requests") ||
        pageText.includes("429");

      const isError =
        hasErrorEl ||
        pageText.includes("service unavailable") ||
        pageText.includes("access forbidden") ||
        pageText.includes("403 forbidden");

      const noResults =
        hasNoResultsEl ||
        pageText.includes("eşleşen hiçbir sonuç bulunamadı") ||
        pageText.includes("sonuç bulunamadı") ||
        pageText.includes("no results found");

      let reason: string | undefined;
      if (isQuota) {
        reason = "Google Search API günlük kota / istek limiti aşıldı.";
      } else if (isError) {
        reason = "Google Search API / CSE hata yanıtı döndürdü.";
      } else if (noResults) {
        reason = "Sayfada sonuç kalmadı (items boş).";
      }

      return {
        hasError: isError,
        isQuotaExceeded: isQuota,
        noResults,
        reason,
      };
    };

    // Stop crawl function triggered either by user or internally
    const stopCrawl = () => {
      abortCrawlRef.current = true;
      const msg = "[!] İndeks toplama durduruldu. Toplanan kayıtlar kaydediliyor...";
      setCrawlProgress(msg);
      onProgress?.(msg, currentPage);
    };

    // Automated Continuous Deep Crawler: crawls as many pages and dorks as possible until results end or user stops
    const startAutomatedCrawl = async (
      dorkToUse?: string,
      multiDork: boolean = false
    ): Promise<OsintItem[]> => {
      if (isCrawlingRef.current) return [];
      isCrawlingRef.current = true;
      abortCrawlRef.current = false;
      setIsCrawling(true);

      const dorkList = dorkToUse
        ? [dorkToUse]
        : multiDork
        ? [
            `site:instagram.com "${cleanUser}"`,
            `site:instagram.com intext:"@${cleanUser}"`,
            `site:instagram.com inurl:"${cleanUser}"`,
            `site:instagram.com/p/ "${cleanUser}"`,
            `site:instagram.com/reel/ "${cleanUser}"`,
            `site:instagram.com/${cleanUser}/`,
            `site:instagram.com intext:"${cleanUser}"`,
            `"${cleanUser}" site:instagram.com`,
          ]
        : [`site:instagram.com "${cleanUser}"`];

      const allHarvestedMap = new Map<string, OsintItem>();
      let earlyTerminated = false;
      let terminationReason = "";

      try {
        for (let dorkIdx = 0; dorkIdx < dorkList.length; dorkIdx++) {
          if (abortCrawlRef.current) {
            earlyTerminated = true;
            terminationReason = "Kullanıcı isteğiyle tarama durduruldu.";
            break;
          }

          const currentDork = dorkList[dorkIdx];
          const dorkLabel = dorkList.length > 1 ? `[Dork ${dorkIdx + 1}/${dorkList.length}] ` : "";
          const startMsg = `${dorkLabel}Google CSE aranıyor: ${currentDork}...`;
          setCrawlProgress(startMsg);
          onProgress?.(startMsg, 1);
          setCurrentPage(1);

          // Get previous first link fingerprint to detect when new search results appear
          const prevDorkFirstLink = document.querySelector(".gsc-webResult.gsc-result .gs-title a")?.getAttribute("href") || "";

          await executeDorkSafely(currentDork);

          // Wait for results of this dork to actually render in the DOM
          for (let waitResults = 0; waitResults < 25; waitResults++) {
            if (abortCrawlRef.current) break;
            const ok = await cancellableSleep(180);
            if (!ok) break;

            const curDorkFirstLink = document.querySelector(".gsc-webResult.gsc-result .gs-title a")?.getAttribute("href") || "";
            const status = checkCseStatus();
            if (status.hasError || status.isQuotaExceeded || status.noResults) {
              break;
            }

            // Results changed from previous dork OR first dork results loaded
            if (curDorkFirstLink && (dorkIdx === 0 || curDorkFirstLink !== prevDorkFirstLink)) {
              await cancellableSleep(200);
              break;
            }
          }

          if (abortCrawlRef.current) {
            earlyTerminated = true;
            terminationReason = "Kullanıcı isteğiyle tarama durduruldu.";
            break;
          }

          // Check status on Page 1
          const status1 = checkCseStatus();
          if (status1.isQuotaExceeded) {
            earlyTerminated = true;
            terminationReason = "Google Search API kota sınırı döndürdü. Döngü sonlandırıldı, mevcut veriler aktarıldı.";
            onProgress?.(`[!] Kota limiti tespit edildi. Mevcut veriler kaydediliyor...`, 1);
            break;
          } else if (status1.hasError) {
            earlyTerminated = true;
            terminationReason = "Google Search API hata döndürdü. Mevcut veriler aktarıldı.";
            onProgress?.(`[!] API hatası tespit edildi. Döngü tamamlandı.`, 1);
            break;
          }

          const p1Items = await extractCurrentPageResults(1);
          p1Items.forEach((it) => {
            it.dork = currentDork;
            allHarvestedMap.set(it.hash_id, it);
          });
          setTotalFound(allHarvestedMap.size);

          if (p1Items.length === 0 || status1.noResults) {
            continue;
          }

          // Continuous Pagination: Crawl page 2, 3, 4, ... as long as Google CSE has cursor pages!
          let page = 2;
          const MAX_CSE_PAGES = 15;
          let consecutiveZeroNewPages = 0;

          while (page <= MAX_CSE_PAGES) {
            if (abortCrawlRef.current) {
              earlyTerminated = true;
              terminationReason = "Kullanıcı isteğiyle tarama durduruldu.";
              break;
            }

            // Find cursor page button for this page in Google CSE DOM
            const cursorPages = Array.from(document.querySelectorAll(".gsc-cursor-page"));
            const targetPageBtn = cursorPages.find((el) => {
              const text = el.textContent?.trim();
              return text === String(page);
            }) as HTMLElement;

            if (!targetPageBtn) {
              // No more pagination cursor pages available for this dork
              onProgress?.(`[i] ${dorkLabel}Daha fazla sayfa kalmadı (${page - 1} sayfa tarandı).`, page);
              break;
            }

            setCurrentPage(page);
            const pMsg = `${dorkLabel}Sayfa ${page} taranıyor... (Toplam ${allHarvestedMap.size} kayıt toplandı)`;
            setCrawlProgress(pMsg);
            onProgress?.(pMsg, page);

            // Record link from previous page
            const prevPageFirstLink = document.querySelector(".gsc-webResult.gsc-result .gs-title a")?.getAttribute("href") || "";

            targetPageBtn.click();

            // Wait for Google CSE to load the new page results
            let pageUpdated = false;
            for (let waitPage = 0; waitPage < 25; waitPage++) {
              if (abortCrawlRef.current) break;
              await cancellableSleep(150);

              const activeCursor = document.querySelector(".gsc-cursor-current-page")?.textContent?.trim();
              const curPageFirstLink = document.querySelector(".gsc-webResult.gsc-result .gs-title a")?.getAttribute("href") || "";

              if (activeCursor === String(page) && curPageFirstLink !== prevPageFirstLink) {
                pageUpdated = true;
                await cancellableSleep(200);
                break;
              }
            }

            if (abortCrawlRef.current) {
              earlyTerminated = true;
              terminationReason = "Kullanıcı isteğiyle tarama durduruldu.";
              break;
            }

            const pageStatus = checkCseStatus();
            if (pageStatus.isQuotaExceeded) {
              earlyTerminated = true;
              terminationReason = `${page}. sayfada API kota sınırı aşıldı.`;
              break;
            }
            if (pageStatus.hasError) {
              earlyTerminated = true;
              terminationReason = `${page}. sayfada API hata yanıtı döndürdü.`;
              break;
            }

            const pageItems = await extractCurrentPageResults(page);
            if (pageItems.length === 0 || pageStatus.noResults) {
              break;
            }

            let newOnPageCount = 0;
            pageItems.forEach((it) => {
              it.dork = currentDork;
              if (!allHarvestedMap.has(it.hash_id)) {
                newOnPageCount++;
              }
              allHarvestedMap.set(it.hash_id, it);
            });
            setTotalFound(allHarvestedMap.size);

            if (newOnPageCount === 0) {
              consecutiveZeroNewPages++;
              if (consecutiveZeroNewPages >= 2) {
                // If 2 consecutive pages had no new unique items, move to next dork
                break;
              }
            } else {
              consecutiveZeroNewPages = 0;
            }

            page++;
          }
        }
      } catch (err: any) {
        console.warn("Crawl loop encounter:", err);
      }

      let finalItems = Array.from(allHarvestedMap.values());

      // If browser blocked Google CSE or yielded 0 items, check saved items from server
      if (finalItems.length === 0) {
        try {
          const savedRes = await fetch(`/api/saved-items?username=${encodeURIComponent(cleanUser)}`);
          if (savedRes.ok) {
            const savedData = await savedRes.json();
            if (savedData.items && savedData.items.length > 0) {
              finalItems = savedData.items;
              setTotalFound(finalItems.length);
            }
          }
        } catch {}
      }

      // Extract profile bio and metadata from all collected records
      const parsedProfile = parseInstagramProfileData(cleanUser, finalItems);

      // Save collected data to temporary memory
      if (finalItems.length > 0) {
        try {
          await fetch("/api/save-collected", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: cleanUser,
              items: finalItems,
              early_terminated: earlyTerminated,
              termination_reason: terminationReason || undefined,
            }),
          });
        } catch (err) {
          console.warn("Failed to persist harvested items:", err);
        }
      }

      // Notify UI with collected items and profile
      onImportItems(finalItems, parsedProfile);

      const finishMsg = abortCrawlRef.current
        ? `[!] İndeks toplama durduruldu. O ana kadar toplanan ${finalItems.length} kayıt anlık analiz için hazırlandı.`
        : earlyTerminated && terminationReason
        ? `[✓] ${terminationReason} Toplanan ${finalItems.length} kayıt anlık analiz için hazırlandı.`
        : `[✓] Tarama tamamlandı! Çekilebilen tüm veriler (${finalItems.length} kayıt) anlık analiz için hazırlandı.`;

      setCrawlProgress(finishMsg);
      onProgress?.(finishMsg, currentPage);

      cleanupGoogleOverlays();
      isCrawlingRef.current = false;
      setIsCrawling(false);
      return finalItems;
    };

    useImperativeHandle(ref, () => ({
      startAutomatedCrawl,
      startAutomated5PageCrawl: (dorkToUse?: string) => startAutomatedCrawl(dorkToUse, false),
      stopCrawl,
      isCrawling: () => isCrawlingRef.current,
    }));

    // Trigger auto-crawl if triggerAutoCrawl prop changes
    useEffect(() => {
      if (triggerAutoCrawl > 0 && triggerAutoCrawl !== lastTriggerRef.current) {
        lastTriggerRef.current = triggerAutoCrawl;
        startAutomatedCrawl(undefined, true);
      }
    }, [triggerAutoCrawl, cleanUser]);

    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${isCrawling ? "bg-rose-500 animate-ping" : "bg-cyan-400 animate-pulse"}`} />
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Google Programmable Search (CSE)</span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Otomatik İndeks Toplayıcı
              </span>
            </h3>
          </div>

          <div className="text-xs font-mono text-zinc-400 flex items-center gap-2">
            <span>Hedef:</span>
            <span className="text-emerald-400 font-semibold">@{cleanUser}</span>
          </div>
        </div>

        {/* Cloud Console API Notice if 403 */}
        {apiError && apiError.status === 403 && (
          <div className="bg-amber-950/40 border border-amber-800/60 rounded-lg p-3.5 text-xs text-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">
                  Google Cloud API Servis Bildirimi (403):
                </p>
                <p className="text-amber-200/80 text-[11px] mt-0.5">
                  Cloud Console API servisi henüz aktif edilmediği için entegre Google CSE sistemi otomatik devreye girer ve canlı arama yaparak biyografi, takipçi ve yorum kayıtlarını tarayıcıdan doğrudan toplar.
                </p>
              </div>
            </div>
            {apiError.activation_url && (
              <a
                href={apiError.activation_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded text-xs font-semibold shrink-0 transition-colors"
              >
                <span>API'yi Aktifleştir</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        )}

        {/* Crawl Banner & Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-zinc-950/80 border border-cyan-500/30 rounded-xl p-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                <span>Google CSE Otomatik İndeks Çekici</span>
                {isCrawling && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    Sayfa {currentPage} taranıyor...
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Sabit sayfa sınırı olmaksızın Google indeksinden @{cleanUser} için çekebildiği kadar veri toplar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isCrawling ? (
              <button
                type="button"
                id="btn-cse-stop"
                onClick={stopCrawl}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 border border-rose-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md active:scale-[0.98] animate-pulse"
                title="Taramayı anında durdur ve toplanan verileri kaydet"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Taramayı Durdur</span>
              </button>
            ) : (
              <button
                type="button"
                id="btn-cse-crawl"
                onClick={() => startAutomatedCrawl(undefined, true)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                title="Google indeksinde çekebildiği kadar veri toplamak için tıklayın"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Maksimum Veri Topla</span>
              </button>
            )}
          </div>
        </div>

        {/* Crawl Progress status banner */}
        {crawlProgress && (
          <div className={`p-3 text-xs font-mono rounded-lg flex items-center justify-between gap-2 animate-fadeIn ${
            isCrawling
              ? "bg-cyan-950/40 border border-cyan-800/60 text-cyan-200"
              : crawlProgress.includes("durduruldu")
              ? "bg-amber-950/40 border border-amber-800/60 text-amber-200"
              : "bg-emerald-950/40 border border-emerald-800/60 text-emerald-200"
          }`}>
            <div className="flex items-center gap-2">
              {isCrawling ? (
                <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              ) : crawlProgress.includes("durduruldu") ? (
                <StopCircle className="w-4 h-4 text-amber-400 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span>{crawlProgress}</span>
            </div>
            {totalFound > 0 && (
              <span className="text-[11px] bg-cyan-900/60 px-2.5 py-0.5 rounded border border-cyan-700/60 text-cyan-300 font-bold shrink-0">
                {totalFound} snippet toplandı
              </span>
            )}
          </div>
        )}

        {/* Quick Dork Query Trigger Buttons */}
        <div className="space-y-1.5">
          <span className="text-[11px] text-zinc-400 font-mono">Özel Dork İle Çekebildiği Kadar Tara:</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startAutomatedCrawl(`site:instagram.com "${cleanUser}"`, false)}
              disabled={isCrawling}
              className="text-xs font-mono px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-300 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Search className="w-3 h-3 text-cyan-400" />
              <span>site:instagram.com "{cleanUser}" (Tüm Sonuçlar)</span>
            </button>
            <button
              type="button"
              onClick={() => startAutomatedCrawl(`site:instagram.com/${cleanUser}/`, false)}
              disabled={isCrawling}
              className="text-xs font-mono px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-300 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <BookOpen className="w-3 h-3 text-emerald-400" />
              <span>site:instagram.com/{cleanUser}/ (Profil & Bio)</span>
            </button>
            <button
              type="button"
              onClick={() => startAutomatedCrawl(`site:instagram.com intext:"@${cleanUser}"`, false)}
              disabled={isCrawling}
              className="text-xs font-mono px-3 py-1.5 bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:text-cyan-300 rounded-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <Search className="w-3 h-3 text-amber-400" />
              <span>site:instagram.com intext:"@{cleanUser}"</span>
            </button>
          </div>
        </div>

        {/* Google Programmable Search Engine Element */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 overflow-hidden min-h-[140px]">
          {/* Google CSE Target Container */}
          <div className="gcse-search" data-gname="osint-search"></div>
        </div>
      </div>
    );
  }
);

GoogleCSEEmbed.displayName = "GoogleCSEEmbed";
