import React, { useState } from "react";
import { OsintItem } from "../types";
import { Hash, ExternalLink, Filter, Download, Sparkles, Check, Eye, EyeOff, Search, Trash2, X } from "lucide-react";

interface SnippetsTableProps {
  items: OsintItem[];
  username: string;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  onClear?: () => void;
  onOpenDorks?: () => void;
}

export const SnippetsTable: React.FC<SnippetsTableProps> = ({
  items,
  username,
  onAnalyze,
  isAnalyzing,
  onClear,
  onOpenDorks,
}) => {
  const [filterText, setFilterText] = useState("");
  const [showStrippedOnly, setShowStrippedOnly] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const cleanText = (snippet: string) => {
    return snippet
      .replace(/https?:\/\/\S+|www\.\S+/gi, "")
      .replace(/instagram\.com\/\S*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const filtered = items.filter((it) => {
    const q = filterText.toLowerCase();
    return (
      it.title.toLowerCase().includes(q) ||
      it.snippet.toLowerCase().includes(q) ||
      it.hash_id.toLowerCase().includes(q) ||
      it.dork.toLowerCase().includes(q)
    );
  });

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 1500);
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(
      {
        target_username: username,
        exported_at: new Date().toISOString(),
        total_items: items.length,
        items,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username.replace(/^@/, "")}_osint_records.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (items.length === 0) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center space-y-3 backdrop-blur-sm">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-2 text-zinc-400 border border-zinc-700/50">
          <Search className="w-5 h-5 text-cyan-400" />
        </div>
        <h4 className="text-sm font-semibold text-zinc-200">
          Henüz İndekslenmiş Gönderi Bulunmuyor
        </h4>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
          Google indeksinde arama yapmak veya özel dorkları inceleyip çalıştırmak için aşağıdaki butonları kullanabilirsiniz.
        </p>
        {onOpenDorks && (
          <div className="pt-2">
            <button
              onClick={onOpenDorks}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-300 border border-zinc-700 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm hover:border-cyan-500/40"
            >
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dorkları Aç & İncele (9 Dork Hazır)</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden flex flex-col backdrop-blur-sm shadow-sm">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h3 className="text-sm font-semibold text-zinc-100">
            Arama İndeksi Parçacıkları
          </h3>
          <span className="text-xs text-zinc-500 font-mono">
            ({filtered.length} / {items.length} kayıt)
          </span>
          <span className="px-2 py-0.5 text-[10px] font-medium text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-md flex items-center gap-1" title="Veriler sadece anlık RAM belleğinde tutulur, diske kalıcı olarak kaydedilmez.">
            <span>⚡ Anlık Bellek (Kalıcı Kayıt Yok)</span>
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:w-52">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Sonuçlarda ara..."
              className="w-full bg-zinc-950/80 border border-zinc-800 text-zinc-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-pink-500/50 transition-colors"
            />
          </div>

          <button
            onClick={() => setShowStrippedOnly(!showStrippedOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              showStrippedOnly
                ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                : "bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
            }`}
            title="Gemini için URL'leri ve meta verileri ayıklanmış hali göster"
          >
            {showStrippedOnly ? <Eye className="w-3.5 h-3.5 text-amber-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-400" />}
            <span>{showStrippedOnly ? "Ham Metin" : "Meta Veriyi Gizle"}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 rounded-lg transition-colors cursor-pointer"
            title="Kayıtları JSON olarak indir"
          >
            <Download className="w-3.5 h-3.5" />
            <span>JSON İndir</span>
          </button>

          {onClear && (
            <button
              onClick={onClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors cursor-pointer"
              title="İndekslenmiş arama sonuçlarını ve tabloyu ekrandan kaldır"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Sayfayı / Kayıtları Kaldır</span>
            </button>
          )}

          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 disabled:opacity-50 rounded-lg transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isAnalyzing ? "Analiz Ediliyor..." : "AI ile Analiz Et"}</span>
          </button>
        </div>
      </div>

      {/* Snippet items */}
      <div className="divide-y divide-zinc-800/60 max-h-[32rem] overflow-y-auto">
        {filtered.map((item, idx) => {
          const stripped = cleanText(item.snippet);
          return (
            <div key={item.hash_id || idx} className="p-4 sm:p-5 hover:bg-zinc-800/20 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <button
                    onClick={() => handleCopyHash(item.hash_id)}
                    className="flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800/80 text-cyan-400 hover:border-zinc-700 transition-colors cursor-pointer"
                    title="SHA-256 parmak izi kopyala"
                  >
                    <Hash className="w-3 h-3" />
                    <span>{item.hash_id}</span>
                    {copiedHash === item.hash_id && (
                      <Check className="w-3 h-3 text-emerald-400 ml-0.5" />
                    )}
                  </button>

                  <h4 className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">
                    {item.title}
                  </h4>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono shrink-0">
                  {item.page && <span>Sayfa {item.page}</span>}
                  <span className="text-zinc-700">·</span>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-400 hover:text-pink-400 flex items-center gap-1 transition-colors"
                  >
                    <span>Kaynağı Aç</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <div className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800/80">
                {showStrippedOnly ? (
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block mb-1">
                      [Gemini İçin Ayrıştırılmış Salt Metin]:
                    </span>
                    <p className="text-zinc-200">{stripped}</p>
                  </div>
                ) : (
                  <p className="text-zinc-300">{item.snippet}</p>
                )}
              </div>

              <div className="mt-2 text-[11px] font-mono text-zinc-500 truncate">
                Dork: <span className="text-zinc-400">{item.dork}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
