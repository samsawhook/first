"use client";
import { useState } from "react";
import { ChevronDown, ChevronUp, FileText, Calendar, ExternalLink } from "lucide-react";
import { letters } from "@/lib/data";
import type { Letter } from "@/lib/types";

const typeLabel: Record<Letter["type"], string> = {
  quarterly: "Quarterly",
  annual: "Annual",
  special: "Special",
};
const typeBg: Record<Letter["type"], string> = {
  quarterly: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  annual: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  special: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

function LetterCard({ letter }: { letter: Letter }) {
  const [expanded, setExpanded] = useState(false);

  // Parse **bold** in body text
  const renderBody = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const rendered = parts.map((p, j) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return (
            <strong key={j} className="text-slate-200 font-semibold">
              {p.slice(2, -2)}
            </strong>
          );
        }
        return p;
      });
      return (
        <p key={i} className={`${line === "" ? "mt-3" : ""} text-sm text-slate-400 leading-relaxed`}>
          {rendered}
        </p>
      );
    });
  };

  const hasPdf = !!letter.pdfUrl;
  const hasBody = !!letter.body;

  return (
    <div className="bg-[#0D1421] border border-[#1E2D3D] rounded-xl overflow-hidden card-hover">
      {/* Header */}
      <div
        className={`p-5 flex items-start justify-between gap-4 ${hasBody ? "cursor-pointer" : ""}`}
        onClick={() => hasBody && setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-[#111D2E] border border-[#1E2D3D] flex items-center justify-center shrink-0">
            <FileText size={16} className="text-slate-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-100">{letter.title}</h3>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${typeBg[letter.type]}`}>
                {typeLabel[letter.type]}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar size={10} />
                {letter.date}
              </span>
              <span className="text-xs text-slate-600">·</span>
              <span className="text-xs text-slate-500">{letter.author}</span>
            </div>
            {letter.excerpt && (
              <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xl">
                {letter.excerpt}
              </p>
            )}
            {hasPdf && (
              <a
                href={letter.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium text-violet-400 hover:text-violet-300 transition-colors"
              >
                <ExternalLink size={11} />
                View Letter (PDF)
              </a>
            )}
          </div>
        </div>
        {hasBody && (
          <div className="shrink-0 text-slate-500 mt-1">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        )}
      </div>

      {/* Expanded body */}
      {hasBody && expanded && (
        <div className="border-t border-[#1E2D3D] px-5 pb-6 pt-5">
          <div className="max-w-2xl space-y-0.5">
            {renderBody(letter.body)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LettersSection() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
          {letters.length} letters · Oldest to newest below
        </p>
      </div>
      <div className="space-y-3">
        {letters.map((letter) => (
          <LetterCard key={letter.id} letter={letter} />
        ))}
      </div>
    </div>
  );
}
