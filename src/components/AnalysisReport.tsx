import React, { useState } from "react";
import Markdown from "react-markdown";
import { AnalyzeResponse } from "../types";
import { Sparkles, Download, Copy, Check, ShieldAlert, Cpu, Clock, FileText, ArrowLeft, Terminal, X, Code2 } from "lucide-react";
import { SYSTEM_PROMPT_ANALYZE, buildUserPromptTemplate } from "../prompts/geminiPrompts";

interface AnalysisReportProps {
  report: AnalyzeResponse | null;
  onReanalyze: () => void;
  isAnalyzing: boolean;
  onBackToDashboard?: () => void;
}

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  report,
  onReanalyze,
  isAnalyzing,
  onBackToDashboard,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  if (!report) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-zinc-200 mb-1">No OSINT Analysis Generated Yet</h3>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-6 leading-relaxed">
          Collect search index snippets in the Workspace tab and trigger the Gemini 3.6 Flash linguistic analysis.
          The model will analyze raw text excerpts without URLs or metadata to build a structured thematic and tonal profile.
        </p>
        <button
          id="btn-generate-report-placeholder"
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isAnalyzing ? "Analyzing with Gemini..." : "Run Analysis Now"}</span>
        </button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(report.analysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const mdContent = `# OSINT Linguistic & Thematic Profile: @${report.target_username}

- **Model**: ${report.model_used}
- **Snippets Processed**: ${report.snippets_analyzed}
- **Execution Time**: ${report.execution_time_ms} ms
- **Generated At**: ${new Date().toISOString()}

---

${report.analysis}
`;
    const blob = new Blob([mdContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.target_username}_osint_linguistic_analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header Stat Banner */}
      <div className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              AI OSINT Synthesis
            </span>
            <span className="text-xs font-mono text-zinc-400">
              Target: @{report.target_username}
            </span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Unverified Linguistic & Thematic Profile
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-950/40 px-2.5 py-1.5 rounded-lg border border-cyan-800/60 font-semibold">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono">{report.model_used}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono">{report.execution_time_ms} ms</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2.5 py-1.5 rounded-lg border border-zinc-800">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono">{report.snippets_analyzed} snippets</span>
          </div>

          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
              title="Profil ve arama görünümüne dön"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-pink-400" />
              <span>Profile Dön</span>
            </button>
          )}

          <button
            onClick={() => setShowPromptModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-800/80 rounded-lg transition-colors cursor-pointer"
            title="Yapay zekaya gönderilen System Prompt ve User Prompt şablonunu görüntüle"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Promptları İncele</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-200 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>

          <button
            onClick={handleDownloadMd}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors cursor-pointer font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Model Quota / Fallback Notice (if applicable) */}
      {report.quota_notice && (
        <div className="bg-cyan-500/10 border border-cyan-500/25 rounded-xl p-3.5 flex items-start gap-3 text-xs text-cyan-200 leading-relaxed">
          <Cpu className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-cyan-300">Model Bilgisi: </span>
            {report.quota_notice}
          </div>
        </div>
      )}

      {/* Methodological notice card */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-200/90 leading-relaxed">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-300 font-semibold block mb-0.5">
            Methodological Safeguard Enforced:
          </strong>
          All direct URLs, handles, and platform metadata were stripped prior to prompt submission.
          Analysis is generated strictly on raw unverified text snippets without assuming personal authorship,
          recognizing that public search indexes contain external quotes, mentions, and third-party commentary.
        </div>
      </div>

      {/* Markdown Body */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 sm:p-8">
        <div className="prose prose-invert prose-zinc max-w-none text-zinc-300 prose-headings:text-zinc-100 prose-headings:font-semibold prose-h3:text-base prose-h3:border-b prose-h3:border-zinc-800 prose-h3:pb-2 prose-h3:mt-6 prose-h3:mb-3 prose-p:leading-relaxed prose-p:text-xs prose-li:text-xs prose-ul:my-2 prose-strong:text-zinc-100 prose-code:text-cyan-400 prose-code:bg-zinc-950 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
          <Markdown>{report.analysis}</Markdown>
        </div>
      </div>

      {/* Inspect Prompt Modal */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Code2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">API System Prompt & User Batch Template</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">Modül: /src/prompts/geminiPrompts.ts</p>
                </div>
              </div>
              <button
                onClick={() => setShowPromptModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-zinc-300">
              {/* Section 1: System Instruction */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                    1. System Prompt (config.systemInstruction)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">/src/prompts/geminiPrompts.ts</span>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap select-all">
                  {SYSTEM_PROMPT_ANALYZE}
                </div>
              </div>

              {/* Section 2: User Batch Prompt Template */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                    2. User Prompt Template (Per Batch)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">buildUserPromptTemplate()</span>
                </div>
                <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap select-all">
                  {buildUserPromptTemplate(report.target_username, [
                    "[Snippet 1]: <URL ve kullanıcı adından arındırılmış ham metin parçası...>",
                    "[Snippet 2]: <URL ve kullanıcı adından arındırılmış ham metin parçası...>",
                    `[Snippet ${report.snippets_analyzed}]: <URL ve kullanıcı adından arındırılmış ham metin parçası...>`,
                  ])}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/40">
              <span className="text-[11px] text-zinc-400">
                Web tarafı promptları <code className="text-cyan-400 bg-zinc-900 px-1 py-0.5 rounded">src/prompts/geminiPrompts.ts</code> dosyasında bağımsız modüldür.
              </span>
              <button
                onClick={() => {
                  const fullText = `=== SYSTEM PROMPT ===\n${SYSTEM_PROMPT_ANALYZE}\n\n=== USER BATCH PROMPT TEMPLATE ===\n${buildUserPromptTemplate(report.target_username, [
                    "[Snippet 1]: <Örnek ham metin>",
                  ])}`;
                  navigator.clipboard.writeText(fullText);
                  setPromptCopied(true);
                  setTimeout(() => setPromptCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
              >
                {promptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{promptCopied ? "Kopyalandı" : "Tüm Promptları Kopyala"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
