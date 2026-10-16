import React, { useState, useMemo } from 'react';
import {
  Plane,
  Plus,
  Trash2,
  Edit3,
  Check,
  Lock,
  Search,
  MapPin,
  ExternalLink,
  CheckCircle2,
  Gauge,
  FileText,
} from 'lucide-react';
import type {
  Aerodrome,
  BaseAircraft,
  AircraftFuelType,
  PerformanceCategory,
  PropulsionType,
  RunwaySurfaceType,
  UserAircraftPrefix,
  WakeTurbulenceCategory,
} from '../types/aviation';

interface FleetAndAerodromesTabProps {
  baseAircraftList: BaseAircraft[];
  userFleet: UserAircraftPrefix[];
  aerodromes: Aerodrome[];
  isAdmin: boolean;
  isAuthenticated: boolean;
  onSaveUserPrefix: (prefix: UserAircraftPrefix) => void;
  onDeleteUserPrefix: (id: string) => void;
  onSelectAircraftForPlan: (source: 'base' | 'prefix', id: string) => void;
  onSaveBaseAircraft: (aircraft: BaseAircraft) => void;
  onDeleteBaseAircraft: (id: string) => void;
  onSaveAerodrome: (aerodrome: Aerodrome, isGlobal: boolean) => void;
  onDeleteAerodrome: (icao: string, isGlobal: boolean) => void;
  onOpenAdminModal: () => void;
}

interface AircraftPerfDraft {
  registration: string;
  baseAircraftId: string;
  name: string;
  simulator: string;
  aircraftTypeCode: string;
  icaoCode: string;
  wakeTurbulence: WakeTurbulenceCategory;
  performanceCategory: PerformanceCategory;
  propulsionType: PropulsionType;
  emptyWeightKg: number;
  minRunwayLengthFt: number;
  runwaySurfaceType: RunwaySurfaceType;
  fuelType: AircraftFuelType;
  usableFuelLiters: number;
  reserveFuelLiters: number;
  taxiFuelLiters: number;
  extraFuelLiters: number;
  contingencyPercent: number;
  climbSpeedKts: number;
  climbVsFpm: number;
  climbFuelFlowLph: number;
  defaultCruiseIasKts: number;
  fuelConsumptionLph: number;
  defaultDescentIasKts: number;
  defaultDescentVsFpm: number;
  descentFuelFlowLph: number;
  alternateSpeedKts: number;
  alternateFuelFlowLph: number;
  operatorName: string;
  notes: string;
}

const parseLitersFromDisplay = (display?: string, fallback = 200): number => {
  if (!display) return fallback;
  const match = display.match(/[\d]+([.,]\d+)?/);
  if (!match) return fallback;
  return Number(match[0].replace(',', '.')) || fallback;
};

const buildDraftFromBase = (ac: BaseAircraft, registration = 'PR-'): AircraftPerfDraft => {
  const usable = ac.usableFuelLiters ?? parseLitersFromDisplay(ac.fuelCapacityDisplay, 200);
  return {
    registration,
    baseAircraftId: ac.id,
    name: ac.name,
    simulator: ac.simulator || 'MSFS',
    aircraftTypeCode: ac.aircraftTypeCode || 'L',
    icaoCode: ac.icaoCode || 'C172',
    wakeTurbulence: ac.wakeTurbulence || 'L',
    performanceCategory: ac.performanceCategory || 'A',
    propulsionType: ac.propulsionType || 'Aviões hélice',
    emptyWeightKg: ac.emptyWeightKg || 750,
    minRunwayLengthFt: ac.minRunwayLengthFt ?? 1800,
    runwaySurfaceType: ac.runwaySurfaceType || 'Hard and Soft',
    fuelType: ac.fuelType || (ac.propulsionType === 'Aviões jato' ? 'Jet A-1' : 'Avgas (100LL)'),
    usableFuelLiters: usable,
    reserveFuelLiters: ac.reserveFuelLiters ?? Math.round(ac.fuelConsumptionLph * 0.75),
    taxiFuelLiters: ac.taxiFuelLiters ?? 5,
    extraFuelLiters: ac.extraFuelLiters ?? 0,
    contingencyPercent: ac.contingencyPercent ?? 5,
    climbSpeedKts: ac.climbSpeedKts ?? Math.round(ac.defaultCruiseIasKts * 0.75),
    climbVsFpm: ac.climbVsFpm ?? 700,
    climbFuelFlowLph: ac.climbFuelFlowLph ?? Math.round(ac.fuelConsumptionLph * 1.3),
    defaultCruiseIasKts: ac.defaultCruiseIasKts || 110,
    fuelConsumptionLph: ac.fuelConsumptionLph || 35,
    defaultDescentIasKts: ac.defaultDescentIasKts || ac.defaultCruiseIasKts || 110,
    defaultDescentVsFpm: ac.defaultDescentVsFpm || 600,
    descentFuelFlowLph: ac.descentFuelFlowLph ?? Math.round(ac.fuelConsumptionLph * 0.7),
    alternateSpeedKts: ac.alternateSpeedKts ?? ac.defaultCruiseIasKts ?? 110,
    alternateFuelFlowLph: ac.alternateFuelFlowLph ?? ac.fuelConsumptionLph ?? 35,
    operatorName: ac.operatorName || 'PARTICULAR',
    notes: ac.notes || '',
  };
};

