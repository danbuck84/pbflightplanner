import React, { useState, useMemo } from 'react';
import {
  Plane,
  Plus,
  Trash2,
  Edit3,
  Check,
  ShieldAlert,
  Lock,
  Search,
  MapPin,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import type {
  Aerodrome,
  BaseAircraft,
  PerformanceCategory,
  PropulsionType,
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

  // --- User Prefix Form State ---
  const [editingPrefixId, setEditingPrefixId] = useState<string | null>(null);
  const [showPrefixForm, setShowPrefixForm] = useState(false);
  const [selectedBaseIdForPrefix, setSelectedBaseIdForPrefix] = useState(
    baseAircraftList[0]?.id || 'c172'
  );
  const [regInput, setRegInput] = useState('PR-');
  const [customFuelLph, setCustomFuelLph] = useState<number>(35.6);
  const [customCapacity, setCustomCapacity] = useState('212 litros');
  const [customEmptyWeight, setCustomEmptyWeight] = useState<number>(743);
  const [customCruiseIas, setCustomCruiseIas] = useState<number>(110);
  const [customDescentIas, setCustomDescentIas] = useState<number>(110);
  const [customDescentVs, setCustomDescentVs] = useState<number>(600);
  const [customOperator, setCustomOperator] = useState('PARTICULAR');
  const [customNotes, setCustomNotes] = useState('');

  // --- Base Aircraft Admin Form State ---
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null);
  const [showBaseForm, setShowBaseForm] = useState(false);
  const [baseName, setBaseName] = useState('');
  const [baseTypeCode, setBaseTypeCode] = useState('L');
  const [baseIcao, setBaseIcao] = useState('');
  const [baseWake, setBaseWake] = useState<WakeTurbulenceCategory>('L');
  const [basePer, setBasePer] = useState<PerformanceCategory>('A');
  const [baseFuelLph, setBaseFuelLph] = useState<number>(35);
  const [baseCapacity, setBaseCapacity] = useState('200 litros');
  const [baseEmptyKg, setBaseEmptyKg] = useState<number>(750);
  const [basePropulsion, setBasePropulsion] = useState<PropulsionType>('Aviões hélice');
  const [baseCruiseIas, setBaseCruiseIas] = useState<number>(110);
  const [baseDescentIas, setBaseDescentIas] = useState<number>(110);
  const [baseDescentVs, setBaseDescentVs] = useState<number>(600);

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

  const handleBaseTemplateChange = (baseId: string) => {
    setSelectedBaseIdForPrefix(baseId);
    const found = baseAircraftList.find((b) => b.id === baseId);
    if (found) {
      setCustomFuelLph(found.fuelConsumptionLph);
      setCustomCapacity(found.fuelCapacityDisplay);
      setCustomEmptyWeight(found.emptyWeightKg);
      setCustomCruiseIas(found.defaultCruiseIasKts);
      setCustomDescentIas(found.defaultDescentIasKts);
      setCustomDescentVs(found.defaultDescentVsFpm);
    }
  };

  const startNewPrefix = () => {
    const first = baseAircraftList[0];
    setEditingPrefixId(null);
    setSelectedBaseIdForPrefix(first?.id || 'c172');
    setRegInput('PR-');
    setCustomFuelLph(first?.fuelConsumptionLph ?? 35.6);
    setCustomCapacity(first?.fuelCapacityDisplay ?? '212 litros');
    setCustomEmptyWeight(first?.emptyWeightKg ?? 743);
    setCustomCruiseIas(first?.defaultCruiseIasKts ?? 110);
    setCustomDescentIas(first?.defaultDescentIasKts ?? 110);
    setCustomDescentVs(first?.defaultDescentVsFpm ?? 600);
    setCustomOperator('GOLD VIRTUAL AIRLINES');
    setCustomNotes('');
    setShowPrefixForm(true);
  };

  const startEditPrefix = (p: UserAircraftPrefix) => {
    setEditingPrefixId(p.id);
    setSelectedBaseIdForPrefix(p.baseAircraftId);
    setRegInput(p.registration);
    setCustomFuelLph(p.fuelConsumptionLph);
    setCustomCapacity(p.fuelCapacityDisplay);
    setCustomEmptyWeight(p.emptyWeightKg);
    setCustomCruiseIas(p.defaultCruiseIasKts);
    setCustomDescentIas(p.defaultDescentIasKts);
    setCustomDescentVs(p.defaultDescentVsFpm);
    setCustomOperator(p.operatorName);
    setCustomNotes(p.notes || '');
    setShowPrefixForm(true);
  };

  const normalizeCapacityLiters = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    // If the user typed only digits/dots/commas (e.g., "348"), append " litros"
    if (/^[\d.,\s]+$/.test(trimmed)) {
      return `${trimmed} litros`;
    }
    return trimmed;
  };

  const handleSubmitPrefix = (e: React.FormEvent) => {
    e.preventDefault();
    const base = baseAircraftList.find((b) => b.id === selectedBaseIdForPrefix) || baseAircraftList[0];
    if (!base || !regInput.trim()) return;

    const newPrefix: UserAircraftPrefix = {
      id: editingPrefixId || `prefix-${Date.now()}`,
      registration: regInput.trim().toUpperCase(),
      baseAircraftId: base.id,
      baseAircraftName: base.name,
      aircraftTypeCode: base.aircraftTypeCode,
      icaoCode: base.icaoCode,
      wakeTurbulence: base.wakeTurbulence,
      performanceCategory: base.performanceCategory,
      fuelConsumptionLph: Number(customFuelLph) || 0,
      fuelCapacityDisplay: normalizeCapacityLiters(customCapacity),
      emptyWeightKg: Number(customEmptyWeight) || 0,
      propulsionType: base.propulsionType,
      defaultCruiseIasKts: Number(customCruiseIas) || 110,
      defaultDescentIasKts: Number(customDescentIas) || 110,
      defaultDescentVsFpm: Number(customDescentVs) || 600,
      operatorName: customOperator.trim() || 'PARTICULAR',
      notes: customNotes.trim(),
    };

    onSaveUserPrefix(newPrefix);
    setShowPrefixForm(false);
    setEditingPrefixId(null);
  };

  const startNewBaseAircraft = () => {
    setEditingBaseId(null);
    setBaseName('');
    setBaseTypeCode('L');
    setBaseIcao('');
    setBaseWake('L');
    setBasePer('A');
    setBaseFuelLph(35);
    setBaseCapacity('200 litros');
    setBaseEmptyKg(750);
    setBasePropulsion('Aviões hélice');
    setBaseCruiseIas(110);
    setBaseDescentIas(110);
    setBaseDescentVs(600);
    setShowBaseForm(true);
  };

  const startEditBaseAircraft = (ac: BaseAircraft) => {
    setEditingBaseId(ac.id);
    setBaseName(ac.name);
    setBaseTypeCode(ac.aircraftTypeCode);
    setBaseIcao(ac.icaoCode);
    setBaseWake(ac.wakeTurbulence);
    setBasePer(ac.performanceCategory);
    setBaseFuelLph(ac.fuelConsumptionLph);
    setBaseCapacity(ac.fuelCapacityDisplay);
    setBaseEmptyKg(ac.emptyWeightKg);
    setBasePropulsion(ac.propulsionType);
    setBaseCruiseIas(ac.defaultCruiseIasKts);
    setBaseDescentIas(ac.defaultDescentIasKts);
    setBaseDescentVs(ac.defaultDescentVsFpm);
    setShowBaseForm(true);
  };

  const handleSubmitBaseAircraft = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !baseName.trim() || !baseIcao.trim()) return;
    const item: BaseAircraft = {
      id: editingBaseId || `ac-${baseIcao.trim().toLowerCase()}-${Date.now()}`,
      name: baseName.trim(),
      aircraftTypeCode: baseTypeCode.trim().toUpperCase() || 'L',
      icaoCode: baseIcao.trim().toUpperCase(),
      wakeTurbulence: baseWake,
      performanceCategory: basePer,
      fuelConsumptionLph: Number(baseFuelLph) || 0,
      fuelCapacityDisplay: normalizeCapacityLiters(baseCapacity),
      emptyWeightKg: Number(baseEmptyKg) || 0,
      propulsionType: basePropulsion,
      defaultCruiseIasKts: Number(baseCruiseIas) || 110,
      defaultDescentIasKts: Number(baseDescentIas) || 110,
      defaultDescentVsFpm: Number(baseDescentVs) || 600,
    };
    onSaveBaseAircraft(item);
    setShowBaseForm(false);
    setEditingBaseId(null);
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
                Meus Prefixos Particulares (Hangar do Comandante)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cadastre suas matrículas (ex: <span className="font-mono">PR-DAN</span>, <span className="font-mono">PT-GLD</span>) vinculadas a uma Aeronave Base e personalize consumo, peso vazio e velocidades. Visível apenas na sua conta.
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

          {showPrefixForm && (
            <form
              onSubmit={handleSubmitPrefix}
              className="mb-6 rounded-xl border border-sky-500/30 bg-sky-50/40 dark:bg-slate-800/60 p-4"
            >
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingPrefixId ? 'Editar Prefixo Particular' : 'Novo Prefixo Particular'}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Aeronave Base (Modelo)
                  </label>
                  <select
                    value={selectedBaseIdForPrefix}
                    onChange={(e) => handleBaseTemplateChange(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold"
                  >
                    {baseAircraftList.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.icaoCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Prefixo / Matrícula
                  </label>
                  <input
                    type="text"
                    required
                    value={regInput}
                    onChange={(e) => setRegInput(e.target.value.toUpperCase())}
                    placeholder="Ex: PR-DAN"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Consumo Real (Litros/Hora)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={customFuelLph}
                    onChange={(e) => setCustomFuelLph(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Capacidade de Combustível (litros)
                  </label>
                  <input
                    type="text"
                    value={customCapacity}
                    onChange={(e) => setCustomCapacity(e.target.value)}
                    placeholder="Ex: 212 litros"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Peso Vazio - BEW (kg)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={customEmptyWeight}
                    onChange={(e) => setCustomEmptyWeight(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    VI / IAS Cruzeiro Padrão (kt)
                  </label>
                  <input
                    type="number"
                    value={customCruiseIas}
                    onChange={(e) => setCustomCruiseIas(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    VI Descida (kt) / Razão (fpm)
                  </label>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="number"
                      value={customDescentIas}
                      onChange={(e) => setCustomDescentIas(Number(e.target.value))}
                      placeholder="IAS"
                      className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-xs"
                    />
                    <input
                      type="number"
                      value={customDescentVs}
                      onChange={(e) => setCustomDescentVs(Number(e.target.value))}
                      placeholder="VS"
                      className="w-1/2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                    Operador (OPR/ no RMK)
                  </label>
                  <input
                    type="text"
                    value={customOperator}
                    onChange={(e) => setCustomOperator(e.target.value)}
                    placeholder="GOLD VIRTUAL AIRLINES"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs uppercase"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrefixForm(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 rounded-lg bg-sky-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Salvar Prefixo</span>
                </button>
              </div>
            </form>
          )}

          {userFleet.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 py-10 text-center">
              <Plane className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                Você ainda não cadastrou nenhum prefixo particular.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Clique em "Adicionar Prefixo Particular" acima para registrar sua matrícula favorita.
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
                      <span className="rounded-lg bg-sky-500/15 px-2.5 py-1 font-mono text-sm font-bold text-sky-600 dark:text-sky-400">
                        {p.registration}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {p.aircraftTypeCode}/{p.icaoCode}/{p.wakeTurbulence} • PER {p.performanceCategory}
                      </span>
                    </div>
                    <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                      {p.baseAircraftName}
                    </h4>
                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-white dark:bg-slate-900/80 p-2.5 text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400">Consumo</div>
                        <div className="font-mono font-semibold">{p.fuelConsumptionLph} L/h</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Peso Vazio</div>
                        <div className="font-mono font-semibold">{p.emptyWeightKg} kg</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Cruzeiro</div>
                        <div className="font-mono font-semibold">{p.defaultCruiseIasKts} kt</div>
                      </div>
                    </div>
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
                        title="Editar"
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
                Catálogo Global de Aeronaves Base (TB_Aeronave)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Aeronaves padrão disponíveis para todos os pilotos.{' '}
                {isAdmin
                  ? 'Como Admin, você pode adicionar, editar ou remover aeronaves base.'
                  : 'Somente leitura para usuários padrão (gerenciado pelo Admin).'}
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

          {showBaseForm && isAdmin && (
            <form
              onSubmit={handleSubmitBaseAircraft}
              className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-50/30 dark:bg-slate-800/70 p-4"
            >
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingBaseId ? 'Editar Aeronave Base (Admin)' : 'Adicionar Aeronave Base (Admin)'}
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium">Nome da Aeronave</label>
                  <input
                    type="text"
                    required
                    value={baseName}
                    onChange={(e) => setBaseName(e.target.value)}
                    placeholder="Ex: Cessna 172"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Código ICAO</label>
                  <input
                    type="text"
                    required
                    value={baseIcao}
                    onChange={(e) => setBaseIcao(e.target.value.toUpperCase())}
                    placeholder="C172"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Tipo / Esteira / PER</label>
                  <div className="mt-1 flex gap-1">
                    <input
                      type="text"
                      maxLength={1}
                      value={baseTypeCode}
                      onChange={(e) => setBaseTypeCode(e.target.value.toUpperCase())}
                      className="w-1/3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-center font-mono text-xs"
                      title="Tipo (L/H)"
                    />
                    <select
                      value={baseWake}
                      onChange={(e) => setBaseWake(e.target.value as WakeTurbulenceCategory)}
                      className="w-1/3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1.5 font-mono text-xs"
                      title="Esteira de Turbulência"
                    >
                      <option value="L">L</option>
                      <option value="M">M</option>
                      <option value="H">H</option>
                      <option value="J">J</option>
                    </select>
                    <select
                      value={basePer}
                      onChange={(e) => setBasePer(e.target.value as PerformanceCategory)}
                      className="w-1/3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1.5 font-mono text-xs"
                      title="Categoria PER"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                      <option value="E">E</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium">Consumo (L/h)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={baseFuelLph}
                    onChange={(e) => setBaseFuelLph(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Capacidade (litros)</label>
                  <input
                    type="text"
                    value={baseCapacity}
                    onChange={(e) => setBaseCapacity(e.target.value)}
                    placeholder="Ex: 348 litros"
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Peso Vazio (kg)</label>
                  <input
                    type="number"
                    value={baseEmptyKg}
                    onChange={(e) => setBaseEmptyKg(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium">Regra CT Propulsão</label>
                  <select
                    value={basePropulsion}
                    onChange={(e) => setBasePropulsion(e.target.value as PropulsionType)}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                  >
                    <option value="Aviões hélice">Aviões hélice</option>
                    <option value="Aviões jato">Aviões jato</option>
                    <option value="Helicópteros">Helicópteros</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBaseForm(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
                >
                  Salvar no Catálogo Global
                </button>
              </div>
            </form>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3">Aeronave</th>
                  <th className="py-2.5 px-3">Tipo/ICAO/Est. Turb.</th>
                  <th className="py-2.5 px-3">PER</th>
                  <th className="py-2.5 px-3">Consumo (L/h)</th>
                  <th className="py-2.5 px-3">Capacidade (litros)</th>
                  <th className="py-2.5 px-3">Peso Vazio (kg)</th>
                  <th className="py-2.5 px-3">Regra CT</th>
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
                      {ac.name}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-sky-600 dark:text-sky-400">
                      {ac.aircraftTypeCode}/{ac.icaoCode}/{ac.wakeTurbulence}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{ac.performanceCategory}</td>
                    <td className="py-2.5 px-3 font-mono">{ac.fuelConsumptionLph}</td>
                    <td className="py-2.5 px-3">{normalizeCapacityLiters(ac.fuelCapacityDisplay)}</td>
                    <td className="py-2.5 px-3 font-mono">{ac.emptyWeightKg.toLocaleString('pt-BR')}</td>
                    <td className="py-2.5 px-3">{ac.propulsionType}</td>
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
                              title="Editar (Admin)"
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
