"use client";

import { useState } from "react";
import { MATCAST_SECTIONS, type MatcastSection } from "@/config/matcast";

function SectionContent({ section }: { section: MatcastSection }) {
  return (
    <div className="space-y-4 text-left">
      {section.content.map((block, i) => {
        if (block.type === "heading") {
          const Tag = block.level === 2 ? "h2" : "h3";
          return (
            <Tag
              key={i}
              className={`font-bold text-[#1A2F50] border-b border-[#1A2F50]/20 pb-1 mt-6 first:mt-0 text-left ${
                block.level === 2 ? "text-base" : "text-sm"
              }`}
            >
              <span className="inline-block mr-2" aria-hidden>📌</span>
              {block.text}
            </Tag>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-sm text-[#1A2F50]/90 leading-relaxed text-left">
              {block.text}
            </p>
          );
        }
        if (block.type === "list") {
          return (
            <ul key={i} className="space-y-1 text-sm text-[#1A2F50]/90">
              {block.items.map((item, j) => (
                <li key={j} className="flex gap-2">
                  <span className="text-[#E6004B]/70 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === "block") {
          return (
            <div key={i} className="pl-4 border-l-2 border-[#1A2F50]/20 text-left">
              {block.title && (
                <p className="font-semibold text-sm text-[#1A2F50] mb-2">{block.title}</p>
              )}
              <ul className="space-y-1 text-sm text-[#1A2F50]/90">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-2">
                    {typeof item === "string" ? (
                      <>
                        <span className="text-[#E6004B]/70 shrink-0">•</span>
                        {item}
                      </>
                    ) : (
                      <>
                        <span className="font-medium text-[#1A2F50]/80 shrink-0">{item.label}:</span>
                        {item.value}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }
        if (block.type === "note") {
          return (
            <div key={i} className="bg-[#1A2F50]/5 rounded-lg px-4 py-3 text-sm text-[#1A2F50]/90 border border-[#1A2F50]/10 text-left">
              {block.text}
            </div>
          );
        }
        if (block.type === "gallery") {
          return (
            <div key={i} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {block.items.map((item, j) => (
                <div
                  key={j}
                  className="flex flex-col rounded-lg overflow-hidden border border-[#e2e4e8] bg-white shadow-sm"
                >
                  <div className="aspect-square bg-[#1A2F50]/5 relative">
                    <img
                      src={item.src}
                      alt={item.label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector(".sortament-placeholder")) {
                          const placeholder = document.createElement("div");
                          placeholder.className = "sortament-placeholder w-full h-full flex items-center justify-center bg-[#1A2F50]/10 text-[#1A2F50]/50 text-xs p-2 text-center";
                          placeholder.textContent = item.label;
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  </div>
                  <p className="px-3 py-2 text-sm font-medium text-[#1A2F50] text-center bg-white border-t border-[#e2e4e8]">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

export default function MatcastModal({ onClose }: { onClose: () => void }) {
  const [activeId, setActiveId] = useState<string>(MATCAST_SECTIONS[0]?.id ?? "");
  const active = MATCAST_SECTIONS.find((s) => s.id === activeId) ?? MATCAST_SECTIONS[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] sm:max-h-[90vh] rounded-t-xl sm:rounded-xl overflow-hidden shadow-2xl flex flex-col bg-white border-2 border-[#1A2F50] mt-auto sm:mt-0"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0 bg-[#1A2F50]">
          <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wide truncate pr-2">
            Матчасть SPACEMETALL
          </h2>
          <button
            onClick={onClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors shrink-0"
            aria-label="Закрыть"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex flex-1 min-h-0 flex-col sm:flex-row bg-[#f5f6f8]">
          <nav className="w-full sm:w-52 shrink-0 border-b sm:border-b-0 sm:border-r border-[#e2e4e8] overflow-x-auto overflow-y-hidden sm:overflow-y-auto py-2 sm:py-4 bg-white flex sm:flex-col gap-0 sm:gap-0">
            <ul className="flex flex-row sm:flex-col flex-nowrap sm:flex-wrap gap-1 sm:gap-0 sm:space-y-0.5 px-2 py-2 sm:py-0 text-left overflow-x-auto sm:overflow-visible">
              {MATCAST_SECTIONS.map((s) => (
                <li key={s.id} className="shrink-0 sm:shrink">
                  {s.externalLink ? (
                    <a
                      href={s.externalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#1A2F50]/90 hover:bg-[#1A2F50]/5 transition-colors text-left"
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                      </svg>
                      <span className="truncate">{s.title}</span>
                      <svg className="w-3 h-3 ml-auto shrink-0 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  ) : (
                    <button
                      onClick={() => setActiveId(s.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                        activeId === s.id
                          ? "bg-[#1A2F50]/10 text-[#1A2F50] border border-[#1A2F50]/20"
                          : "text-[#1A2F50]/80 hover:bg-[#1A2F50]/5"
                      }`}
                    >
                      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span className="truncate">{s.title}</span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-white text-left min-h-0">
            {active && !active.externalLink && (
              <>
                <h3 className="text-xl font-bold text-[#1A2F50] mb-4 text-left">{active.title}</h3>
                <SectionContent section={active} />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