const buildDraftFromPrefix = (p: UserAircraftPrefix, baseList: BaseAircraft[]): AircraftPerfDraft => {
  const base = baseList.find((b) => b.id === p.baseAircraftId);
  const usable =
    p.usableFuelLiters ??
    parseLitersFromDisplay(p.fuelCapacityDisplay, base?.usableFuelLiters ?? 200);
  return {
    registration: p.registration,
    baseAircraftId: p.baseAircraftId,
    name: p.baseAircraftName,
    simulator: p.simulator || base?.simulator || 'MSFS',
    aircraftTypeCode: p.aircraftTypeCode || base?.aircraftTypeCode || 'L',
    icaoCode: p.icaoCode || base?.icaoCode || 'C172',
    wakeTurbulence: p.wakeTurbulence || base?.wakeTurbulence || 'L',
    performanceCategory: p.performanceCategory || base?.performanceCategory || 'A',
    propulsionType: p.propulsionType || base?.propulsionType || 'Aviões hélice',
    emptyWeightKg: p.emptyWeightKg || base?.emptyWeightKg || 750,
    minRunwayLengthFt: p.minRunwayLengthFt ?? base?.minRunwayLengthFt ?? 1800,
    runwaySurfaceType: p.runwaySurfaceType || base?.runwaySurfaceType || 'Hard and Soft',
    fuelType:
      p.fuelType ||
      base?.fuelType ||
      (p.propulsionType === 'Aviões jato' ? 'Jet A-1' : 'Avgas (100LL)'),
    usableFuelLiters: usable,
    reserveFuelLiters:
      p.reserveFuelLiters ??
      base?.reserveFuelLiters ??
      Math.round(p.fuelConsumptionLph * 0.75),
    taxiFuelLiters: p.taxiFuelLiters ?? base?.taxiFuelLiters ?? 5,
    extraFuelLiters: p.extraFuelLiters ?? base?.extraFuelLiters ?? 0,
    contingencyPercent: p.contingencyPercent ?? base?.contingencyPercent ?? 5,
    climbSpeedKts:
      p.climbSpeedKts ??
      base?.climbSpeedKts ??
      Math.round(p.defaultCruiseIasKts * 0.75),
    climbVsFpm: p.climbVsFpm ?? base?.climbVsFpm ?? 700,
    climbFuelFlowLph:
      p.climbFuelFlowLph ??
      base?.climbFuelFlowLph ??
      Math.round(p.fuelConsumptionLph * 1.3),
    defaultCruiseIasKts: p.defaultCruiseIasKts || 110,
    fuelConsumptionLph: p.fuelConsumptionLph || 35,
    defaultDescentIasKts: p.defaultDescentIasKts || p.defaultCruiseIasKts || 110,
    defaultDescentVsFpm: p.defaultDescentVsFpm || 600,
    descentFuelFlowLph:
      p.descentFuelFlowLph ??
      base?.descentFuelFlowLph ??
      Math.round(p.fuelConsumptionLph * 0.7),
    alternateSpeedKts:
      p.alternateSpeedKts ??
      base?.alternateSpeedKts ??
      p.defaultCruiseIasKts ??
      110,
    alternateFuelFlowLph:
      p.alternateFuelFlowLph ??
      base?.alternateFuelFlowLph ??
      p.fuelConsumptionLph ??
      35,
    operatorName: p.operatorName || 'PARTICULAR',
    notes: p.notes ?? base?.notes ?? '',
  };
};

