import React, { useRef, useEffect } from "react";
import { Terminal as TerminalIcon, Copy, Trash2, Check, ArrowRight } from "lucide-react";
import { TerminalLog } from "../types";

interface TerminalViewProps {
  logs: TerminalLog[];
  onClear: () => void;
  onExecuteCommand?: (cmd: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ logs, onClear }) => {
  const [copied, setCopied] = React.useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const text = logs.map((l) => `[${l.timestamp}] ${l.text}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getLogStyle = (type: TerminalLog["type"]) => {
    switch (type) {
      case "command":
        return "text-cyan-400 font-bold";
      case "success":
        return "text-emerald-400";
      case "warn":
        return "text-amber-400";
      case "error":
        return "text-rose-400";
      default:
        return "text-zinc-300";
    }
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden flex flex-col h-72 shadow-lg">
      <div className="bg-zinc-900/90 px-4 py-2.5 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div className="flex items-center gap-1.5 ml-2 text-xs font-mono text-zinc-400">
            <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span>osint-terminal@python3-stdlib: ~</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-terminal"
            onClick={handleCopy}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="Copy terminal buffer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            id="btn-clear-terminal"
            onClick={onClear}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Clear terminal buffer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-4 font-mono text-xs overflow-y-auto space-y-1.5 bg-black/50 select-text"
      >
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic">No terminal output. Run a command above to begin.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 leading-relaxed">
              <span className="text-zinc-600 select-none text-[10px] pt-0.5">{log.timestamp}</span>
              {log.type === "command" && (
                <span className="text-emerald-500 select-none font-bold">$</span>
              )}
              <span className={`flex-1 whitespace-pre-wrap ${getLogStyle(log.type)}`}>
                {log.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
