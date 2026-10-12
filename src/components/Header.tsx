import React from "react";
import { Shield, Sparkles, Download, Code2, Database, Terminal, User, FolderArchive, Hash } from "lucide-react";

interface HeaderProps {
  activeTab: "dashboard" | "dorks" | "report" | "code";
  setActiveTab: (tab: "dashboard" | "dorks" | "report" | "code") => void;
  onDownloadCli: () => void;
  onDownloadZip?: () => void;
  recordsCount: number;
  hasAnalysis: boolean;
  isTerminalOpen?: boolean;
  onToggleTerminal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onDownloadCli,
  onDownloadZip,
  recordsCount,
  hasAnalysis,
  isTerminalOpen,
  onToggleTerminal,
}) => {
  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-xl sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Clean Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-pink-500/20 via-rose-500/20 to-amber-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shadow-sm shadow-pink-500/10">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
              Instagram OSINT
            </span>
            <span className="hidden sm:inline-block ml-2.5 text-[11px] font-mono text-zinc-500">
              v1.0
            </span>
          </div>
        </div>

        {/* Zone 2: Fluid Segmented Navigation Tabs */}
        <nav className="flex items-center p-1 bg-zinc-900/90 border border-zinc-800/80 rounded-xl shadow-inner text-xs font-medium">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-zinc-800 text-zinc-100 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <User className="w-3.5 h-3.5 text-pink-400" />
            <span>Profil & Arama</span>
            {recordsCount > 0 && (
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-zinc-700/60 text-zinc-300">
                {recordsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("dorks")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "dorks"
                ? "bg-zinc-800 text-zinc-100 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dorklar</span>
            <span className="ml-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
              9
            </span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "report"
                ? "bg-zinc-800 text-zinc-100 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Analizi</span>
            {hasAnalysis && (
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("code")}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "code"
                ? "bg-zinc-800 text-zinc-100 shadow-sm font-semibold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Python CLI</span>
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2">
          {onToggleTerminal && (
            <button
              onClick={onToggleTerminal}
              className={`p-2 rounded-lg border transition-all text-xs cursor-pointer ${
                isTerminalOpen
                  ? "bg-zinc-800 border-zinc-700 text-emerald-400"
                  : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80"
              }`}
              title="Konsol Günlüğünü Aç/Kapat"
            >
              <Terminal className="w-4 h-4" />
            </button>
          )}

          {onDownloadZip && (
            <button
              onClick={onDownloadZip}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 hover:border-emerald-500/50 rounded-lg transition-all cursor-pointer shadow-sm"
              title="Tüm projenin kaynak kodlarını ZIP arşivi olarak yedekle ve indir"
            >
              <FolderArchive className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Projeyi Yedekle (ZIP)</span>
            </button>
          )}

          <button
            onClick={onDownloadCli}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all cursor-pointer"
            title="instagram_osint.py dosyasını indir"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">CLI İndir</span>
          </button>
        </div>
      </div>
    </header>
  );
};
