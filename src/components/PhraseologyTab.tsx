import React from 'react';
import { ShieldCheck, Info, Radio, RotateCcw, Volume2 } from 'lucide-react';
import type { Aerodrome, FlightPlan } from '../types/aviation';

interface PhraseologyTabProps {
  plan: FlightPlan;
  onUpdatePlan: (updater: (prev: FlightPlan) => FlightPlan) => void;
  originAerodrome?: Aerodrome;
  destinationAerodrome?: Aerodrome;
  alternateAerodrome?: Aerodrome;
  originActiveRunway: string;
  destinationActiveRunway: string;
  predominantAltitudeCode: string;
  totalEnduranceFormatted: string;
}

const PHONETIC_MAP: Record<string, string> = {
  A: 'ALFA',
  B: 'BRAVO',
  C: 'CHARLIE',
  D: 'DELTA',
  E: 'ECHO',
  F: 'FOXTROT',
  G: 'GOLF',
  H: 'HOTEL',
  I: 'INDIA',
  J: 'JULIETT',
  K: 'KILO',
  L: 'LIMA',
  M: 'MIKE',
  N: 'NOVEMBER',
  O: 'OSCAR',
  P: 'PAPA',
  Q: 'QUEBEC',
  R: 'ROMEU',
  S: 'SIERRA',
  T: 'TANGO',
  U: 'UNIFORM',
  V: 'VICTOR',
  W: 'WHISKEY',
  X: 'X-RAY',
  Y: 'YANKEE',
  Z: 'ZULU',
  '0': 'ZERO',
  '1': 'UNO',
  '2': 'DOIS',
  '3': 'TRÊS',
  '4': 'QUATRO',
  '5': 'CINCO',
  '6': 'MEIA',
  '7': 'SETE',
  '8': 'OITO',
  '9': 'NOVE',
};

/**
 * Known spoken ATC names for major Brazilian aerodromes so the pilot speaks the real radio name
 * (e.g. "São José dos Campos", "Campo de Marte", "Congonhas", "Guarulhos") instead of spelling ICAO.
 */
const SPOKEN_AERODROME_NAMES: Record<string, string> = {
  SBMT: 'Campo de Marte',
  SBSP: 'Congonhas',
  SBGR: 'Guarulhos',
  SBRJ: 'Santos Dumont',
  SBGL: 'Galeão',
  SBKP: 'Viracopos',
  SBSJ: 'São José dos Campos',
  SBJD: 'Jundiaí',
  SBTA: 'Taubaté',
  SDUB: 'Ubatuba',
  SDAM: 'Amarais',
  SBJH: 'Catarina',
  SBBP: 'Bragança',
  SBGP: 'Gavião Peixoto',
  SDSC: 'São Carlos',
  SBRP: 'Ribeirão',
  SBSR: 'Rio Preto',
  SBAU: 'Araçatuba',
  SBDN: 'Prudente',
  SBML: 'Marília',
  SBAE: 'Bauru',
  SDCO: 'Sorocaba',
  SDIM: 'Itanhaém',
  SBGW: 'Guaratinguetá',
  SBBR: 'Brasília',
  SBCF: 'Confins',
  SBBH: 'Pampulha',
  SBUR: 'Uberaba',
  SBUL: 'Uberlândia',
  SBJF: 'Juiz de Fora',
  SBCT: 'Afonso Pena',
  SBBI: 'Bacacheri',
  SBFL: 'Florianópolis',
  SBNF: 'Navegantes',
  SBJV: 'Joinville',
  SBLO: 'Londrina',
  SBMG: 'Maringá',
  SBFI: 'Foz',
  SBPA: 'Salgado Filho',
  SBCX: 'Caxias',
  SBPK: 'Pelotas',
  SBGO: 'Goiânia',
  SBCY: 'Cuiabá',
  SBCG: 'Campo Grande',
  SBSV: 'Salvador',
  SBRF: 'Recife',
  SBFZ: 'Fortaleza',
  SBNT: 'Natal',
  SBMO: 'Maceió',
  SBAR: 'Aracaju',
  SBJP: 'João Pessoa',
  SBTE: 'Teresina',
  SBSL: 'São Luís',
  SBBE: 'Belém',
  SBEG: 'Eduardo Gomes',
  SBMN: 'Ponta Pelada',
  SBPJ: 'Palmas',
  SBPV: 'Porto Velho',
  SBRB: 'Rio Branco',
  SBBV: 'Boa Vista',
  SBMQ: 'Macapá',
  SBVT: 'Vitória',
  SBME: 'Macaé',
  SBJR: 'Jacarepaguá',
  SBCB: 'Cabo Frio',
  SBCP: 'Campos',
};