export const FleetAndAerodromesTab: React.FC<FleetAndAerodromesTabProps> = ({
  baseAircraftList,
  userFleet,
  aerodromes,
  isAdmin,
  isAuthenticated,
  onSaveUserPrefix,
  onDeleteUserPrefix,
  onSelectAircraftForPlan,
  onSaveBaseAircraft,
  onDeleteBaseAircraft,
  onSaveAerodrome,
  onDeleteAerodrome,
  onOpenAdminModal,
}) => {
  const [subTab, setSubTab] = useState<'fleet' | 'catalog' | 'aerodromes'>('fleet');

  // --- Shared Little Navmap-style Performance Modal/Form State ---
  const [perfEditorMode, setPerfEditorMode] = useState<'prefix' | 'base' | null>(null);
  const [perfEditorId, setPerfEditorId] = useState<string | null>(null);
  const [perfTab, setPerfTab] = useState<'aircraft' | 'performance' | 'remarks'>('aircraft');
  const [draft, setDraft] = useState<AircraftPerfDraft>(() =>
    baseAircraftList[0]
      ? buildDraftFromBase(baseAircraftList[0])
      : {
          registration: 'PR-',
          baseAircraftId: 'c172',
          name: 'Cessna 172S Skyhawk',
          simulator: 'MSFS',
          aircraftTypeCode: 'L',
          icaoCode: 'C172',
          wakeTurbulence: 'L',
          performanceCategory: 'A',
          propulsionType: 'Aviões hélice',
          emptyWeightKg: 743,
          minRunwayLengthFt: 1650,
          runwaySurfaceType: 'Hard and Soft',
          fuelType: 'Avgas (100LL)',
          usableFuelLiters: 212,
          reserveFuelLiters: 27,
          taxiFuelLiters: 5,
          extraFuelLiters: 0,
          contingencyPercent: 5,
          climbSpeedKts: 75,
          climbVsFpm: 650,
          climbFuelFlowLph: 45,
          defaultCruiseIasKts: 115,
          fuelConsumptionLph: 35.6,
          defaultDescentIasKts: 115,
          defaultDescentVsFpm: 600,
          descentFuelFlowLph: 26,
          alternateSpeedKts: 110,
          alternateFuelFlowLph: 34,
          operatorName: 'PARTICULAR',
          notes: '',
        }
  );

  // --- Aerodromes Search & Form State ---
  const [aeroSearch, setAeroSearch] = useState('');
  const [aeroPage, setAeroPage] = useState(1);
  const [showAeroForm, setShowAeroForm] = useState(false);
  const [aeroIcao, setAeroIcao] = useState('');
  const [aeroName, setAeroName] = useState('');
  const [aeroCity, setAeroCity] = useState('');
  const [aeroElevMeters, setAeroElevMeters] = useState<number | ''>('');
  const [aeroRwy1, setAeroRwy1] = useState('');
  const [aeroRwy2, setAeroRwy2] = useState('');
  const [saveAeroAsGlobal, setSaveAeroAsGlobal] = useState(false);

  const normalizeCapacityLiters = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^[\d.,\s]+$/.test(trimmed)) {
      return `${trimmed} litros`;
    }
    return trimmed;
  };

  const startNewPrefix = () => {
    const first = baseAircraftList[0];
    setPerfEditorMode('prefix');
    setPerfEditorId(null);
    setPerfTab('aircraft');
    if (first) {
      setDraft(buildDraftFromBase(first, 'PR-'));
    }
  };

  const startEditPrefix = (p: UserAircraftPrefix) => {
    setPerfEditorMode('prefix');
    setPerfEditorId(p.id);
    setPerfTab('aircraft');
    setDraft(buildDraftFromPrefix(p, baseAircraftList));
  };

  const startNewBaseAircraft = () => {
    setPerfEditorMode('base');
    setPerfEditorId(null);
    setPerfTab('aircraft');
    setDraft({
      registration: '',
      baseAircraftId: '',
      name: '',
      simulator: 'MSFS',
      aircraftTypeCode: 'L',
      icaoCode: '',
      wakeTurbulence: 'L',
      performanceCategory: 'A',
      propulsionType: 'Aviões hélice',
      emptyWeightKg: 750,
      minRunwayLengthFt: 1800,
      runwaySurfaceType: 'Hard and Soft',
      fuelType: 'Avgas (100LL)',
      usableFuelLiters: 212,
      reserveFuelLiters: 30,
      taxiFuelLiters: 5,
      extraFuelLiters: 0,
      contingencyPercent: 5,
      climbSpeedKts: 85,
      climbVsFpm: 700,
      climbFuelFlowLph: 48,
      defaultCruiseIasKts: 115,
      fuelConsumptionLph: 35,
      defaultDescentIasKts: 115,
      defaultDescentVsFpm: 600,
      descentFuelFlowLph: 26,
      alternateSpeedKts: 110,
      alternateFuelFlowLph: 35,
      operatorName: 'PARTICULAR',
      notes: '',
    });
  };

  const startEditBaseAircraft = (ac: BaseAircraft) => {
    setPerfEditorMode('base');
    setPerfEditorId(ac.id);
    setPerfTab('aircraft');
    setDraft(buildDraftFromBase(ac, ''));
  };

  const handleTemplateSelectForPrefix = (baseId: string) => {
    const found = baseAircraftList.find((b) => b.id === baseId);
    if (!found) return;
    setDraft((prev) => ({
      ...buildDraftFromBase(found, prev.registration),
      operatorName: prev.operatorName || found.operatorName || 'PARTICULAR',
    }));
  };

  // Real-time Little Navmap calculations for the Performance tab:
  const estimatedRangeAndEndurance = useMemo(() => {
    const flyableLiters = Math.max(
      0,
      (Number(draft.usableFuelLiters) || 0) -
        (Number(draft.reserveFuelLiters) || 0) -
        (Number(draft.taxiFuelLiters) || 0)
    );
    const effectiveFlow =
      (Number(draft.fuelConsumptionLph) || 1) *
      (1 + Math.max(0, Number(draft.contingencyPercent) || 0) / 100);
    const hours = flyableLiters / effectiveFlow;
    const rangeNm = Math.round(hours * (Number(draft.defaultCruiseIasKts) || 0));
    const wholeHours = Math.floor(hours);
    const mins = Math.round((hours - wholeHours) * 60);
    return {
      rangeNm: Number.isFinite(rangeNm) ? rangeNm : 0,
      hours: Number.isFinite(wholeHours) ? wholeHours : 0,
      mins: Number.isFinite(mins) ? mins : 0,
    };
  }, [
    draft.usableFuelLiters,
    draft.reserveFuelLiters,
    draft.taxiFuelLiters,
    draft.fuelConsumptionLph,
    draft.contingencyPercent,
    draft.defaultCruiseIasKts,
  ]);

  const descentRuleOfThumbNmPer1000Ft = useMemo(() => {
    const vs = Number(draft.defaultDescentVsFpm) || 0;
    const spd = Number(draft.defaultDescentIasKts) || 0;
    if (vs <= 0 || spd <= 0) return '3,0';
    const nmPerMin = spd / 60;
    const minPer1000Ft = 1000 / vs;
    return (nmPerMin * minPer1000Ft).toFixed(1).replace('.', ',');
  }, [draft.defaultDescentIasKts, draft.defaultDescentVsFpm]);

  const handleSubmitPerfDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const usableLiters = Math.max(0, Number(draft.usableFuelLiters) || 0);
    const capacityDisplay = `${usableLiters} litros`;

    if (perfEditorMode === 'prefix') {
      if (!draft.registration.trim()) return;
      const newPrefix: UserAircraftPrefix = {
        id: perfEditorId || `prefix-${Date.now()}`,
        registration: draft.registration.trim().toUpperCase(),
        baseAircraftId: draft.baseAircraftId || 'custom',
        baseAircraftName: draft.name.trim() || 'Aeronave Personalizada',
        simulator: draft.simulator,
        aircraftTypeCode: draft.aircraftTypeCode.trim().toUpperCase() || 'L',
        icaoCode: draft.icaoCode.trim().toUpperCase() || 'ZZZZ',
        wakeTurbulence: draft.wakeTurbulence,
        performanceCategory: draft.performanceCategory,
        fuelConsumptionLph: Number(draft.fuelConsumptionLph) || 0,
        fuelCapacityDisplay: capacityDisplay,
        usableFuelLiters: usableLiters,
        reserveFuelLiters: Number(draft.reserveFuelLiters) || 0,
        taxiFuelLiters: Number(draft.taxiFuelLiters) || 0,
        extraFuelLiters: Number(draft.extraFuelLiters) || 0,
        contingencyPercent: Number(draft.contingencyPercent) || 0,
        fuelType: draft.fuelType,
        emptyWeightKg: Number(draft.emptyWeightKg) || 0,
        minRunwayLengthFt: Number(draft.minRunwayLengthFt) || 0,
        runwaySurfaceType: draft.runwaySurfaceType,
        propulsionType: draft.propulsionType,
        climbSpeedKts: Number(draft.climbSpeedKts) || 80,
        climbVsFpm: Number(draft.climbVsFpm) || 600,
        climbFuelFlowLph: Number(draft.climbFuelFlowLph) || Number(draft.fuelConsumptionLph) || 35,
        defaultCruiseIasKts: Number(draft.defaultCruiseIasKts) || 110,
        defaultDescentIasKts: Number(draft.defaultDescentIasKts) || 110,
        defaultDescentVsFpm: Number(draft.defaultDescentVsFpm) || 600,
        descentFuelFlowLph:
          Number(draft.descentFuelFlowLph) || Number(draft.fuelConsumptionLph) || 25,
        alternateSpeedKts:
          Number(draft.alternateSpeedKts) || Number(draft.defaultCruiseIasKts) || 110,
        alternateFuelFlowLph:
          Number(draft.alternateFuelFlowLph) || Number(draft.fuelConsumptionLph) || 35,
        operatorName: draft.operatorName.trim().toUpperCase() || 'PARTICULAR',
        notes: draft.notes.trim(),
      };
      onSaveUserPrefix(newPrefix);
      setPerfEditorMode(null);
      setPerfEditorId(null);
    } else if (perfEditorMode === 'base' && isAdmin) {
      if (!draft.name.trim() || !draft.icaoCode.trim()) return;
      const newBase: BaseAircraft = {
        id: perfEditorId || `ac-${draft.icaoCode.trim().toLowerCase()}-${Date.now()}`,
        name: draft.name.trim(),
        simulator: draft.simulator,
        aircraftTypeCode: draft.aircraftTypeCode.trim().toUpperCase() || 'L',
        icaoCode: draft.icaoCode.trim().toUpperCase(),
        wakeTurbulence: draft.wakeTurbulence,
        performanceCategory: draft.performanceCategory,
        fuelConsumptionLph: Number(draft.fuelConsumptionLph) || 0,
        fuelCapacityDisplay: capacityDisplay,
        usableFuelLiters: usableLiters,
        reserveFuelLiters: Number(draft.reserveFuelLiters) || 0,
        taxiFuelLiters: Number(draft.taxiFuelLiters) || 0,
        extraFuelLiters: Number(draft.extraFuelLiters) || 0,
        contingencyPercent: Number(draft.contingencyPercent) || 0,
        fuelType: draft.fuelType,
        emptyWeightKg: Number(draft.emptyWeightKg) || 0,
        minRunwayLengthFt: Number(draft.minRunwayLengthFt) || 0,
        runwaySurfaceType: draft.runwaySurfaceType,
        propulsionType: draft.propulsionType,
        climbSpeedKts: Number(draft.climbSpeedKts) || 80,
        climbVsFpm: Number(draft.climbVsFpm) || 600,
        climbFuelFlowLph: Number(draft.climbFuelFlowLph) || Number(draft.fuelConsumptionLph) || 35,
        defaultCruiseIasKts: Number(draft.defaultCruiseIasKts) || 110,
        defaultDescentIasKts: Number(draft.defaultDescentIasKts) || 110,
        defaultDescentVsFpm: Number(draft.defaultDescentVsFpm) || 600,
        descentFuelFlowLph:
          Number(draft.descentFuelFlowLph) || Number(draft.fuelConsumptionLph) || 25,
        alternateSpeedKts:
          Number(draft.alternateSpeedKts) || Number(draft.defaultCruiseIasKts) || 110,
        alternateFuelFlowLph:
          Number(draft.alternateFuelFlowLph) || Number(draft.fuelConsumptionLph) || 35,
        operatorName: draft.operatorName.trim().toUpperCase() || 'PARTICULAR',
        notes: draft.notes.trim(),
      };
      onSaveBaseAircraft(newBase);
      setPerfEditorMode(null);
      setPerfEditorId(null);
    }
  };

  const filteredAerodromes = useMemo(() => {
    const q = aeroSearch.trim().toLowerCase();
    if (!q) return aerodromes;
    return aerodromes.filter(
      (a) =>
        a.icao.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q)
    );
  }, [aerodromes, aeroSearch]);

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(filteredAerodromes.length / pageSize));
  const pagedAerodromes = filteredAerodromes.slice(
    (aeroPage - 1) * pageSize,
    aeroPage * pageSize
  );

  const handleSubmitAerodrome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aeroIcao.trim() || !aeroName.trim()) return;
    const elevM = Number(aeroElevMeters) || 0;
    const elevFt = Math.round(elevM * 3.28083989501312);
    const newAero: Aerodrome = {
      icao: aeroIcao.trim().toUpperCase(),
      name: aeroName.trim(),
      city: aeroCity.trim() || '-',
      elevationMeters: elevM,
      elevationFeet: elevFt,
      runway1: aeroRwy1.trim().padStart(2, '0'),
      runway2: aeroRwy2.trim().padStart(2, '0'),
      isCustom: !(isAdmin && saveAeroAsGlobal),
    };
    onSaveAerodrome(newAero, isAdmin && saveAeroAsGlobal);
    setShowAeroForm(false);
    setAeroIcao('');
    setAeroName('');
    setAeroCity('');
    setAeroElevMeters('');
    setAeroRwy1('');
    setAeroRwy2('');
  };

  const renderLittleNavmapPerformanceForm = () => {
    if (!perfEditorMode) return null;
    const isPrefix = perfEditorMode === 'prefix';

    return (
      <form
        onSubmit={handleSubmitPerfDraft}
        className="mb-6 overflow-hidden rounded-2xl border border-sky-500/40 bg-slate-50 dark:bg-slate-950/90 shadow-lg"
      >
        {/* Header similar to Little Navmap - Edit Aircraft Performance */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Plane className="h-5 w-5 text-sky-500" />
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {perfEditorId
                  ? isPrefix
                    ? `Editar Performance da Aeronave — ${draft.registration}`
                    : `Editar Performance da Aeronave Base — ${draft.name}`
                  : isPrefix
                  ? 'Criar Perfil de Performance de Aeronave (Prefixo Particular)'
                  : 'Criar Perfil de Performance de Aeronave Base (Admin)'}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Padrão Little Navmap • Abas Aeronave, Performance (Subida, Cruzeiro, Descida, Alternativo) e Observações
              </p>
            </div>
          </div>

          {/* 3-Tab Switcher (Aircraft | Performance | Remarks) */}
          <div className="flex rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-1">
            <button
              type="button"
              onClick={() => setPerfTab('aircraft')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                perfTab === 'aircraft'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Plane className="h-3.5 w-3.5" />
              <span>Aeronave</span>
            </button>
            <button
              type="button"
              onClick={() => setPerfTab('performance')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                perfTab === 'performance'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>Performance</span>
            </button>
            <button
              type="button"
              onClick={() => setPerfTab('remarks')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                perfTab === 'remarks'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Observações (Remarks)</span>
            </button>
          </div>
        </div>

        <div className="p-5">
          {/* TAB 1: AIRCRAFT */}
          {perfTab === 'aircraft' && (
            <div className="space-y-4">
              {isPrefix && (
                <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
                  <label className="block text-xs font-semibold text-sky-700 dark:text-sky-300">
                    Carregar predefinições de uma Aeronave Base do Catálogo (opcional):
                  </label>
                  <select
                    value={draft.baseAircraftId}
                    onChange={(e) => handleTemplateSelectForPrefix(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold"
                  >
                    {baseAircraftList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.icaoCode}) — Cruzeiro {b.defaultCruiseIasKts} kts • Descida{' '}
                        {b.defaultDescentIasKts} kts / {b.defaultDescentVsFpm} fpm • {b.fuelConsumptionLph} L/h
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Identificação da Aeronave
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Simulador:
                    </label>
                    <select
                      value={draft.simulator}
                      onChange={(e) => setDraft({ ...draft, simulator: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value="MSFS">MSFS 2020 / 2024</option>
                      <option value="X-Plane">X-Plane 11 / 12</option>
                      <option value="P3D">Prepar3D</option>
                      <option value="Real / Geral">Aviação Real / Geral</option>
                    </select>
                  </div>

                  {isPrefix && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Prefixo / Matrícula:
                      </label>
                      <input
                        type="text"
                        required
                        value={draft.registration}
                        onChange={(e) =>
                          setDraft({ ...draft, registration: e.target.value.toUpperCase() })
                        }
                        placeholder="Ex: PR-DAN"
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold uppercase text-sky-600 dark:text-sky-400"
                      />
                    </div>
                  )}

                  <div className={isPrefix ? 'sm:col-span-2' : 'sm:col-span-3'}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Modelo da Aeronave (Aircraft Model):
                    </label>
                    <input
                      type="text"
                      required
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      placeholder="Ex: Cirrus SR22"
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Designador Tipo ICAO (Aircraft Type):
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={draft.icaoCode}
                      onChange={(e) =>
                        setDraft({ ...draft, icaoCode: e.target.value.toUpperCase() })
                      }
                      placeholder="Ex: SR22"
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold uppercase"
                    />
                    <div className="mt-1.5 flex flex-col gap-0.5 text-[11px]">
                      <a
                        href="https://www.icao.int/publications/DOC8643/Pages/Search.aspx"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        <span>Consultar designador oficial na ICAO</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <a
                        href="https://en.wikipedia.org/wiki/List_of_aircraft_type_designators"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        <span>Consultar na Wikipedia</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Tipo / Esteira / PER:
                    </label>
                    <div className="mt-1 flex gap-1.5">
                      <select
                        value={draft.aircraftTypeCode}
                        onChange={(e) =>
                          setDraft({ ...draft, aircraftTypeCode: e.target.value })
                        }
                        className="w-1/3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 font-mono text-xs"
                        title="Tipo (L=Landplane, H=Helicopter, A=Amphibian)"
                      >
                        <option value="L">L</option>
                        <option value="H">H</option>
                        <option value="A">A</option>
                      </select>
                      <select
                        value={draft.wakeTurbulence}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            wakeTurbulence: e.target.value as WakeTurbulenceCategory,
                          })
                        }
                        className="w-1/3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 font-mono text-xs"
                        title="Esteira de Turbulência"
                      >
                        <option value="L">L</option>
                        <option value="M">M</option>
                        <option value="H">H</option>
                        <option value="J">J</option>
                      </select>
                      <select
                        value={draft.performanceCategory}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            performanceCategory: e.target.value as PerformanceCategory,
                          })
                        }
                        className="w-1/3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 font-mono text-xs"
                        title="Categoria PER"
                      >
                        <option value="A">PER A</option>
                        <option value="B">PER B</option>
                        <option value="C">PER C</option>
                        <option value="D">PER D</option>
                        <option value="E">PER E</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Propulsão (Regra Circuito de Tráfego):
                    </label>
                    <select
                      value={draft.propulsionType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          propulsionType: e.target.value as PropulsionType,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs"
                    >
                      <option value="Aviões hélice">Aviões hélice (+1.000 ft CT)</option>
                      <option value="Aviões jato">Aviões jato (+1.500 ft CT)</option>
                      <option value="Helicópteros">Helicópteros (+500 ft CT)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Peso Vazio Básico — BEW (kg):
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={draft.emptyWeightKg}
                      onChange={(e) =>
                        setDraft({ ...draft, emptyWeightKg: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Runway Section (like Little Navmap) */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Requisitos de Pista (Runway)
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Comprimento Mínimo de Pista (Minimum runway length — ft):
                    </label>
                    <input
                      type="number"
                      step="50"
                      value={draft.minRunwayLengthFt}
                      onChange={(e) =>
                        setDraft({ ...draft, minRunwayLengthFt: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Tipo de Superfície (Runway type):
                    </label>
                    <select
                      value={draft.runwaySurfaceType}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          runwaySurfaceType: e.target.value as RunwaySurfaceType,
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs"
                    >
                      <option value="Hard and Soft">Pavimentada e Terra/Grama (Hard and Soft)</option>
                      <option value="Hard only">Apenas Pavimentada (Hard only)</option>
                      <option value="Soft only">Apenas Terra/Grama (Soft only)</option>
                      <option value="Water">Água / Anfíbio (Water)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERFORMANCE (Fuel, Climb, Cruise, Descent, Alternate) */}
          {perfTab === 'performance' && (
            <div className="space-y-4">
              {/* Fuel Block */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Combustível (Fuel — Volume em Litros / L/h)
                  </h4>
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    Alcance estimado c/ reserva: {estimatedRangeAndEndurance.rangeNm} NM,{' '}
                    {estimatedRangeAndEndurance.hours} h {estimatedRangeAndEndurance.mins} m
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:grid-cols-6">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Tipo de Combustível:
                    </label>
                    <select
                      value={draft.fuelType}
                      onChange={(e) =>
                        setDraft({ ...draft, fuelType: e.target.value as AircraftFuelType })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
                    >
                      <option value="Avgas (100LL)">Avgas (100LL)</option>
                      <option value="Jet A-1">Jetfuel (Jet A-1)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Combustível Utilizável (litros):
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={draft.usableFuelLiters}
                      onChange={(e) =>
                        setDraft({ ...draft, usableFuelLiters: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Combustível Reserva (litros):
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={draft.reserveFuelLiters}
                      onChange={(e) =>
                        setDraft({ ...draft, reserveFuelLiters: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Combustível Táxi (litros):
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={draft.taxiFuelLiters}
                      onChange={(e) =>
                        setDraft({ ...draft, taxiFuelLiters: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Combustível Extra (litros):
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={draft.extraFuelLiters}
                      onChange={(e) =>
                        setDraft({ ...draft, extraFuelLiters: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                      Contingência (%):
                    </label>
                    <input
                      type="number"
                      step="1"
                      value={draft.contingencyPercent}
                      onChange={(e) =>
                        setDraft({ ...draft, contingencyPercent: Number(e.target.value) })
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Climb & Cruise Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Climb */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Subida (Climb)
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Vel. Média Subida (kts):
                      </label>
                      <input
                        type="number"
                        value={draft.climbSpeedKts}
                        onChange={(e) =>
                          setDraft({ ...draft, climbSpeedKts: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Razão Subida (fpm ▲):
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={draft.climbVsFpm}
                        onChange={(e) =>
                          setDraft({ ...draft, climbVsFpm: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Fluxo Subida (L/h):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={draft.climbFuelFlowLph}
                        onChange={(e) =>
                          setDraft({ ...draft, climbFuelFlowLph: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Cruise */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Cruzeiro (Cruise — Automatiza Rota A → B)
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Velocidade de Cruzeiro (kts):
                      </label>
                      <input
                        type="number"
                        value={draft.defaultCruiseIasKts}
                        onChange={(e) =>
                          setDraft({ ...draft, defaultCruiseIasKts: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold text-sky-600 dark:text-sky-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Fluxo em Cruzeiro (L/h):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={draft.fuelConsumptionLph}
                        onChange={(e) =>
                          setDraft({ ...draft, fuelConsumptionLph: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold text-sky-600 dark:text-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Descent & Alternate Row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Descent */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Descida (Descent — Automatiza Seção 7 TOD e Arco DME)
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Vel. Média Descida (kts):
                      </label>
                      <input
                        type="number"
                        value={draft.defaultDescentIasKts}
                        onChange={(e) =>
                          setDraft({ ...draft, defaultDescentIasKts: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Razão Descida (fpm ▼):
                      </label>
                      <input
                        type="number"
                        step="50"
                        value={draft.defaultDescentVsFpm}
                        onChange={(e) =>
                          setDraft({ ...draft, defaultDescentVsFpm: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Fluxo Descida (L/h):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={draft.descentFuelFlowLph}
                        onChange={(e) =>
                          setDraft({ ...draft, descentFuelFlowLph: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs"
                      />
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-indigo-500/10 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                    Regra Prática de Descida (Descent Rule of Thumb):{' '}
                    <span className="font-mono font-bold">
                      {descentRuleOfThumbNmPer1000Ft} NM por 1.000 ft
                    </span>{' '}
                    (padrão é 3,0 NM por 1.000 ft)
                  </div>
                </div>

                {/* Alternate */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    Alternativo (Alternate — Automatiza Trecho B → C)
                  </h4>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Vel. Média Alternativo (kts):
                      </label>
                      <input
                        type="number"
                        value={draft.alternateSpeedKts}
                        onChange={(e) =>
                          setDraft({ ...draft, alternateSpeedKts: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                        Fluxo Alternativo (L/h):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={draft.alternateFuelFlowLph}
                        onChange={(e) =>
                          setDraft({ ...draft, alternateFuelFlowLph: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold"
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                    Usado automaticamente para calcular tempo e consumo de combustível na perna Destino → Alternativo (B → C).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: REMARKS */}
          {perfTab === 'remarks' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="mb-3">
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Operador Padrão (OPR/ no Item 18 Remarks ICAO):
                  </label>
                  <input
                    type="text"
                    value={draft.operatorName}
                    onChange={(e) =>
                      setDraft({ ...draft, operatorName: e.target.value.toUpperCase() })
                    }
                    placeholder="PARTICULAR"
                    className="mt-1 w-full max-w-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 font-mono text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Observações sobre este Perfil de Performance (Potência, RPM, Mistura, Links POH):
                  </label>
                  <textarea
                    rows={6}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder="Ex: Cruzeiro a 65% BHP (2500 RPM), mistura empobrecida 50°F ROP. Velocidade de melhor razão de subida Vy 88 kts."
                    className="mt-1.5 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-3 text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
            <div className="text-[11px] text-slate-500">
              Ao selecionar esta aeronave no Planejamento (GP), os campos de Cruzeiro, Alternativo e Seção 7 (TOD, Circuito, Arco DME) serão preenchidos automaticamente.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPerfEditorMode(null);
                  setPerfEditorId(null);
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
              >
                <Check className="h-4 w-4" />
                <span>
                  {isPrefix ? 'Salvar Perfil do Prefixo' : 'Salvar no Catálogo Global'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('fleet')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === 'fleet'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Plane className="h-4 w-4" />
            <span>Meus Prefixos Particulares ({userFleet.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('catalog')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === 'catalog'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>Catálogo de Aeronaves Base ({baseAircraftList.length})</span>
            {isAdmin && (
              <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] text-amber-300">
                Admin
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSubTab('aerodromes')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
              subTab === 'aerodromes'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <MapPin className="h-4 w-4" />
            <span>Base de Aeródromos ({aerodromes.length})</span>
          </button>
        </div>

        {!isAdmin ? (
          <button
            type="button"
            onClick={onOpenAdminModal}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Acesso Admin (Catálogo Base)</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Modo Admin Ativo</span>
          </div>
        )}
      </div>

      {/* 1. USER PRIVATE FLEET (PREFIXES) */}
      {subTab === 'fleet' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Meus Prefixos Particulares (Hangar do Comandante — Perfil Little Navmap)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre suas matrículas (ex: <span className="font-mono">PR-DAN</span>, <span className="font-mono">PS-SRB</span>) com perfil completo de Subida, Cruzeiro, Descida, Alternativo e Combustível para automatizar a Seção 7.
              </p>
            </div>
            <button
              type="button"
              onClick={startNewPrefix}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Prefixo Particular</span>
            </button>
          </div>

          {!isAuthenticated && (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
              Você ainda não entrou com sua conta Google. Seus prefixos estão salvos localmente neste navegador — faça login no topo para sincronizar na nuvem!
            </div>
          )}

          {perfEditorMode === 'prefix' && renderLittleNavmapPerformanceForm()}

          {userFleet.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 py-10 text-center">
              <Plane className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Você ainda não cadastrou nenhum prefixo particular.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Clique em "Adicionar Prefixo Particular" acima para registrar sua matrícula favorita com perfil completo estilo Little Navmap.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {userFleet.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                          {p.registration}
                        </span>
                        {p.simulator && (
                          <span className="rounded bg-slate-200/80 dark:bg-slate-700 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            {p.simulator}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs text-slate-500">
                        {p.aircraftTypeCode}/{p.icaoCode}/{p.wakeTurbulence} • PER {p.performanceCategory}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {p.baseAircraftName}
                    </h4>
                    <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-lg bg-white dark:bg-slate-900/80 p-2.5 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Cruzeiro</div>
                        <div className="font-mono font-semibold">{p.defaultCruiseIasKts} kts</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Consumo</div>
                        <div className="font-mono font-semibold">{p.fuelConsumptionLph} L/h</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Descida</div>
                        <div className="font-mono font-semibold">
                          {p.defaultDescentIasKts} kts / {p.defaultDescentVsFpm}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Tanque</div>
                        <div className="font-mono font-semibold">
                          {p.usableFuelLiters ?? parseLitersFromDisplay(p.fuelCapacityDisplay)} L
                        </div>
                      </div>
                    </div>
                    {p.notes && (
                      <p className="mt-2 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {p.notes}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-200/70 dark:border-slate-700/60 pt-3">
                    <button
                      type="button"
                      onClick={() => onSelectAircraftForPlan('prefix', p.id)}
                      className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                    >
                      Usar no Planejamento
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditPrefix(p)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        title="Editar Performance (Little Navmap)"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteUserPrefix(p.id)}
                        className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-500/10"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. BASE AIRCRAFT CATALOG (GLOBAL - ADMIN EDITABLE) */}
      {subTab === 'catalog' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Catálogo Global de Aeronaves Base (TB_Aeronave — Perfis Completos Little Navmap)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aeronaves padrão disponíveis para todos os pilotos com dados de Subida, Cruzeiro, Descida (TOD), Alternativo e Combustível.{' '}
                {isAdmin
                  ? 'Como Admin, você pode adicionar, editar ou remover aeronaves base.'
                  : 'Para personalizar uma aeronave para você, crie um Prefixo Particular na primeira aba.'}
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={startNewBaseAircraft}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                <span>Nova Aeronave Base (Admin)</span>
              </button>
            )}
          </div>

          {perfEditorMode === 'base' && isAdmin && renderLittleNavmapPerformanceForm()}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Aeronave</th>
                  <th className="py-2.5 px-3">Tipo/ICAO/Est.</th>
                  <th className="py-2.5 px-3">PER</th>
                  <th className="py-2.5 px-3">Cruzeiro</th>
                  <th className="py-2.5 px-3">Descida (TOD)</th>
                  <th className="py-2.5 px-3">Consumo (L/h)</th>
                  <th className="py-2.5 px-3">Capacidade (litros)</th>
                  <th className="py-2.5 px-3">Peso Vazio (kg)</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {baseAircraftList.map((ac) => (
                  <tr
                    key={ac.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                      <div>{ac.name}</div>
                      {ac.notes && (
                        <div className="text-[10px] font-normal text-slate-400 line-clamp-1">
                          {ac.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-sky-600 dark:text-sky-400">
                      {ac.aircraftTypeCode}/{ac.icaoCode}/{ac.wakeTurbulence}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{ac.performanceCategory}</td>
                    <td className="py-2.5 px-3 font-mono font-semibold">
                      {ac.defaultCruiseIasKts} kts
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 dark:text-slate-300">
                      {ac.defaultDescentIasKts} kts / -{ac.defaultDescentVsFpm} fpm
                    </td>
                    <td className="py-2.5 px-3 font-mono">{ac.fuelConsumptionLph} L/h</td>
                    <td className="py-2.5 px-3">{normalizeCapacityLiters(ac.fuelCapacityDisplay)}</td>
                    <td className="py-2.5 px-3 font-mono">{ac.emptyWeightKg.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectAircraftForPlan('base', ac.id)}
                          className="rounded-lg bg-sky-500/10 px-2.5 py-1 text-[11px] font-semibold text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                        >
                          Selecionar
                        </button>
                        {isAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditBaseAircraft(ac)}
                              className="rounded p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                              title="Editar Perfil (Admin)"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteBaseAircraft(ac.id)}
                              className="rounded p-1 text-rose-500 hover:bg-rose-500/10"
                              title="Excluir (Admin)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. AERODROMES DATABASE (TB_Aerodromo) */}
      {subTab === 'aerodromes' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Base de Aeródromos (TB_Aerodromo — {aerodromes.length.toLocaleString('pt-BR')} pistas)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consulte todos os aeródromos brasileiros ou cadastre pistas/fazendas não localizadas (a elevação em pés é calculada automaticamente).
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={aeroSearch}
                  onChange={(e) => {
                    setAeroSearch(e.target.value);
                    setAeroPage(1);
                  }}
                  placeholder="Buscar ICAO, nome ou cidade..."
                  className="w-64 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-8 pr-3 py-1.5 text-xs"
                />
                <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                type="button"
                onClick={() => setShowAeroForm(!showAeroForm)}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                <Plus className="h-4 w-4" />
                <span>Incluir Aeródromo</span>
              </button>
            </div>
          </div>

          {showAeroForm && (
            <form
              onSubmit={handleSubmitAerodrome}
              className="mb-5 rounded-xl border border-sky-500/30 bg-sky-50/40 dark:bg-slate-800/60 p-4"
            >
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                Cadastrar / Atualizar Aeródromo
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
                <div>
                  <label className="block text-[11px] font-medium">ICAO (4 letras)</label>
                  <input
                    type="text"
                    required
                    maxLength={4}
                    value={aeroIcao}
                    onChange={(e) => setAeroIcao(e.target.value.toUpperCase())}
                    placeholder="SDXX"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-xs font-bold uppercase"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[11px] font-medium">Nome do Aeródromo</label>
                  <input
                    type="text"
                    required
                    value={aeroName}
                    onChange={(e) => setAeroName(e.target.value)}
                    placeholder="Ex: Fazenda Boa Vista"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium">Município</label>
                  <input
                    type="text"
                    required
                    value={aeroCity}
                    onChange={(e) => setAeroCity(e.target.value)}
                    placeholder="Ex: Campinas"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium">Elevação (Metros)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={aeroElevMeters}
                    onChange={(e) =>
                      setAeroElevMeters(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    placeholder="612"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-xs"
                  />
                  {aeroElevMeters !== '' && (
                    <span className="text-[10px] font-mono text-sky-500">
                      = {Math.round(Number(aeroElevMeters) * 3.28084)} ft
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium">Cabeceiras 1 / 2</label>
                  <div className="mt-1 flex gap-1">
                    <input
                      type="text"
                      maxLength={2}
                      required
                      value={aeroRwy1}
                      onChange={(e) => setAeroRwy1(e.target.value)}
                      placeholder="16"
                      className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-center font-mono text-xs"
                    />
                    <input
                      type="text"
                      maxLength={2}
                      required
                      value={aeroRwy2}
                      onChange={(e) => setAeroRwy2(e.target.value)}
                      placeholder="34"
                      className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-center font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {isAdmin ? (
                  <label className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <input
                      type="checkbox"
                      checked={saveAeroAsGlobal}
                      onChange={(e) => setSaveAeroAsGlobal(e.target.checked)}
                      className="rounded"
                    />
                    <span>Salvar na Base Global (visível para todos os usuários)</span>
                  </label>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Será salvo na sua conta privada de piloto.
                  </span>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAeroForm(false)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-sky-600 px-4 py-1 text-xs font-semibold text-white hover:bg-sky-500"
                  >
                    Salvar Aeródromo
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2 px-3">ICAO</th>
                  <th className="py-2 px-3">Nome</th>
                  <th className="py-2 px-3">Município</th>
                  <th className="py-2 px-3">Elevação (m)</th>
                  <th className="py-2 px-3">Elevação (ft)</th>
                  <th className="py-2 px-3">Cabeceiras</th>
                  <th className="py-2 px-3 text-right">AISWEB / Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {pagedAerodromes.map((a) => (
                  <tr key={a.icao} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                      {a.icao}
                      {a.isCustom && (
                        <span className="ml-1.5 rounded bg-amber-500/15 px-1.5 py-0.5 font-sans text-[10px] font-medium text-amber-500">
                          Privado
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                      {a.name}
                    </td>
                    <td className="py-2 px-3 text-slate-600 dark:text-slate-400">{a.city}</td>
                    <td className="py-2 px-3 font-mono">{a.elevationMeters} m</td>
                    <td className="py-2 px-3 font-mono font-semibold">
                      {Math.round(a.elevationFeet)} ft
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {a.runway1}/{a.runway2}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`https://aisweb.decea.mil.br/?i=aerodromos&codigo=${a.icao}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          <span>AISWEB</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {(a.isCustom || isAdmin) && (
                          <button
                            type="button"
                            onClick={() => onDeleteAerodrome(a.icao, !a.isCustom && isAdmin)}
                            className="rounded p-1 text-rose-500 hover:bg-rose-500/10"
                            title="Remover"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500">
            <span>
              Mostrando {(aeroPage - 1) * pageSize + 1}–
              {Math.min(aeroPage * pageSize, filteredAerodromes.length)} de{' '}
              {filteredAerodromes.length.toLocaleString('pt-BR')} aeródromos
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={aeroPage <= 1}
                onClick={() => setAeroPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="font-mono">
                Página {aeroPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={aeroPage >= totalPages}
                onClick={() => setAeroPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
