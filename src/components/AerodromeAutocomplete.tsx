import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, MapPin } from 'lucide-react';
import type { Aerodrome } from '../types/aviation';

interface AerodromeAutocompleteProps {
  value: string;
  onChange: (icao: string, aerodrome?: Aerodrome) => void;
  aerodromes: Aerodrome[];
  placeholder?: string;
  label?: string;
}

export const AerodromeAutocomplete: React.FC<AerodromeAutocompleteProps> = ({
  value,
  onChange,
  aerodromes,
  placeholder = 'Ex: SBMT',
}) => {
  const [queryText, setQueryText] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQueryText(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    if (!q) return aerodromes.slice(0, 12);
    const exactIcao: Aerodrome[] = [];
    const startsWithIcao: Aerodrome[] = [];
    const matchesNameOrCity: Aerodrome[] = [];

    for (const a of aerodromes) {
      const icaoLow = a.icao.toLowerCase();
      if (icaoLow === q) {
        exactIcao.push(a);
      } else if (icaoLow.startsWith(q)) {
        startsWithIcao.push(a);
      } else if (
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q)
      ) {
        matchesNameOrCity.push(a);
      }
      if (exactIcao.length + startsWithIcao.length + matchesNameOrCity.length > 40) {
        break;
      }
    }
    return [...exactIcao, ...startsWithIcao, ...matchesNameOrCity].slice(0, 15);
  }, [queryText, aerodromes]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    setQueryText(raw);
    setIsOpen(true);
    const exact = aerodromes.find((a) => a.icao.toUpperCase() === raw.trim());
    onChange(raw.trim(), exact);
  };

  const handleSelect = (aero: Aerodrome) => {
    setQueryText(aero.icao);
    setIsOpen(false);
    onChange(aero.icao, aero);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          value={queryText}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          maxLength={25}
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 pr-8 font-mono text-sm font-semibold uppercase text-slate-900 dark:text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />
        <Search className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-slate-400" />
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 max-h-64 w-80 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 shadow-xl">
          {filtered.map((aero) => (
            <button
              key={aero.icao}
              type="button"
              onClick={() => handleSelect(aero)}
              className="flex w-full items-start justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-sky-50 dark:hover:bg-slate-800"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {aero.icao}
                  </span>
                  {aero.isCustom && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                      Privado
                    </span>
                  )}
                  <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                    {aero.name}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{aero.city}</span>
                </div>
              </div>
              <div className="shrink-0 text-right font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <div>{Math.round(aero.elevationFeet)} ft</div>
                {aero.runway1 && aero.runway2 && (
                  <div className="text-[10px] text-slate-400">
                    RWY {aero.runway1}/{aero.runway2}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
