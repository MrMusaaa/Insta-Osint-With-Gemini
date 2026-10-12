import React, { useState, useEffect } from "react";
import {
  Download,
  Copy,
  Check,
  Terminal,
  Code2,
  ShieldCheck,
  FolderArchive,
  GitBranch,
  ShieldAlert,
  Info,
} from "lucide-react";

interface CliCodeViewerProps {
  onDownload: () => void;
  onDownloadZip?: () => void;
}

export const CliCodeViewer: React.FC<CliCodeViewerProps> = ({ onDownload, onDownloadZip }) => {
  const [code, setCode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch("/api/cli-code")
      .then((res) => res.json())
      .then((data) => {
        if (data.code) setCode(data.code);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load CLI script code:", err);
        setLoading(false);
      });
  }, []);

  const handleCopyCode = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* GitHub Sync & Safe Backup Card */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <GitBranch className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <span>GitHub Senkronizasyonu & Kod Güvenliği</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Güvenli Aktarım
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Kodlarınızın ve ayarlarınızın kaybolmaması için önerilen adımlar ve tam yedekleme.
              </p>
            </div>
          </div>

          {onDownloadZip && (
            <button
              onClick={onDownloadZip}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-all cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-[0.98] shrink-0"
            >
              <FolderArchive className="w-4 h-4" />
              <span>Tüm Projeyi ZIP Olarak İndir</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-400">
              <span>1. Önce Çevrimdışı Yedek Alın</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Yukarıdaki <strong>"Tüm Projeyi ZIP Olarak İndir"</strong> butonuna basarak projenin güncel halini bilgisayarınıza arşivleyin. Böylece hiçbir dosyanız kaybolmaz.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-cyan-400">
              <span>2. Yeni veya Boş Bir Repo Seçin</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              GitHub ile senkronize ederken yeni/boş bir repository seçerseniz mevcut kodların üzerine yazılma veya silinme riski sıfırdır.
            </p>
          </div>

          <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-400">
              <span>3. Yeni Bir Branch (Dal) Açın</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Var olan dolu bir repoya aktaracaksanız doğrudan <code className="text-amber-300">main</code> yerine <code className="text-amber-300">osint-platform</code> adında yeni bir dal oluşturup senkronize edin.
            </p>
          </div>
        </div>
      </div>

      {/* Overview Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Zero External Dependencies
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                instagram_osint.py
              </span>
            </div>
            <h2 className="text-base font-semibold text-zinc-100">
              Python 3.10+ Standard Library OSINT Tool
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              disabled={loading || !code}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Script"}</span>
            </button>
            <button
              onClick={onDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer font-semibold"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>

        {/* Technical Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-emerald-400 font-medium mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Standard Library Only</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              No <code className="text-zinc-300 font-mono">requests</code> or <code className="text-zinc-300 font-mono">beautifulsoup4</code>. Built entirely on <code className="text-zinc-300 font-mono">urllib</code>, <code className="text-zinc-300 font-mono">hashlib</code>, and <code className="text-zinc-300 font-mono">argparse</code>.
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-cyan-400 font-medium mb-1">
              <Terminal className="w-4 h-4" />
              <span>Dorking Architecture</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Queries Google Custom Search JSON API using targeted Instagram search dorks, bypassing session login and scrapers.
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-amber-400 font-medium mb-1">
              <Code2 className="w-4 h-4" />
              <span>Gemini 3.8 Flash Profiler</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Strips URLs & metadata from snippets to conduct pure unverified linguistic, stylistic, and thematic profiling.
            </p>
          </div>
        </div>
      </div>

      {/* Terminal Usage Guide */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 sm:p-6">
        <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span>Local CLI Usage Instructions</span>
        </h3>

        <div className="space-y-3 font-mono text-xs">
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-zinc-500 text-[10px] mb-1"># 1. Collect indexed snippets (with optional Google credentials or mock fixtures)</div>
            <div className="text-emerald-400">
              python3 instagram_osint.py collect --username &lt;target_handle&gt;
            </div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-zinc-500 text-[10px] mb-1"># 2. Inspect collected local JSON records in terminal</div>
            <div className="text-emerald-400">
              python3 instagram_osint.py show --username &lt;target_handle&gt;
            </div>
          </div>

          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <div className="text-zinc-500 text-[10px] mb-1"># 3. Analyze unverified snippets with Gemini 3.8 Flash (URLs stripped)</div>
            <div className="text-emerald-400">
              export GEMINI_API_KEY="your_api_key"<br />
              python3 instagram_osint.py analyze --username &lt;target_handle&gt;
            </div>
          </div>
        </div>
      </div>

      {/* Code Viewer */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-zinc-900 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-300">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>instagram_osint.py</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            {code.split("\n").length} lines
          </span>
        </div>

        <div className="p-4 overflow-x-auto max-h-[600px] overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed bg-black/40">
          {loading ? (
            <div className="text-zinc-500 italic">Loading Python source code...</div>
          ) : (
            <pre className="select-text">
              <code>{code}</code>
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};