/**
 * Converts any alphanumeric string (callsign, ICAO, digits) to full ICAO/DECEA PT-BR phonetic words.
 * Example: "D114LC" -> "DELTA UNO UNO QUATRO LIMA CHARLIE"
 */
function toPhonetic(raw: string): string {
  const cleaned = (raw || '').trim().toUpperCase();
  if (!cleaned) return '';
  const words: string[] = [];
  for (const ch of cleaned) {
    if (PHONETIC_MAP[ch]) {
      words.push(PHONETIC_MAP[ch]);
    }
  }
  return words.join(' ');
}

/**
 * Formats a radio frequency as a clean numeric string (e.g. "121.90").
 */
function formatFrequencyNumeric(rawFreq?: string, placeholder = 'XXX.XX'): string {
  const trimmed = (rawFreq || '').trim().replace(',', '.');
  return trimmed || placeholder;
}

/**
 * Formats runway designator cleanly (e.g. "15", "33", "09R").
 */
function formatRunwayClean(rawRwy?: string): string {
  const trimmed = (rawRwy || '').trim().toUpperCase();
  if (!trimmed || trimmed === 'XX' || trimmed === '—') return 'XX';
  return trimmed.split(/\s+/)[0];
}

/**
 * Resolves the spoken name of an aerodrome for ATC calls (e.g. "São José dos Campos", "Campo de Marte").
 * Falls back to city or aerodrome name if available, or phonetic ICAO if unknown.
 */
function getSpokenAerodromeName(icao: string, aerodrome?: Aerodrome): string {
  const code = (icao || '').trim().toUpperCase();
  if (!code) return '___________';
  if (SPOKEN_AERODROME_NAMES[code]) {
    return SPOKEN_AERODROME_NAMES[code];
  }
  if (aerodrome) {
    if (aerodrome.city && aerodrome.city !== '-' && aerodrome.city.trim()) {
      return aerodrome.city.trim();
    }
    if (aerodrome.name && aerodrome.name.trim()) {
      return aerodrome.name.trim();
    }
  }
  return toPhonetic(code) || code;
}

const ATC_AGENCIES = [
  {
    name: 'Tráfego (Delivery)',
    code: 'TRÁFEGO',
    responsibility: 'Somente aprova e emite autorização do Plano de Voo.',
  },
  {
    name: 'Controle Solo (Ground)',
    code: 'SOLO',
    responsibility:
      'Pushback, acionamento e táxi até o ponto de espera (na partida) e do momento em que livra a pista até o pátio (no pouso).',
  },
  {
    name: 'Torre de Controle (Tower)',
    code: 'TORRE',
    responsibility:
      'Autorizar alinhamento, decolagem na pista em uso e entrada no circuito de tráfego / pouso.',
  },
  {
    name: 'Controle de Aproximação (APP)',
    code: 'CONTROLE',
    responsibility:
      'Organizar o tráfego que chega e sai dentro de uma Terminal (TMA).',
  },
  {
    name: 'Centro de Controle de Área (ACC)',
    code: 'CENTRO',
    responsibility:
      'Responsável pelas aerovias e espaço aéreo superior/inferior em rota. Acumula funções top-down quando órgãos locais estão fechados.',
  },
  {
    name: 'Rádio / AFIS / UNICOM',
    code: 'RÁDIO / UNICOM',
    responsibility:
      'Serviço de informação de voo de aeródromo (AFIS) ou coordenação livre entre aeronaves na frequência padrão 122.80.',
  },
];

