import React, { useState } from 'react';
import { EDUCATIONAL_GUIDES } from '../domain/education';

interface HelpTooltipProps {
  guideKey: keyof typeof EDUCATIONAL_GUIDES;
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({ guideKey }) => {
  const [open, setOpen] = useState(false);
  const guide = EDUCATIONAL_GUIDES[guideKey];

  if (!guide) return null;

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600"
        aria-expanded={open}
      >
        <span aria-hidden="true">❓</span>
        <span>Bu analiz nedir?</span>
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute right-0 top-full mt-2 z-50 w-[420px] max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-4 text-left text-xs leading-relaxed text-slate-700 dark:text-slate-300"
        >
          <div className="pb-2 mb-2.5 border-b border-slate-200 dark:border-slate-800">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white">{guide.title}</h4>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Ne zaman kullanılır?</div>
              <p className="text-slate-600 dark:text-slate-300">{guide.neZamanKullanilir}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Hangi veri gerekir?</div>
              <p className="text-slate-600 dark:text-slate-300">{guide.hangiVeriGerekir}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Varsayımlar nelerdir?</div>
              <p className="text-slate-600 dark:text-slate-300">{guide.varsayimlar}</p>
            </div>
            <div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">Nasıl yorumlanır?</div>
              <p className="text-slate-600 dark:text-slate-300">{guide.nasilYorumlanir}</p>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-md">
              <div className="font-semibold text-blue-700 dark:text-blue-400">Yüksek Fırın Örneği</div>
              <p className="text-slate-700 dark:text-slate-200 mt-0.5">{guide.yuksekFiriniOrnegi}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
