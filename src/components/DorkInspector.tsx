import React, { useState } from "react";
import { Search, ExternalLink, Hash, Play, Check, Copy, Sparkles, Filter, Layers, BookOpen } from "lucide-react";

interface DorkItem {
  id: string;
  category: "profile" | "posts" | "mentions" | "tagged" | "locations" | "media";
  label: string;
  query: string;
  description: string;
  riskLevel: "Passive" | "Targeted" | "Broad";
}

interface DorkInspectorProps {
  username: string;
  onExecuteDork?: (query: string) => void;
  isExecuting?: boolean;
}

export const DorkInspector: React.FC<DorkInspectorProps> = ({
  username,
  onExecuteDork,
  isExecuting = false,
}) => {
  const clean = username.replace(/^@/, "").trim() || "username";
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customSearchTerm, setCustomSearchTerm] = useState<string>("");

  const dorks: DorkItem[] = [
    {
      id: "profile_main",
      category: "profile",
      label: "Profil & Ana Dizin",
      query: `site:instagram.com/${clean}/`,
      description: "Google tarafından indekslenmiş ana profil sayfası, biyografi özeti ve profil meta verilerini bulur.",
      riskLevel: "Passive",
    },
    {
      id: "posts_all",
      category: "posts",
      label: "Tüm Gönderi & Yorumlar",
      query: `site:instagram.com "${clean}"`,
      description: "Kullanıcı adının geçtiği tüm postlar, açıklamalar, yorumlar ve Reels indekslerini getirir.",
      riskLevel: "Targeted",
    },
    {
      id: "mention_intext",
      category: "mentions",
      label: "Metin İçi @Mention",
      query: `site:instagram.com intext:"@${clean}"`,
      description: "Diğer kullanıcıların gönderi açıklamalarında veya yorumlarında @kullanıcı formatında yaptığı etiketlemeleri tarar.",
      riskLevel: "Targeted",
    },
    {
      id: "url_handle",
      category: "profile",
      label: "URL Eşleşmesi",
      query: `site:instagram.com inurl:"${clean}"`,
      description: "Instagram URL yapısında doğrudan kullanıcı adını içeren tüm açık bağlantıları listeler.",
      riskLevel: "Passive",
    },
    {
      id: "posts_direct",
      category: "posts",
      label: "Doğrudan Post İndeksi (/p/)",
      query: `site:instagram.com/p/ "${clean}"`,
      description: "Yalnızca doğrudan tekil fotoğraf ve video gönderilerine (Post URLs) odaklanarak arama yapar.",
      riskLevel: "Targeted",
    },
    {
      id: "reels_direct",
      category: "media",
      label: "Reels Video İndeksi (/reel/)",
      query: `site:instagram.com/reel/ "${clean}"`,
      description: "Hedef kullanıcı ile ilişkili açık Reels videolarını, ses kayıtlarını ve video açıklamalarını getirir.",
      riskLevel: "Targeted",
    },
    {
      id: "tagged_association",
      category: "tagged",
      label: "Etiketler & Keşfet İndeksi",
      query: `site:instagram.com/explore/tags/ "${clean}"`,
      description: "Kullanıcının adı veya ilgili konularda hashtag sayfalarına indekslenen içerikleri tarar.",
      riskLevel: "Broad",
    },
    {
      id: "external_aggregators",
      category: "mentions",
      label: "Açık Web & Arşiv İndeksleri",
      query: `"${clean}" (site:picuki.com | site:imginn.com | site:dumpor.com | site:storiesig.info)`,
      description: "Instagram giriş duvarına takılmayan harici açık ayna (mirror) ve arşiv sitelerindeki indeksli verileri çeker.",
      riskLevel: "Broad",
    },
    {
      id: "exact_name_query",
      category: "mentions",
      label: "Ad & Soyad Kombinasyonu",
      query: `"${clean}" site:instagram.com`,
      description: "Instagram üzerinde kullanıcı adının birebir tam kalıp olarak geçtiği indekslenmiş tüm sayfalar.",
      riskLevel: "Passive",
    },
  ];

  const filteredDorks = dorks.filter((d) => {
    const matchCategory = selectedCategory === "all" || d.category === selectedCategory;
    const matchSearch =
      !customSearchTerm ||
      d.label.toLowerCase().includes(customSearchTerm.toLowerCase()) ||
      d.query.toLowerCase().includes(customSearchTerm.toLowerCase()) ||
      d.description.toLowerCase().includes(customSearchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleCopy = (query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedQuery(query);
    setTimeout(() => setCopiedQuery(null), 1500);
  };

  return (
    <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xl backdrop-blur-sm space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400">
            <Hash className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Google Arama İndeksi Dorkları (OSINT Matrix)</span>
              <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-bold">
                {dorks.length} Dork Hazır
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              @{clean} hedefi için optimize edilmiş pasif arama dorkları. Tek tıkla tarayın veya Google'da açın.
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {onExecuteDork && (
            <button
              onClick={() => onExecuteDork(`site:instagram.com "${clean}"`)}
              disabled={isExecuting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecuting ? "Taranıyor..." : "Tüm Dorkları Tara"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Category Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: "all", label: "Tümü" },
            { id: "profile", label: "Profil & Bio" },
            { id: "posts", label: "Gönderi & Yorum" },
            { id: "mentions", label: "Etiket & Bahsetme" },
            { id: "media", label: "Reels & Medya" },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] transition-colors cursor-pointer shrink-0 ${
                selectedCategory === cat.id
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                  : "bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 border border-zinc-700/50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-56">
          <Filter className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={customSearchTerm}
            onChange={(e) => setCustomSearchTerm(e.target.value)}
            placeholder="Dork filtrele..."
            className="w-full bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-xs rounded-lg pl-7 pr-3 py-1 focus:outline-none focus:border-cyan-500/50"
          />
        </div>
      </div>

      {/* Dork Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredDorks.map((dork) => {
          const isCopied = copiedQuery === dork.query;
          const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(dork.query)}`;

          return (
            <div
              key={dork.id}
              className="bg-zinc-950/70 border border-zinc-800/90 hover:border-zinc-700 rounded-xl p-3.5 flex flex-col justify-between transition-all group hover:bg-zinc-950/90 shadow-sm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                    {dork.label}
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    {dork.riskLevel}
                  </span>
                </div>

                <div className="relative group/code">
                  <code className="block text-[11px] font-mono text-cyan-300 bg-zinc-900/90 px-2.5 py-2 rounded-lg border border-zinc-800/90 break-all select-all leading-relaxed">
                    {dork.query}
                  </code>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {dork.description}
                </p>
              </div>

              {/* Action buttons inside card */}
              <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-zinc-800/60">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(dork.query)}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-[10px] font-mono transition-colors cursor-pointer"
                    title="Dork sorgusunu panoya kopyala"
                  >
                    {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{isCopied ? "Kopyalandı" : "Kopyala"}</span>
                  </button>

                  <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-cyan-300 text-[10px] font-mono transition-colors"
                    title="Google aramasında doğrudan yeni sekmede aç"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Google'da Aç</span>
                  </a>
                </div>

                {onExecuteDork && (
                  <button
                    onClick={() => onExecuteDork(dork.query)}
                    disabled={isExecuting}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-mono font-semibold transition-all cursor-pointer disabled:opacity-50"
                    title="Bu dorku arama indeks motorunda anında çalıştır"
                  >
                    <Play className="w-2.5 h-2.5 fill-current" />
                    <span>Dorku Çalıştır</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