export const PhraseologyTab: React.FC<PhraseologyTabProps> = ({
  plan,
  onUpdatePlan,
  originAerodrome,
  destinationAerodrome,
  originActiveRunway,
  destinationActiveRunway,
  predominantAltitudeCode,
  totalEnduranceFormatted,
}) => {
  const rawCallsign = plan.callsign.trim().toUpperCase();
  const callsignPhonetic = rawCallsign
    ? toPhonetic(rawCallsign)
    : 'DELTA UNO UNO QUATRO LIMA CHARLIE';

  // Abbreviated callsign (last 3 characters) spoken phonetically
  const cleanAlnumCallsign = rawCallsign.replace(/[^A-Z0-9]/g, '');
  const shortRaw =
    cleanAlnumCallsign.length >= 3 ? cleanAlnumCallsign.slice(-3) : cleanAlnumCallsign;
  const shortCallsignPhonetic = shortRaw
    ? toPhonetic(shortRaw)
    : 'QUATRO LIMA CHARLIE';

  const originIcao = plan.origin.icao.trim().toUpperCase();
  const destIcao = plan.destination.icao.trim().toUpperCase();
  const altIcao = plan.alternate.icao.trim().toUpperCase();

  // Named aerodromes keep their spoken name (e.g. "São José dos Campos", "Campo de Marte", "Ubatuba")
  const originSpokenName = getSpokenAerodromeName(originIcao, originAerodrome);
  const destSpokenName = getSpokenAerodromeName(destIcao, destinationAerodrome);

  // Alternate aerodrome is spelled out letter-by-letter phonetically in readbacks
  const altSpelledPhonetic = altIcao
    ? `${toPhonetic(altIcao)} (${altIcao})`
    : 'SIERRA BRAVO TANGO ALFA';

  // Runways (numeric/standard designator)
  const depRwy = formatRunwayClean(originActiveRunway);
  const arrRwy = formatRunwayClean(destinationActiveRunway);

  // QNH (kept numeric, not phonetic text)
  const rawQnhOrigin =
    plan.origin.qnhHpa !== '' ? String(plan.origin.qnhHpa) : '1010';
  const rawQnhDest =
    plan.destination.qnhHpa !== ''
      ? String(plan.destination.qnhHpa)
      : rawQnhOrigin;

  // POB (numeric)
  const pobNum = String(plan.crewCount || 1);

  // Flight Rule
  const flightRule = plan.flightRule || 'VFR';
  const flightRuleSpoken =
    flightRule === 'VFR' ? 'VISUAL (VFR)' : 'POR INSTRUMENTOS (IFR)';

  // Altitude / Flight Level in phonetic (e.g. A053 -> ZERO CINCO TRÊS (A053))
  const rawAltDigits = predominantAltitudeCode
    ? predominantAltitudeCode.replace(/^(FL|A|F)/i, '')
    : '';
  const altPhoneticDigits = rawAltDigits
    ? `${toPhonetic(rawAltDigits)} (${predominantAltitudeCode})`
    : 'ZERO CINCO CINCO';

  // Endurance (kept numeric HH:MM)
  const hasEndurance =
    totalEnduranceFormatted && totalEnduranceFormatted !== '00:00:00';
  const enduranceParts = totalEnduranceFormatted.split(':');
  const enduranceDisplay =
    hasEndurance && enduranceParts.length >= 2
      ? `${enduranceParts[0]}:${enduranceParts[1]}`
      : '03:00';

  // Derive exit and approach waypoints directly from the Route Legs (Section 6) or scratchpad override
  const validWaypoints = plan.legs
    .map((l) => l.waypoint.trim().toUpperCase())
    .filter((wp) => wp && wp !== destIcao && wp !== altIcao);

  const exitProfile =
    (plan.sidOrExitProfile || '').trim().toUpperCase() ||
    validWaypoints[0] ||
    'SAÍDA PADRÃO';
  const approachProfile =
    (plan.starOrApproachProfile || '').trim().toUpperCase() ||
    (validWaypoints.length > 0 ? validWaypoints[validWaypoints.length - 1] : 'APROXIMAÇÃO VISUAL');

  // --- Frequencies & Readback Values from Pilot's Scratchpad (numeric) ---
  const originAtisLetterPhonetic = plan.originAtisLetter?.trim()
    ? toPhonetic(plan.originAtisLetter.trim()[0])
    : '';
  const destAtisLetterPhonetic = plan.arrivalAtisLetter?.trim()
    ? toPhonetic(plan.arrivalAtisLetter.trim()[0])
    : '';

  const freqTrafficOrigin = formatFrequencyNumeric(plan.departureFreqTraffic, 'XXX.XX');
  const freqGroundOrigin = formatFrequencyNumeric(plan.departureFreqGround, 'XXX.XX');
  const freqTowerOrigin = formatFrequencyNumeric(plan.departureFreqTower, 'XXX.XX');

  const depAppName = plan.departureAppName?.trim() || originSpokenName;
  const freqAppDep = formatFrequencyNumeric(plan.departureFreqApp, 'XXX.XX');

  const centerName = plan.enrouteCenterName?.trim() || 'Brasília / Curitiba';
  const freqCenter = formatFrequencyNumeric(plan.enrouteFreqCenter, 'XXX.XX');

  const arrAppName = plan.arrivalAppName?.trim() || destSpokenName;
  const freqAppArr = formatFrequencyNumeric(plan.arrivalFreqApp, 'XXX.XX');

  const freqRadioDest = formatFrequencyNumeric(plan.arrivalFreqRadio, 'XXX.XX');
  const freqTowerDest = formatFrequencyNumeric(plan.arrivalFreqTower, 'XXX.XX');
  const freqGroundDest = formatFrequencyNumeric(plan.arrivalFreqGround, 'XXX.XX');
  const freqAlternate = formatFrequencyNumeric(plan.alternateFreq, 'XXX.XX');
  const freqUnicom = formatFrequencyNumeric(plan.unicomFreq || '122.80', '122.80');

  // Transponder kept as numeric digits
  const squawkNumeric = plan.transponderCode?.trim() || '2000';

  const parkingOrigin = plan.parkingStand?.trim() || 'PÁTIO PRINCIPAL';
  const taxiwaysOrigin = plan.originTaxiways?.trim().toUpperCase() || 'ALFA';

  const taxiwaysDest = plan.arrivalTaxiways?.trim().toUpperCase() || 'ALFA';
  const parkingDest = plan.arrivalParkingStand?.trim() || 'PÁTIO GERAL';

  const clearFrequenciesScratchpad = () => {
    onUpdatePlan((prev) => ({
      ...prev,
      parkingStand: '',
      originTaxiways: '',
      originAtisFreq: '',
      originAtisLetter: '',
      departureFreqTraffic: '',
      departureFreqGround: '',
      departureFreqTower: '',
      departureFreqRadio: '',
      departureAppName: '',
      departureFreqApp: '',
      enrouteCenterName: '',
      enrouteFreqCenter: '',
      arrivalAppName: '',
      arrivalFreqApp: '',
      arrivalAtisFreq: '',
      arrivalAtisLetter: '',
      arrivalFreqRadio: '',
      arrivalFreqTower: '',
      arrivalFreqGround: '',
      arrivalTaxiways: '',
      arrivalParkingStand: '',
      alternateFreq: '',
      unicomFreq: '122.80',
      sidOrExitProfile: '',
      starOrApproachProfile: '',
      transponderCode: '',
    }));
  };

  const PhraseStep = ({
    stepNumber,
    title,
    badge,
    dialogues,
  }: {
    stepNumber: number;
    title: string;
    badge?: string;
    dialogues: Array<{ speaker: 'PILOTO' | 'ATC'; text: string }>;
  }) => (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
            {stepNumber}
          </span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        </div>
        {badge && (
          <span className="rounded-lg bg-sky-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-sky-600 dark:text-sky-400">
            {badge}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {dialogues.map((d, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 rounded-lg p-2.5 text-xs leading-relaxed ${
              d.speaker === 'PILOTO'
                ? 'bg-sky-50/80 dark:bg-sky-950/35 border border-sky-200/60 dark:border-sky-800/40 text-slate-800 dark:text-slate-100'
                : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-300'
            }`}
          >
            <span
              className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                d.speaker === 'PILOTO'
                  ? 'bg-sky-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {d.speaker}
            </span>
            <p className="font-medium">{d.text}</p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* PILOT RADIO & CLEARANCE SCRATCHPAD (KNEBOARD DE FREQUÊNCIAS E COTEJAMENTO) */}
      <section className="rounded-2xl border border-sky-500/35 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 text-sky-500">
              <Radio className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Prancheta de Frequências &amp; Cotejamento em Tempo Real (Kneeboard de Rádio)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anote aqui as frequências, transponder e taxiways conforme o Controle ditar — toda a fraseologia abaixo é atualizada na hora por extenso no alfabeto fonético!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Volume2 className="h-3.5 w-3.5" />
              <span>Callsign Fonético: {callsignPhonetic}</span>
            </div>
            <button
              type="button"
              onClick={clearFrequenciesScratchpad}
              className="flex items-center gap-1 rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Limpar frequências anotadas"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Limpar Frequências</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Column 1: Origin Frequencies */}
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3.5">
            <h3 className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              <span>1. Origem: {originSpokenName} ({originIcao || 'ORIG'})</span>
              <span className="font-mono text-[11px]">RWY {originActiveRunway || '—'}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  ATIS Origem (Freq):
                </label>
                <input
                  type="text"
                  value={plan.originAtisFreq || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, originAtisFreq: e.target.value }))
                  }
                  placeholder="Ex: 127.65"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Letra Info ATIS:
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={plan.originAtisLetter || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({
                      ...p,
                      originAtisLetter: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Ex: A (ALFA)"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Tráfego (Delivery):
                </label>
                <input
                  type="text"
                  value={plan.departureFreqTraffic || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, departureFreqTraffic: e.target.value }))
                  }
                  placeholder="Ex: 121.00"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Solo (Ground):
                </label>
                <input
                  type="text"
                  value={plan.departureFreqGround || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, departureFreqGround: e.target.value }))
                  }
                  placeholder="Ex: 121.90"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Torre (Tower):
                </label>
                <input
                  type="text"
                  value={plan.departureFreqTower || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, departureFreqTower: e.target.value }))
                  }
                  placeholder="Ex: 118.50"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Rádio / AFIS Origem:
                </label>
                <input
                  type="text"
                  value={plan.departureFreqRadio || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, departureFreqRadio: e.target.value }))
                  }
                  placeholder="Ex: 125.15"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Pátio / Box / Posição:
                </label>
                <input
                  type="text"
                  value={plan.parkingStand || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, parkingStand: e.target.value }))
                  }
                  placeholder="Ex: Pátio 1 / Box 4"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Taxiways Saída:
                </label>
                <input
                  type="text"
                  value={plan.originTaxiways || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, originTaxiways: e.target.value }))
                  }
                  placeholder="Ex: A, B"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs uppercase"
                />
              </div>
            </div>
          </div>

          {/* Column 2: Enroute, APP, ACC & Clearance */}
          <div className="rounded-xl border border-sky-500/25 bg-sky-500/5 p-3.5">
            <h3 className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400">
              <span>2. Cotejamento, Controle (APP), Centro &amp; UNICOM</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  Transponder (Squawk Nº):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  value={plan.transponderCode || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({
                      ...p,
                      transponderCode: e.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  placeholder="Ex: 2000"
                  className="mt-1 w-full rounded-lg border-2 border-amber-500/60 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-extrabold tracking-widest text-amber-600 dark:text-amber-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  UNICOM / Livre:
                </label>
                <input
                  type="text"
                  value={plan.unicomFreq ?? '122.80'}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, unicomFreq: e.target.value }))
                  }
                  placeholder="122.80"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Nome Controle Saída:
                </label>
                <input
                  type="text"
                  value={plan.departureAppName || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, departureAppName: e.target.value }))
                  }
                  placeholder={`Ex: ${originSpokenName}`}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Freq. Controle Saída:
                </label>
                <input
                  type="text"
                  value={plan.departureFreqApp || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, departureFreqApp: e.target.value }))
                  }
                  placeholder="Ex: 129.05"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Nome do Centro (ACC):
                </label>
                <input
                  type="text"
                  value={plan.enrouteCenterName || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, enrouteCenterName: e.target.value }))
                  }
                  placeholder="Ex: Brasília / Curitiba"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Freq. do Centro (ACC):
                </label>
                <input
                  type="text"
                  value={plan.enrouteFreqCenter || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, enrouteFreqCenter: e.target.value }))
                  }
                  placeholder="Ex: 135.20"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Nome Controle Chegada:
                </label>
                <input
                  type="text"
                  value={plan.arrivalAppName || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalAppName: e.target.value }))
                  }
                  placeholder={`Ex: ${destSpokenName}`}
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Freq. Controle Chegada:
                </label>
                <input
                  type="text"
                  value={plan.arrivalFreqApp || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalFreqApp: e.target.value }))
                  }
                  placeholder="Ex: 119.80"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
            </div>
          </div>

          {/* Column 3: Destination & Alternate Frequencies */}
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3.5">
            <h3 className="mb-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <span>3. Destino: {destSpokenName} ({destIcao || 'DEST'}) &amp; Alt.</span>
              <span className="font-mono text-[11px]">RWY {destinationActiveRunway || '—'}</span>
            </h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  ATIS Destino (Freq):
                </label>
                <input
                  type="text"
                  value={plan.arrivalAtisFreq || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalAtisFreq: e.target.value }))
                  }
                  placeholder="Ex: 127.80"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Letra Info ATIS Dest.:
                </label>
                <input
                  type="text"
                  maxLength={2}
                  value={plan.arrivalAtisLetter || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({
                      ...p,
                      arrivalAtisLetter: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="Ex: B (BRAVO)"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-bold uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Torre Destino (Tower):
                </label>
                <input
                  type="text"
                  value={plan.arrivalFreqTower || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalFreqTower: e.target.value }))
                  }
                  placeholder="Ex: 118.10"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Solo Destino (Ground):
                </label>
                <input
                  type="text"
                  value={plan.arrivalFreqGround || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalFreqGround: e.target.value }))
                  }
                  placeholder="Ex: 121.70"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs font-semibold text-sky-600 dark:text-sky-400"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Rádio / FCA Destino:
                </label>
                <input
                  type="text"
                  value={plan.arrivalFreqRadio || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalFreqRadio: e.target.value }))
                  }
                  placeholder="Ex: 123.45"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Freq. Alternativo ({altIcao || 'ALT'}):
                </label>
                <input
                  type="text"
                  value={plan.alternateFreq || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, alternateFreq: e.target.value }))
                  }
                  placeholder="Ex: 118.30"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Taxiway de Saída Pista:
                </label>
                <input
                  type="text"
                  value={plan.arrivalTaxiways || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalTaxiways: e.target.value }))
                  }
                  placeholder="Ex: C"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 font-mono text-xs uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  Pátio / Gate Destino:
                </label>
                <input
                  type="text"
                  value={plan.arrivalParkingStand || ''}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, arrivalParkingStand: e.target.value }))
                  }
                  placeholder="Ex: Pátio Geral"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <PhraseStep
            stepNumber={1}
            title="1) Fraseologia com Tráfego (Autorização de Plano de Voo)"
            badge={plan.departureFreqTraffic ? `TRÁFEGO: ${plan.departureFreqTraffic}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Tráfego ${originSpokenName}, ${callsignPhonetic} (em ${freqTrafficOrigin}).`,
              },
              {
                speaker: 'PILOTO',
                text: `${callsignPhonetic}, solicito autorização do plano de voo para ${destSpokenName}, na regra de voo ${flightRuleSpoken}, nível ${altPhoneticDigits}, ciente da informação ${
                  originAtisLetterPhonetic || 'do METAR'
                }.`,
              },
              {
                speaker: 'PILOTO',
                text: `${shortCallsignPhonetic}, pronto para cópia.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, autorizado para ${destSpokenName}, regra de voo ${flightRuleSpoken}, saída ${exitProfile}, nível de voo ${altPhoneticDigits}, pista em uso ${depRwy}, acione transponder ${squawkNumeric}, ajuste de altímetro ${rawQnhOrigin}, chame o Solo ${originSpokenName} na frequência ${freqGroundOrigin}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Cotejando: autorizado para ${destSpokenName}, voo ${flightRuleSpoken}, saída ${exitProfile}, nível ${altPhoneticDigits}, pista em uso ${depRwy}, transponder ${squawkNumeric}, ajuste ${rawQnhOrigin}, e chamará o Solo ${originSpokenName} na frequência ${freqGroundOrigin}, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={2}
            title="2) Fraseologia com Solo (Pushback, Acionamento e Táxi)"
            badge={plan.departureFreqGround ? `SOLO: ${plan.departureFreqGround}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Solo ${originSpokenName}, ${callsignPhonetic}, no ${parkingOrigin}, pronto para acionamento (e pushback)${
                  originAtisLetterPhonetic ? ` com a informação ${originAtisLetterPhonetic}` : ''
                }.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, autorizado acionamento (e pushback), reporte pronto para o táxi.`,
              },
              {
                speaker: 'PILOTO',
                text: `Autorizado acionamento, reportará pronto para o táxi, ${shortCallsignPhonetic}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Solo ${originSpokenName}, ${callsignPhonetic} pronto para o táxi, com ${pobNum} pessoa(s) a bordo, autonomia de ${enduranceDisplay}, alternado ${altSpelledPhonetic}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, autorizado táxi via taxiway ${taxiwaysOrigin} até o ponto de espera da pista ${depRwy}, ajuste de altímetro ${rawQnhOrigin}, no ponto de espera chame a Torre ${originSpokenName} na frequência ${freqTowerOrigin}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Autorizado táxi via ${taxiwaysOrigin} até o ponto de espera da pista ${depRwy}, ajuste ${rawQnhOrigin}, chamará a Torre ${originSpokenName} na frequência ${freqTowerOrigin}, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={3}
            title="3) Fraseologia com a Torre (Ingresso na Pista e Decolagem)"
            badge={plan.departureFreqTower ? `TORRE: ${plan.departureFreqTower}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Torre ${originSpokenName}, ${callsignPhonetic}, no ponto de espera da pista ${depRwy}, pronto para decolagem.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, autorizado alinhar e manter na pista ${depRwy}, aguarde autorização de decolagem.`,
              },
              {
                speaker: 'PILOTO',
                text: `Alinha e mantém na pista ${depRwy}, ${shortCallsignPhonetic}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, vento calmo/operacional, livre decolagem na pista ${depRwy}, após a decolagem chame o Controle ${depAppName} na frequência ${freqAppDep}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Livre decolagem pista ${depRwy}, após a decolagem chamará o Controle ${depAppName} na frequência ${freqAppDep}, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={4}
            title="4) Fraseologia com Controle de Saída (APP — Subida Inicial)"
            badge={plan.departureFreqApp ? `APP SAÍDA: ${plan.departureFreqApp}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Controle ${depAppName}, ${callsignPhonetic}, decolado de ${originSpokenName} pista ${depRwy}, cumprindo perfil ${exitProfile}, subindo para o nível ${altPhoneticDigits}, na sua escuta.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, contato radar, suba e mantenha o nível ${altPhoneticDigits} no perfil ${exitProfile}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Sobe e mantém o nível ${altPhoneticDigits} no perfil ${exitProfile}, ${shortCallsignPhonetic}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, chame agora o Centro ${centerName} na frequência ${freqCenter}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Chamará o Centro ${centerName} na frequência ${freqCenter}, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={5}
            title="5) Fraseologia com Centro (Comunicação em Rota)"
            badge={plan.enrouteFreqCenter ? `CENTRO: ${plan.enrouteFreqCenter}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Centro ${centerName}, ${callsignPhonetic}, mantendo nível ${altPhoneticDigits}, na sua escuta.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, Centro ${centerName}, ciente, mantenha nível ${altPhoneticDigits} sob vigilância radar.`,
              },
              {
                speaker: 'PILOTO',
                text: `${callsignPhonetic}, solicita descida para ${destSpokenName}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, chame o Controle ${arrAppName} na frequência ${freqAppArr} (ou Centro ${centerName} em ${freqCenter}).`,
              },
              {
                speaker: 'PILOTO',
                text: `${callsignPhonetic}, chamará o Controle ${arrAppName} na frequência ${freqAppArr}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={6}
            title="6) Fraseologia com Controle de Chegada (APP — Aproximação)"
            badge={plan.arrivalFreqApp ? `APP CHEGADA: ${plan.arrivalFreqApp}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Controle ${arrAppName}, ${callsignPhonetic}, na sua escuta, ciente do ajuste ${rawQnhDest}${
                  destAtisLetterPhonetic ? ` e informação ${destAtisLetterPhonetic}` : ''
                }.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, desça via ${approachProfile} sob vigilância radar para a pista em uso ${arrRwy} de ${destSpokenName}, ajuste de altímetro ${rawQnhDest}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Desce via ${approachProfile} para a pista ${arrRwy}, no ajuste ${rawQnhDest}, ${shortCallsignPhonetic}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, chame a Torre ${destSpokenName} na frequência ${freqTowerDest}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Chamará a Torre ${destSpokenName} na frequência ${freqTowerDest}, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={7}
            title="7) Fraseologia com a Torre (Circuito de Tráfego e Pouso)"
            badge={plan.arrivalFreqTower ? `TORRE DEST: ${plan.arrivalFreqTower}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Torre ${destSpokenName}, ${callsignPhonetic}, ingressando na perna do vento / final da pista ${arrRwy}, trem de pouso baixado e travado.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, pouso autorizado na pista ${arrRwy}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Pouso autorizado na pista ${arrRwy}, ${shortCallsignPhonetic}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, no solo, livre a pista pela próxima interseção e chame o Solo ${destSpokenName} na frequência ${freqGroundDest}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Chamará o Solo ${destSpokenName} na frequência ${freqGroundDest}, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={8}
            title="8) Fraseologia com Solo no Destino (Táxi até o Pátio e Corte)"
            badge={plan.arrivalFreqGround ? `SOLO DEST: ${plan.arrivalFreqGround}` : undefined}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Solo ${destSpokenName}, ${callsignPhonetic}, pista ${arrRwy} livrada na taxiway ${taxiwaysDest}, solicita táxi para o ${parkingDest}.`,
              },
              {
                speaker: 'ATC',
                text: `${callsignPhonetic}, autorizado táxi via ${taxiwaysDest} até o ${parkingDest}, mantenha escuta até o corte dos motores.`,
              },
              {
                speaker: 'PILOTO',
                text: `Segue no táxi via ${taxiwaysDest} até o ${parkingDest}, na escuta até o corte, ${callsignPhonetic}.`,
              },
            ]}
          />

          <PhraseStep
            stepNumber={9}
            title="9) Coordenação Livre na UNICOM / Rádio AFIS (Aeródromos sem ATC ativo)"
            badge={`UNICOM: ${plan.unicomFreq || '122.80'} ${
              plan.arrivalFreqRadio ? `• RÁDIO: ${plan.arrivalFreqRadio}` : ''
            }`}
            dialogues={[
              {
                speaker: 'PILOTO',
                text: `Tráfego de ${originSpokenName} na frequência ${freqUnicom}, ${callsignPhonetic}, iniciando táxi do ${parkingOrigin} para o ponto de espera da pista ${depRwy}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Tráfego de ${originSpokenName}, ${callsignPhonetic}, alinhando e decolando da pista ${depRwy}, subindo para o nível ${altPhoneticDigits} na proa de ${exitProfile}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Tráfego de ${destSpokenName} (em ${
                  plan.arrivalFreqRadio ? freqRadioDest : freqUnicom
                }), ${callsignPhonetic}, a 10 milhas, ingressando no circuito de tráfego para pouso na pista ${arrRwy}, ajuste ${rawQnhDest}.`,
              },
              {
                speaker: 'PILOTO',
                text: `Tráfego de ${destSpokenName}, ${callsignPhonetic}, na final curta da pista ${arrRwy} para pouso (ou arremetendo e prosseguindo para o alternado ${altSpelledPhonetic} na frequência ${freqAlternate}).`,
              },
            ]}
          />
        </div>

        {/* Right Column: ATC Agencies Reference Table & Phonetic Alphabet Cheat Sheet */}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-sky-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Resumo Fonético do Seu Voo Atual
                </h3>
              </div>
              <div className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs">
                <div>
                  <span className="text-[10px] uppercase text-slate-400">Callsign Completo (Fonético):</span>
                  <div className="font-mono font-bold text-sky-600 dark:text-sky-400">
                    {callsignPhonetic}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-400">Callsign Abreviado (Fonético):</span>
                  <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {shortCallsignPhonetic}
                  </div>
                </div>
                <div className="border-t border-slate-200/70 dark:border-slate-700/60 pt-2">
                  <span className="text-[10px] uppercase text-slate-400">Altitude / Nível (Fonético):</span>
                  <div className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {altPhoneticDigits}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200/70 dark:border-slate-700/60 pt-2">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400">Origem (Fonia):</span>
                    <div className="font-semibold">{originSpokenName}</div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400">Destino (Fonia):</span>
                    <div className="font-semibold">{destSpokenName}</div>
                  </div>
                </div>
                <div className="border-t border-slate-200/70 dark:border-slate-700/60 pt-2">
                  <span className="text-[10px] uppercase text-slate-400">
                    Alternado (Soletrado Letra a Letra):
                  </span>
                  <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {altSpelledPhonetic}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Órgãos ATC &amp; Responsabilidades
                </h3>
              </div>
              <div className="space-y-3">
                {ATC_AGENCIES.map((agency) => (
                  <div
                    key={agency.code}
                    className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {agency.name}
                      </span>
                      <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                        {agency.code}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {agency.responsibility}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="h-4 w-4 shrink-0" />
                  <span>Coordenação Top-Down</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  Na ausência de um órgão local ativo, o órgão imediatamente superior assume suas atribuições (Torre assume Solo; Controle assume Torre/Solo; Centro assume Controle/Torre). Sem nenhum ATC ativo na área, reporte intenções na frequência livre / UNICOM ({freqUnicom}).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
