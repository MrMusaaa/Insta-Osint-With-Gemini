import React, { useState, useRef, useEffect } from "react";
import { Header } from "./components/Header";
import { TerminalView } from "./components/TerminalView";
import { DorkInspector } from "./components/DorkInspector";
import { GoogleCSEEmbed, GoogleCSEEmbedRef } from "./components/GoogleCSEEmbed";
import { ProfileBioCard } from "./components/ProfileBioCard";
import { SnippetsTable } from "./components/SnippetsTable";
import { AnalysisReport } from "./components/AnalysisReport";
import { CliCodeViewer } from "./components/CliCodeViewer";
import { OsintItem, AnalyzeResponse, TerminalLog, UserProfile } from "./types";
import { parseInstagramProfileData, cleanInstagramInput } from "./utils/instagramParser";
import {
  Search,
  Sparkles,
  Terminal,
  RefreshCw,
  Camera,
  AtSign,
  ChevronDown,
  ChevronUp,
  FileSearch,
  Hash,
  Database,
  Shield,
  Layers,
  X,
  Trash2,
  Square,
  StopCircle,
  User,
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "dorks" | "report" | "code">("dashboard");
  const [targetUsername, setTargetUsername] = useState("");
  const [items, setItems] = useState<OsintItem[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [report, setReport] = useState<AnalyzeResponse | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isDirectFetching, setIsDirectFetching] = useState(false);
  const [isInstaloaderFetching, setIsInstaloaderFetching] = useState(false);
  const [crawlStatusText, setCrawlStatusText] = useState<string>("");
  const [autoCrawlTrigger, setAutoCrawlTrigger] = useState<number>(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [showDorksDrawer, setShowDorksDrawer] = useState(false);
  const [showCseDrawer, setShowCseDrawer] = useState(false);

  const [apiError, setApiError] = useState<{
    status?: number;
    message?: string;
    activation_url?: string;
    guidance?: string;
  } | null>(null);

  const cseRef = useRef<GoogleCSEEmbedRef | null>(null);

  const presets = [
    { label: "@cyber_intel", name: "cyber_intel" },
    { label: "@sec_analyst", name: "sec_analyst" },
    { label: "@art_curator", name: "art_curator" },
  ];

  const addLog = (text: string, type: TerminalLog["type"] = "info") => {
    const time = new Date().toTimeString().slice(0, 8);
    setLogs((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: time,
        type,
        text,
      },
    ]);
  };

  // Automated Instaloader & Web Mirror Fetcher
  const handleFetchProfile = async (usernameToFetch?: string) => {
    const raw = usernameToFetch || targetUsername;
    const user = cleanInstagramInput(raw);
    if (!user) {
      addLog("[!] Lütfen bir Instagram kullanıcı adı veya profil linki girin.", "warn");
      return;
    }
    setTargetUsername(user);
    setIsInstaloaderFetching(true);
    setApiError(null);

    addLog(`[*] @${user} için Instagram profil bilgileri ve arama indeksleri sorgulanıyor...`, "command");

    try {
      const res = await fetch("/api/instaloader-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Profil sorgusu başarısız oldu.");
      }

      const data = await res.json();
      if (data.profile) {
        setUserProfile(data.profile);
        addLog(`[✓] Profil bilgileri başarıyla güncellendi: @${data.profile.username}`, "success");
        if (data.profile.fullName) addLog(`[✓] İsim: ${data.profile.fullName}`, "info");
        if (data.profile.followers) {
          addLog(
            `[✓] İstatistikler: ${data.profile.followers} Takipçi · ${data.profile.following} Takip · ${data.profile.posts} Gönderi`,
            "success"
          );
        }
      }

      if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setItems(data.items);
        addLog(`[✓] Açık arama indeksinden ${data.items.length} adet kayıt başarıyla listelendi.`, "success");
      } else if (data.item) {
        setItems([data.item]);
      }
    } catch (error: any) {
      addLog(`[!] Profil çekme hatası: ${error.message}`, "error");
    } finally {
      setIsInstaloaderFetching(false);
    }
  };

  // Automated Continuous Deep Search Engine Crawler
  const handleCollect = async () => {
    const user = cleanInstagramInput(targetUsername);
    if (!user) return;

    setIsCollecting(true);
    setApiError(null);
    setCrawlStatusText("Google indeksinde arama başlatılıyor...");
    addLog(`[*] Google indeksinde @${user} için çekebildiği kadar maksimum derin tarama başlatılıyor...`, "command");

    try {
      let harvestedCount = 0;
      if (cseRef.current) {
        const harvested = await cseRef.current.startAutomatedCrawl(undefined, true);
        harvestedCount = harvested.length;
      }
      if (harvestedCount === 0) {
        // Fallback to server search engine crawler
        const res = await fetch("/api/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0) {
            setItems(data.items);
            harvestedCount = data.items.length;
          }
        }
      }
      addLog(`[✓] Arama indeksinden toplam ${harvestedCount} kayıt toplandı.`, "success");
    } catch (error: any) {
      addLog(`[!] Tarama hatası: ${error.message}`, "error");
    } finally {
      setIsCollecting(false);
      setCrawlStatusText("");
    }
  };

  const handleStopCollect = () => {
    if (cseRef.current) {
      cseRef.current.stopCrawl();
    }
    setIsCollecting(false);
    setCrawlStatusText("");
    addLog(`[!] İndeks toplama işlemi kullanıcı tarafından durduruldu. Toplanan kayıtlar kaydedildi.`, "warn");
  };

  const handleExecuteSpecificDork = async (dorkQuery: string) => {
    const user = cleanInstagramInput(targetUsername);
    if (!user) return;

    setIsCollecting(true);
    setApiError(null);
    setCrawlStatusText(`Dork taranıyor: ${dorkQuery}...`);
    addLog(`[*] Hedef Dork çalıştırılıyor: ${dorkQuery}`, "command");

    try {
      if (cseRef.current) {
        const harvested = await cseRef.current.startAutomatedCrawl(dorkQuery, false);
        addLog(`[✓] "${dorkQuery}" dorku ile ${harvested.length} yeni arama kaydı toplandı.`, "success");
        if (harvested.length > 0) {
          setActiveTab("dashboard");
        }
      }
    } catch (error: any) {
      addLog(`[!] Dork tarama hatası: ${error.message}`, "error");
    } finally {
      setIsCollecting(false);
      setCrawlStatusText("");
    }
  };

  const handleUpdateBio = async (newBio: string) => {
    const user = cleanInstagramInput(targetUsername);
    try {
      const res = await fetch("/api/update-bio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, bio: newBio }),
      });
      if (res.ok) {
        setUserProfile((prev) => (prev ? { ...prev, bio: newBio } : null));
        addLog(`[✓] Biyografi başarıyla güncellendi.`, "success");
      }
    } catch (err: any) {
      addLog(`[!] Biyografi güncelleme hatası: ${err.message}`, "error");
    }
  };

  const handleUpdateAvatar = async (avatarData: string) => {
    const user = cleanInstagramInput(targetUsername);
    try {
      const res = await fetch("/api/upload-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user, avatarData }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile((prev) => (prev ? { ...prev, profilePicUrl: data.avatarUrl } : null));
        addLog(`[✓] Profil fotoğrafı başarıyla kaydedildi.`, "success");
      }
    } catch (err: any) {
      addLog(`[!] Fotoğraf güncelleme hatası: ${err.message}`, "error");
    }
  };

  const handleAnalyze = async () => {
    const user = cleanInstagramInput(targetUsername);
    if (items.length === 0) {
      addLog(`[!] Analiz edilecek arama parçacığı yok. Önce profili veya indeksi tarayın.`, "warn");
      return;
    }

    setIsAnalyzing(true);
    addLog(`[*] Gemini 3.6 Flash ile @${user} için dil, üslup ve tema analizi başlatılıyor...`, "command");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: user,
          items,
          model: "gemini-3.6-flash",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gemini analizi başarısız oldu.");
      }

      const reportData = await res.json();
      setReport(reportData);
      setActiveTab("report");

      addLog(`[✓] Gemini raporu başarıyla üretildi (${reportData.execution_time_ms} ms).`, "success");
    } catch (error: any) {
      addLog(`[!] Analiz hatası: ${error.message}`, "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearItems = async () => {
    setItems([]);
    document.body.classList.remove("gsc-overflow-hidden");
    const user = cleanInstagramInput(targetUsername);
    try {
      await fetch("/api/clear-saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user }),
      });
    } catch {}
    addLog("[i] İndekslenmiş kayıtlar ve anlık bellek tamamen temizlendi. Kalıcı kayıt tutulmaz.", "info");
  };

  const handleDownloadCli = () => {
    fetch("/api/cli-code")
      .then((res) => res.json())
      .then((data) => {
        if (!data.code) return;
        const blob = new Blob([data.code], { type: "text/x-python" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "instagram_osint.py";
        a.click();
        URL.revokeObjectURL(url);
        addLog(`[✓] instagram_osint.py dosyası indirildi.`, "success");
      })
      .catch((err) => {
        addLog(`[!] İndirme hatası: ${err.message}`, "error");
      });
  };

  const handleDownloadProjectZip = () => {
    addLog(`[*] Projenin tüm kaynak kodları ve yapılandırması ZIP olarak hazırlanıyor...`, "command");
    const a = document.createElement("a");
    a.href = "/api/download-project-zip";
    a.download = "instagram-osint-full-source.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addLog(`[✓] Projenin tüm kaynak kodları (ZIP) güvenle indirildi.`, "success");
  };

  const handleImportCSEItems = (newItems: OsintItem[], profile?: UserProfile | null) => {
    const user = cleanInstagramInput(targetUsername);
    setItems((prev) => {
      const map = new Map<string, OsintItem>();
      prev.forEach((i) => map.set(i.hash_id, i));
      newItems.forEach((i) => map.set(i.hash_id, i));
      return Array.from(map.values());
    });

    const parsed = profile || parseInstagramProfileData(user, newItems);
    if (parsed) {
      setUserProfile((prev) => {
        const resolvedBio =
          (parsed.bio && parsed.bio.trim().length > 3)
            ? parsed.bio
            : (prev?.bio || parsed.bio || "");

        const resolvedFollowers =
          (parsed.followers && parsed.followers !== "—" && parsed.followers !== "0")
            ? parsed.followers
            : (prev?.followers || parsed.followers || "—");

        const resolvedFollowing =
          (parsed.following && parsed.following !== "—" && parsed.following !== "0")
            ? parsed.following
            : (prev?.following || parsed.following || "—");

        const resolvedPosts =
          (parsed.posts && parsed.posts !== "—" && parsed.posts !== "0")
            ? parsed.posts
            : (prev?.posts || parsed.posts || "—");

        return {
          ...(prev || {}),
          ...parsed,
          username: user,
          bio: resolvedBio,
          followers: resolvedFollowers,
          following: resolvedFollowing,
          posts: resolvedPosts,
          profilePicUrl: prev?.profilePicUrl || parsed.profilePicUrl,
        } as UserProfile;
      });
    }
    setIsCollecting(false);
    setCrawlStatusText("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-pink-500/20 selection:text-pink-300 relative overflow-x-hidden">
      {/* Subtle ambient lighting meshes */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-pink-500/10 via-purple-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Modern Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDownloadCli={handleDownloadCli}
        onDownloadZip={handleDownloadProjectZip}
        recordsCount={items.length}
        hasAnalysis={!!report}
        isTerminalOpen={isTerminalOpen}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Fluid Hero Search Bar */}
        <section className="space-y-4 text-center max-w-2xl mx-auto">
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Instagram Açık Profil & OSINT
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Giriş duvarına takılmadan gerçek profil bilgilerini, HD fotoğrafı ve arama indekslerini keşfedin.
            </p>
          </div>

          {/* Floating Search Container */}
          <div className="relative group">
            <div className="relative flex items-center bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 focus-within:border-pink-500/50 focus-within:ring-2 focus-within:ring-pink-500/20 rounded-2xl p-1.5 backdrop-blur-xl shadow-2xl transition-all">
              <div className="pl-3.5 pr-2 text-zinc-500">
                <AtSign className="w-5 h-5 text-pink-400/80" />
              </div>

              <input
                id="target-input"
                type="text"
                value={targetUsername}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.includes("instagram.com")) {
                    setTargetUsername(cleanInstagramInput(val));
                  } else {
                    setTargetUsername(val.replace(/^@/, ""));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleFetchProfile();
                  }
                }}
                placeholder="Kullanıcı adı veya profil linki yapıştırın..."
                className="w-full bg-transparent text-sm sm:text-base font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none py-2 pr-2"
              />

              {/* Action Button inside search bar */}
              <button
                id="btn-fetch"
                onClick={() => handleFetchProfile()}
                disabled={isInstaloaderFetching || isCollecting}
                className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 via-rose-500 to-amber-500 hover:from-pink-500 hover:via-rose-400 hover:to-amber-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-[0.98]"
              >
                <Camera className={`w-3.5 h-3.5 ${isInstaloaderFetching ? "animate-spin" : ""}`} />
                <span>{isInstaloaderFetching ? "Çekiliyor..." : "Profili Getir"}</span>
              </button>
            </div>
          </div>

          {/* Preset Chips */}
          <div className="flex items-center justify-center gap-2 flex-wrap text-xs">
            <span className="text-zinc-500 text-[11px] font-mono">Hızlı Örnekler:</span>
            {presets.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setTargetUsername(p.name);
                  handleFetchProfile(p.name);
                }}
                className={`text-[11px] font-mono px-3 py-1 rounded-full border transition-all cursor-pointer ${
                  targetUsername.includes(cleanInstagramInput(p.name))
                    ? "bg-pink-500/10 text-pink-400 border-pink-500/30 font-semibold"
                    : "bg-zinc-900/60 text-zinc-400 border-zinc-800/80 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </section>

        {/* Tab 1: Dashboard / Profile & Discovery */}
        {activeTab === "dashboard" && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Spotlight Profile Bio Card */}
            {userProfile ? (
              <ProfileBioCard
                profile={userProfile}
                onUpdateBio={handleUpdateBio}
                onUpdateAvatar={handleUpdateAvatar}
                onInstaloaderFetch={() => handleFetchProfile()}
                isInstaloaderLoading={isInstaloaderFetching}
              />
            ) : (
              <div className="bg-gradient-to-b from-zinc-900/60 to-zinc-950/80 border border-zinc-800/80 rounded-2xl p-8 sm:p-10 text-center space-y-3 backdrop-blur-xl shadow-lg">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
                  <User className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-zinc-200">
                  Hedef Instagram Hesabı Bekleniyor
                </h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
                  İncelemek istediğiniz kullanıcının adını veya profil bağlantısını yukarıdaki arama kutusuna yazıp <strong>Profili Getir</strong> butonuna basarak açık kaynak verilerini ve indeksleri toplayın.
                </p>
              </div>
            )}

            {/* Quick Secondary Actions Bar */}
            <div className="flex items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-zinc-400">
                <FileSearch className="w-4 h-4 text-emerald-400" />
                <span>Google Arama İndeksi: <strong>{items.length}</strong> kayıt mevcut</span>
                {isCollecting && (
                  <span className="flex items-center gap-1.5 ml-2 text-emerald-400 font-mono text-[11px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <RefreshCw className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>{crawlStatusText || "Taranıyor..."}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {isCollecting ? (
                  <button
                    id="btn-stop-scan"
                    onClick={handleStopCollect}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all cursor-pointer shadow-md active:scale-[0.98] animate-pulse"
                    title="Devam eden indeks taramasını hemen durdur ve toplanan verileri kaydet"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Taramayı Durdur</span>
                  </button>
                ) : (
                  <button
                    id="btn-google-scan"
                    onClick={handleCollect}
                    disabled={isInstaloaderFetching}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-medium transition-all cursor-pointer disabled:opacity-50 shadow-sm active:scale-[0.98]"
                    title="Google indeksinde çekebildiği kadar veri topla"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Otomatik İndeks Topla (Maksimum)</span>
                  </button>
                )}

                {items.length > 0 && (
                  <button
                    id="btn-clear-index"
                    onClick={handleClearItems}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-rose-500/20 text-zinc-300 hover:text-rose-300 border border-zinc-700/80 font-medium transition-colors cursor-pointer text-xs"
                    title="İndeks kayıtlarını ve sonuç tablosunu ekrandan kaldır"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Kaldır</span>
                  </button>
                )}

                <button
                  onClick={() => setShowDorksDrawer(!showDorksDrawer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  <Hash className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Dorklar</span>
                  {showDorksDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Collapsible Dork Inspector */}
            {showDorksDrawer && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-150">
                <DorkInspector
                  username={targetUsername}
                  onExecuteDork={handleExecuteSpecificDork}
                  isExecuting={isCollecting}
                />
              </div>
            )}

            {/* Headless Google CSE Engine (runs silently in background, never pops up in user's view) */}
            <div
              className="fixed -left-[9999px] -top-[9999px] w-[800px] h-[600px] opacity-0 pointer-events-none overflow-hidden z-[-9999]"
              aria-hidden="true"
            >
              <GoogleCSEEmbed
                ref={cseRef}
                username={targetUsername}
                onImportItems={handleImportCSEItems}
                apiError={apiError}
                triggerAutoCrawl={autoCrawlTrigger}
                onProgress={(msg, page) => {
                  if (msg.includes("[✓]") || msg.includes("tamamlandı") || msg.includes("Tamamlandı")) {
                    setCrawlStatusText("Tamamlandı");
                    addLog(msg, "success");
                  } else if (msg.includes("[!]") || msg.includes("kota") || msg.includes("hata")) {
                    setCrawlStatusText("Durduruldu");
                    addLog(msg, "warn");
                  } else if (msg.includes("[i]")) {
                    addLog(msg, "info");
                  } else {
                    setCrawlStatusText(`Sayfa ${page}/5 taranıyor...`);
                    addLog(msg, "info");
                  }
                }}
              />
            </div>

            {/* Search Index Snippets Table */}
            <SnippetsTable
              items={items}
              username={targetUsername}
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              onClear={handleClearItems}
              onOpenDorks={() => {
                setShowDorksDrawer(true);
                setActiveTab("dorks");
              }}
            />
          </div>
        )}

        {/* Tab 2: Full Dork Matrix */}
        {activeTab === "dorks" && (
          <div className="animate-in fade-in duration-200 space-y-4">
            <DorkInspector
              username={targetUsername}
              onExecuteDork={handleExecuteSpecificDork}
              isExecuting={isCollecting}
            />
          </div>
        )}

        {/* Tab 3: AI Linguistic Report */}
        {activeTab === "report" && (
          <div className="animate-in fade-in duration-200">
            <AnalysisReport
              report={report}
              onReanalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              onBackToDashboard={() => setActiveTab("dashboard")}
            />
          </div>
        )}

        {/* Tab 3: Python CLI Script */}
        {activeTab === "code" && (
          <div className="animate-in fade-in duration-200">
            <CliCodeViewer
              onDownload={handleDownloadCli}
              onDownloadZip={handleDownloadProjectZip}
            />
          </div>
        )}
      </main>

      {/* Floating / Collapsible Terminal Drawer */}
      {isTerminalOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-full max-w-xl shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
          <div className="relative">
            <button
              onClick={() => setIsTerminalOpen(false)}
              className="absolute -top-3 -right-3 z-10 p-1.5 rounded-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 shadow-md cursor-pointer"
              title="Kapat"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <TerminalView logs={logs} onClear={() => setLogs([])} />
          </div>
        </div>
      )}
    </div>
  );
}
