import type {
  AltitudeUnitPref,
  DistanceUnitPref,
  FuelVolumeUnitPref,
  SpeedUnitPref,
  VerticalSpeedUnitPref,
  WeightUnitPref,
} from '../types/aviation';

const KG_TO_LBS = 2.20462262185;
const LITERS_TO_GAL = 1 / 3.785411784;
const KT_TO_KMH = 1.852;
const KT_TO_MPH = 1.15077945;
const FT_TO_M = 0.3048;
const NM_TO_KM = 1.852;
const FPM_TO_MPS = 0.00508;

function roundTo(val: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// --- Weight (internal: kg) ---
export function fromKg(
  kg: number | '' | null,
  unit: WeightUnitPref,
  decimals = 1
): number | '' {
  if (kg === '' || kg === null || Number.isNaN(Number(kg))) return '';
  const v = Number(kg);
  return unit === 'lbs' ? roundTo(v * KG_TO_LBS, decimals) : roundTo(v, decimals);
}

export function toKg(val: number | '', unit: WeightUnitPref): number {
  if (val === '' || Number.isNaN(Number(val))) return 0;
  const v = Number(val);
  return unit === 'lbs' ? Math.round((v / KG_TO_LBS) * 10) / 10 : v;
}

export function formatWeight(kg: number | null, unit: WeightUnitPref, decimals = 1): string {
  if (kg === null || Number.isNaN(kg)) return '—';
  const converted = unit === 'lbs' ? kg * KG_TO_LBS : kg;
  return `${converted.toFixed(decimals)} ${unit}`;
}

// --- Fuel Volume & Flow (internal: Liters / L/h) ---
export function fromLiters(
  liters: number | '' | null,
  unit: FuelVolumeUnitPref,
  decimals = 1
): number | '' {
  if (liters === '' || liters === null || Number.isNaN(Number(liters))) return '';
  const v = Number(liters);
  return unit === 'gal' ? roundTo(v * LITERS_TO_GAL, decimals) : roundTo(v, decimals);
}

export function toLiters(val: number | '', unit: FuelVolumeUnitPref): number {
  if (val === '' || Number.isNaN(Number(val))) return 0;
  const v = Number(val);
  return unit === 'gal' ? Math.round((v / LITERS_TO_GAL) * 10) / 10 : v;
}

export function formatFuelFlow(lph: number, unit: FuelVolumeUnitPref): string {
  if (lph <= 0) return 'N/A';
  if (unit === 'gal') {
    return `${(lph * LITERS_TO_GAL).toFixed(1)} gal/h`;
  }
  return `${lph} L/h`;
}

export function formatFuelCapacity(rawDisplay: string, unit: FuelVolumeUnitPref): string {
  const trimmed = (rawDisplay || '').trim();
  if (!trimmed) return '—';
  const match = trimmed.match(/[\d]+([.,]\d+)?/);
  if (!match) return trimmed;
  const liters = Number(match[0].replace(',', '.'));
  if (!Number.isFinite(liters) || liters <= 0) return trimmed;
  if (unit === 'gal') {
    return `${(liters * LITERS_TO_GAL).toFixed(1)} gal (${Math.round(liters)} L)`;
  }
  return /^[\d.,\s]+$/.test(trimmed) ? `${trimmed} litros` : trimmed;
}

// --- Speed (internal: knots kt) ---
export function fromKnots(
  kts: number | '' | null,
  unit: SpeedUnitPref,
  decimals = 0
): number | '' {
  if (kts === '' || kts === null || Number.isNaN(Number(kts))) return '';
  const v = Number(kts);
  if (unit === 'km/h' || unit === 'kmh') return roundTo(v * KT_TO_KMH, decimals);
  if (unit === 'mph') return roundTo(v * KT_TO_MPH, decimals);
  return roundTo(v, decimals);
}

export function toKnots(val: number | '', unit: SpeedUnitPref): number | '' {
  if (val === '' || Number.isNaN(Number(val))) return '';
  const v = Number(val);
  if (unit === 'km/h' || unit === 'kmh') return Math.round((v / KT_TO_KMH) * 10) / 10;
  if (unit === 'mph') return Math.round((v / KT_TO_MPH) * 10) / 10;
  return v;
}

export function speedUnitLabel(unit: SpeedUnitPref): string {
  if (unit === 'km/h' || unit === 'kmh') return 'km/h';
  if (unit === 'mph') return 'mph';
  return 'kts';
}

// --- Altitude & Elevation (internal: feet ft) ---
export function fromFeet(
  ft: number | '' | null,
  unit: AltitudeUnitPref,
  decimals = 0
): number | '' {
  if (ft === '' || ft === null || Number.isNaN(Number(ft))) return '';
  const v = Number(ft);
  return unit === 'm' ? roundTo(v * FT_TO_M, decimals) : roundTo(v, decimals);
}

export function toFeet(val: number | '', unit: AltitudeUnitPref): number | '' {
  if (val === '' || Number.isNaN(Number(val))) return '';
  const v = Number(val);
  return unit === 'm' ? Math.round(v / FT_TO_M) : v;
}

export function formatAltitudeValue(ft: number | null, unit: AltitudeUnitPref): string {
  if (ft === null || Number.isNaN(ft)) return '—';
  if (unit === 'm') {
    return `${Math.round(ft * FT_TO_M)} m (${Math.round(ft)} ft)`;
  }
  return `${Math.round(ft)} ft`;
}

// --- Distance (internal: Nautical Miles NM) ---
export function fromNm(
  nm: number | '' | null,
  unit: DistanceUnitPref,
  decimals = 1
): number | '' {
  if (nm === '' || nm === null || Number.isNaN(Number(nm))) return '';
  const v = Number(nm);
  return unit === 'km' ? roundTo(v * NM_TO_KM, decimals) : roundTo(v, decimals);
}

export function toNm(val: number | '', unit: DistanceUnitPref): number | '' {
  if (val === '' || Number.isNaN(Number(val))) return '';
  const v = Number(val);
  return unit === 'km' ? Math.round((v / NM_TO_KM) * 10) / 10 : v;
}

export function distanceUnitLabel(unit: DistanceUnitPref): string {
  return unit === 'km' ? 'km' : 'NM';
}

// --- Vertical Speed (internal: fpm) ---
export function fromFpm(
  fpm: number | '' | null,
  unit: VerticalSpeedUnitPref,
  decimals = 1
): number | '' {
  if (fpm === '' || fpm === null || Number.isNaN(Number(fpm))) return '';
  const v = Number(fpm);
  return unit === 'm/s' || unit === 'mps' ? roundTo(v * FPM_TO_MPS, decimals) : Math.round(v);
}

export function toFpm(val: number | '', unit: VerticalSpeedUnitPref): number | '' {
  if (val === '' || Number.isNaN(Number(val))) return '';
  const v = Number(val);
  return unit === 'm/s' || unit === 'mps' ? Math.round(v / FPM_TO_MPS) : v;
}

export function vsUnitLabel(unit: VerticalSpeedUnitPref): string {
  return unit === 'm/s' || unit === 'mps' ? 'm/s' : 'fpm';
}
