import type {
  Aerodrome,
  ComputedRouteLeg,
  FlightPeriod,
  FlightRule,
  FuelUnit,
  PropulsionType,
  RouteLeg,
} from '../types/aviation';

/**
 * Speed of Sound table from hidden sheet `TB_Mach`
 * B6:G10:
 *  0 to 0 ft -> 662 kt
 *  <= 14999 ft -> 650 kt
 *  15000 to 29999 ft -> 627 kt
 *  30000 to 39999 ft -> 602 kt
 *  >= 40000 ft -> 574 kt
 */
export function getSpeedOfSoundKts(altitudeFeet: number): number {
  if (altitudeFeet <= 14999) return 650;
  if (altitudeFeet <= 29999) return 627;
  if (altitudeFeet <= 39999) return 602;
  return 574;
}

/**
 * Parses an altitude input such as:
 * - "A035" -> 3500 ft
 * - "FL055" or "F055" -> 5500 ft
 * - "3200" or "5000" -> 3200 ft or 5000 ft
 * - "055" -> 5500 ft if <= 600, or raw feet if > 600
 */
export function parseAltitudeFeet(input: string): number | null {
  if (!input || !input.trim()) return null;
  const cleaned = input.trim().toUpperCase();
  const flMatch = cleaned.match(/^(?:FL|F|A)(\d{2,3})$/);
  if (flMatch) {
    return parseInt(flMatch[1], 10) * 100;
  }
  const num = Number(cleaned.replace(',', '.'));
  if (Number.isNaN(num) || num <= 0) return null;
  // If user typed flight level like 55 or 100 (<= 610), treat as FL * 100; if >= 700, treat as feet
  if (num <= 610) {
    return num * 100;
  }
  return num;
}

/**
 * Formats an altitude in feet into standard DECEA Axxx / FLxxx notation
 * given the origin Transition Altitude (TA).
 */
export function formatAltitudeOrFlightLevel(
  altitudeFeet: number | null,
  transitionAltitudeFt: number | ''
): { prefix: 'A' | 'F' | ''; code: string } {
  if (altitudeFeet === null || altitudeFeet <= 0) return { prefix: '', code: '' };
  const hundreds = Math.round(altitudeFeet / 100);
  const padded = String(hundreds).padStart(3, '0');
  const ta = typeof transitionAltitudeFt === 'number' && transitionAltitudeFt > 0 ? transitionAltitudeFt : 6000;
  if (altitudeFeet <= ta) {
    return { prefix: 'A', code: `A${padded}` };
  }
  return { prefix: 'F', code: `FL${padded}` };
}

/**
 * Semicircular rule (`Regra do PI`):
 * 180° to 359° -> PAR
 * 0° to 179° -> ÍMPAR
 */
export function getSemicircularRule(magneticCourse: number | ''): 'PAR' | 'ÍMPAR' | '' {
  if (magneticCourse === '' || Number.isNaN(Number(magneticCourse))) return '';
  const crs = ((Number(magneticCourse) % 360) + 360) % 360;
  return crs >= 180 && crs <= 359 ? 'PAR' : 'ÍMPAR';
}

/**
 * Valid standard altitudes/flight levels from hidden sheet `Altitude`
 */
const VFR_ODD_FEET = [1500, 3500, 5500, 7500, 9500, 11500, 13500];
const VFR_EVEN_FEET = [2500, 4500, 6500, 8500, 10500, 12500, 14500];
const IFR_EVEN_FEET = [
  2000, 4000, 6000, 8000, 10000, 12000, 14000, 16000, 18000, 20000,
  22000, 24000, 26000, 28000, 30000, 32000, 34000, 36000, 38000, 40000,
  43000, 47000, 51000, 55000, 59000,
];
const IFR_ODD_FEET = [
  3000, 5000, 7000, 9000, 11000, 13000, 15000, 17000, 19000, 21000,
  23000, 25000, 27000, 29000, 31000, 33000, 35000, 37000, 39000, 41000,
  45000, 49000, 53000, 57000, 61000,
];

export function evaluateAltitudeStatus(
  altitudeFeet: number | null,
  semicircularRule: 'PAR' | 'ÍMPAR' | '',
  flightRule: FlightRule,
  isReaCorridor: boolean,
  originTaFt: number | '',
  waypoint: string
): 'OK' | 'NOK' | 'REA/H' | 'TA?' | '' {
  if (!waypoint || altitudeFeet === null || !semicircularRule) return '';
  if (originTaFt === '' || Number(originTaFt) <= 0) return 'TA?';
  if (isReaCorridor) return 'REA/H';

  if (flightRule === 'IFR') {
    const allowed = semicircularRule === 'PAR' ? IFR_EVEN_FEET : IFR_ODD_FEET;
    return allowed.includes(altitudeFeet) ? 'OK' : 'NOK';
  } else {
    const allowed = semicircularRule === 'PAR' ? VFR_EVEN_FEET : VFR_ODD_FEET;
    return allowed.includes(altitudeFeet) ? 'OK' : 'NOK';
  }
}

/**
 * Formats seconds or fraction of day into hh:mm:ss
 */
export function formatDurationHhMmSs(totalSeconds: number | null): string {
  if (totalSeconds === null || !Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return '00:00:00';
  }
  const rounded = Math.round(totalSeconds);
  const hrs = Math.floor(rounded / 3600);
  const mins = Math.floor((rounded % 3600) / 60);
  const secs = rounded % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parses departure time in '1108' or '11:08' format into seconds since midnight
 */
export function parseDepartureTimeSeconds(depStr: string): number | null {
  if (!depStr || !depStr.trim()) return null;
  const clean = depStr.trim().replace(':', '');
  if (!/^\d{3,4}$/.test(clean)) return null;
  const padded = clean.padStart(4, '0');
  const hh = parseInt(padded.slice(0, 2), 10);
  const mm = parseInt(padded.slice(2, 4), 10);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 3600 + mm * 60;
}

/**
 * Converts fuel volume in Liters to selected unit (from GP!R30 formula):
 * - Litros (L): liters
 * - Kilogramas (kg): liters * 0.71
 * - Pounds (lbs): liters * 0.71 * 2.20462262
 * - Galão (Gal): liters * 0.264172052
 */
export function convertFuelFromLiters(liters: number, unit: FuelUnit): number {
  switch (unit) {
    case 'Litros (L)':
      return liters;
    case 'Kilogramas (kg)':
      return liters * 0.71;
    case 'Pounds (lbs)':
      return liters * 0.71 * 2.20462262;
    case 'Galão (Gal)':
      return liters * 0.264172052;
  }
}

/**
 * Computes all navigation columns for a route leg
 */
export function computeRouteLeg(
  leg: RouteLeg,
  prevEtoSeconds: number | null,
  departureSeconds: number | null,
  fuelConsumptionLph: number,
  fuelUnit: FuelUnit,
  flightRule: FlightRule,
  originTaFt: number | '',
  segmentType: 'AB' | 'BC'
): ComputedRouteLeg {
  const altitudeFeet = parseAltitudeFeet(leg.altitudeInput);
  const { prefix: flightLevelPrefix } = formatAltitudeOrFlightLevel(altitudeFeet, originTaFt);
  const speedOfSoundKts = altitudeFeet !== null ? getSpeedOfSoundKts(altitudeFeet) : null;

  const ias = leg.iasKts !== '' && Number(leg.iasKts) > 0 ? Number(leg.iasKts) : null;
  const mach = ias !== null && speedOfSoundKts !== null ? ias / speedOfSoundKts : null;

  const semicircularRule = getSemicircularRule(leg.magneticCourse);

  // VA / TAS: ((IAS * 0.02) * (AltFt / 1000)) + IAS
  const tasKts =
    ias !== null && altitudeFeet !== null
      ? ias * 0.02 * (altitudeFeet / 1000) + ias
      : null;

  const hasCourse = leg.magneticCourse !== '' && !Number.isNaN(Number(leg.magneticCourse));
  const hasWindDir = leg.windDirection !== '' && !Number.isNaN(Number(leg.windDirection));
  const hasWindSpd = leg.windSpeedKts !== '' && !Number.isNaN(Number(leg.windSpeedKts));

  let magneticHeading: number | null = null;
  let groundSpeedKts: number | null = null;

  if (tasKts !== null && tasKts > 0 && hasCourse) {
    const courseDeg = Number(leg.magneticCourse);
    const windDirDeg = hasWindDir ? Number(leg.windDirection) : 0;
    const windSpd = hasWindSpd ? Number(leg.windSpeedKts) : 0;

    // Exact Wind Triangle trigonometry from GP!N30 and GP!BE30:BH30
    const crsRad = (Math.PI / 180) * courseDeg;
    const wdRad = (Math.PI / 180) * windDirDeg;
    const swc = (windSpd / tasKts) * Math.sin(wdRad - crsRad);

    if (Math.abs(swc) <= 1) {
      groundSpeedKts = tasKts * Math.sqrt(1 - swc * swc) - windSpd * Math.cos(wdRad - crsRad);
    }

    // Proa Magnética (GP!N30)
    const wcaDeg =
      (Math.atan((Math.sin(((courseDeg + 180 - windDirDeg) * Math.PI) / 180) * windSpd) / tasKts) *
        180) /
      Math.PI;
    let hdg = courseDeg + wcaDeg;
    if (hdg < 0) hdg += 360;
    if (hdg >= 360) hdg = hdg % 360;
    magneticHeading = hdg;
  }

  const groundSpeedKnotsPerMin = groundSpeedKts !== null && groundSpeedKts > 0 ? groundSpeedKts / 60 : null;
  const dist = leg.distanceNm !== '' && Number(leg.distanceNm) > 0 ? Number(leg.distanceNm) : null;

  const durationMinutes =
    dist !== null && groundSpeedKnotsPerMin !== null && groundSpeedKnotsPerMin > 0
      ? dist / groundSpeedKnotsPerMin
      : null;

  const durationSeconds = durationMinutes !== null ? durationMinutes * 60 : null;
  const durationDays = durationSeconds !== null ? durationSeconds / 86400 : null;
  const durationFormatted = durationSeconds !== null ? formatDurationHhMmSs(durationSeconds) : '00:00:00';

  let currentEtoSeconds: number | null = null;
  if (durationSeconds !== null) {
    if (prevEtoSeconds !== null) {
      currentEtoSeconds = prevEtoSeconds + durationSeconds;
    } else if (departureSeconds !== null) {
      currentEtoSeconds = departureSeconds + durationSeconds;
    } else {
      currentEtoSeconds = durationSeconds;
    }
  }

  const etoFormatted =
    currentEtoSeconds !== null ? formatDurationHhMmSs(currentEtoSeconds % 86400) : '00:00:00';

  const litersUsed =
    durationMinutes !== null && fuelConsumptionLph > 0
      ? (durationMinutes * fuelConsumptionLph) / 60
      : null;

  const fuelRequired = litersUsed !== null ? convertFuelFromLiters(litersUsed, fuelUnit) : null;

  const altitudeStatus = evaluateAltitudeStatus(
    altitudeFeet,
    semicircularRule,
    flightRule,
    leg.isReaCorridor,
    originTaFt,
    leg.waypoint
  );

  return {
    ...leg,
    altitudeFeet,
    flightLevelPrefix,
    speedOfSoundKts,
    mach,
    semicircularRule,
    tasKts,
    magneticHeading,
    groundSpeedKts,
    groundSpeedKnotsPerMin,
    durationDays,
    durationMinutes,
    durationFormatted,
    etoFormatted,
    fuelRequired,
    altitudeStatus,
    segmentType,
  };
}

/**
 * Total endurance and fuel with regulatory reserve & ground contingency (GP!P47 & R47):
 * - VFR Diurno: + 30 min (1800s)
 * - VFR Noturno or IFR: + 45 min (2700s)
 * - Contingency = Sim:
 *   In GP!P47:
 *   VFR + Sim -> (P46 + reserve) * 1.1
 *   IFR + Sim -> P46 + (reserve * 1.1) [or (P46 + reserve)*1.1]
 */
export function computeTotalsAndFuelReserve(
  legsAB: ComputedRouteLeg[],
  legBC: ComputedRouteLeg,
  flightRule: FlightRule,
  flightPeriod: FlightPeriod,
  groundContingency: boolean
) {
  const distanceAB = legsAB.reduce((acc, l) => acc + (Number(l.distanceNm) || 0), 0);
  const durationSecondsAB = legsAB.reduce(
    (acc, l) => acc + (l.durationMinutes !== null ? l.durationMinutes * 60 : 0),
    0
  );
  const fuelAB = legsAB.reduce((acc, l) => acc + (l.fuelRequired ?? 0), 0);

  const distanceBC = Number(legBC.distanceNm) || 0;
  const durationSecondsBC = legBC.durationMinutes !== null ? legBC.durationMinutes * 60 : 0;
  const fuelBC = legBC.fuelRequired ?? 0;

  const distanceABC = distanceAB + distanceBC;
  const durationSecondsABC = durationSecondsAB + durationSecondsBC;
  const fuelABC = fuelAB + fuelBC;

  // Regulatory reserve in seconds (30 min = 1800s for VFR Diurno, 45 min = 2700s for Noturno/IFR)
  const reserveSeconds = flightRule === 'VFR' && flightPeriod === 'Diurno' ? 1800 : 2700;

  let totalEnduranceSeconds = 0;
  if (durationSecondsABC > 0) {
    if (flightRule === 'VFR') {
      const baseWithReserve = durationSecondsABC + reserveSeconds;
      totalEnduranceSeconds = groundContingency ? baseWithReserve * 1.1 : baseWithReserve;
    } else {
      // IFR formula from GP!P47:
      totalEnduranceSeconds = groundContingency
        ? durationSecondsABC + reserveSeconds * 1.1
        : durationSecondsABC + reserveSeconds;
    }
  }

  const totalFuelWithReserve =
    durationSecondsABC > 0 && fuelABC > 0
      ? (totalEnduranceSeconds * fuelABC) / durationSecondsABC
      : 0;

  const fuelPerWing = totalFuelWithReserve / 2;

  return {
    distanceAB,
    durationSecondsAB,
    durationFormattedAB: formatDurationHhMmSs(durationSecondsAB),
    fuelAB,
    distanceBC,
    durationSecondsBC,
    durationFormattedBC: formatDurationHhMmSs(durationSecondsBC),
    fuelBC,
    distanceABC,
    durationSecondsABC,
    durationFormattedABC: formatDurationHhMmSs(durationSecondsABC),
    fuelABC,
    totalEnduranceSeconds,
    totalEnduranceFormatted: formatDurationHhMmSs(totalEnduranceSeconds),
    totalFuelWithReserve,
    fuelPerWing,
  };
}

/**
 * Builds the standard ATC route string (e.g. "DCT PORTÃO PENTEADO DCT PERUS ... DCT")
 */
export function buildAtcRouteString(legs: RouteLeg[], destinationIcao: string, alternateIcao: string): string {
  const dest = destinationIcao.trim().toUpperCase();
  const alt = alternateIcao.trim().toUpperCase();
  const waypoints = legs
    .map((l) => l.waypoint.trim().toUpperCase())
    .filter((wp) => wp && wp !== dest && wp !== alt);

  if (waypoints.length === 0) return 'DCT';
  return `DCT ${waypoints.join(' DCT ')} DCT`;
}

/**
 * Builds the Item 18 Remark string (GP!C52)
 */
export function buildRemarkString(
  operatorName: string,
  performanceCategory: string,
  callsign: string,
  originIcao: string
): string {
  const opr = (operatorName || 'GOLD VIRTUAL AIRLINES').trim().toUpperCase();
  const per = (performanceCategory || 'A').trim().toUpperCase();
  const cs = (callsign || 'GLD0000').trim().toUpperCase();
  const orig = (originIcao || 'ZZZZ').trim().toUpperCase();
  return `OPR/${opr} /PER ${per} /RMK PIC ${cs} /FROM ${orig}`;
}

/**
 * Computes Traffic Pattern Altitude (Circuito de Tráfego - CT) from GP!D64:D66:
 * - If IFR -> "N/A"
 * - If VAC chart is checked -> uses VAC altitude override (or standard if not yet filled)
 * - If Standard (Padrão):
 *   - Helicópteros: Elevation + 500 ft
 *   - Aviões hélice: Elevation + 1000 ft
 *   - Aviões jato: Elevation + 1500 ft
 */
export function computeTrafficPatternAltitude(
  flightRule: FlightRule,
  hasVacChart: boolean,
  elevationFeet: number | null,
  propulsionType: PropulsionType,
  vacOverrideFt: number | ''
): { typeLabel: 'N/A' | 'VAC' | 'Padrão'; standardFt: number | null; effectiveFt: number | null } {
  if (flightRule === 'IFR') {
    return { typeLabel: 'N/A', standardFt: null, effectiveFt: null };
  }
  const typeLabel = hasVacChart ? 'VAC' : 'Padrão';
  let addFt = 1000;
  if (propulsionType === 'Helicópteros') addFt = 500;
  else if (propulsionType === 'Aviões jato') addFt = 1500;

  const standardFt = elevationFeet !== null ? Math.round(elevationFeet + addFt) : null;
  const effectiveFt =
    hasVacChart && vacOverrideFt !== '' && Number(vacOverrideFt) > 0
      ? Number(vacOverrideFt)
      : standardFt;

  return { typeLabel, standardFt, effectiveFt };
}

/**
 * Computes Ideal Top of Descent (TOD) to Traffic Pattern (GP!K59:K62)
 */
export function computeTopOfDescent(
  cruiseAltitudeFt: number | '',
  trafficPatternAltitudeFt: number | null,
  verticalSpeedFpm: number | '',
  descentGroundSpeedKts: number | ''
): {
  altitudeToLoseFt: number | null;
  todTimeSeconds: number | null;
  todTimeFormatted: string;
  todDistanceNm: number | null;
} {
  if (
    cruiseAltitudeFt === '' ||
    trafficPatternAltitudeFt === null ||
    Number(cruiseAltitudeFt) <= trafficPatternAltitudeFt
  ) {
    return {
      altitudeToLoseFt: null,
      todTimeSeconds: null,
      todTimeFormatted: '00:00:00',
      todDistanceNm: null,
    };
  }
  const altitudeToLoseFt = Number(cruiseAltitudeFt) - trafficPatternAltitudeFt;
  if (verticalSpeedFpm === '' || Number(verticalSpeedFpm) <= 0) {
    return {
      altitudeToLoseFt,
      todTimeSeconds: null,
      todTimeFormatted: '00:00:00',
      todDistanceNm: null,
    };
  }
  const minutes = altitudeToLoseFt / Number(verticalSpeedFpm);
  const todTimeSeconds = minutes * 60;
  const todDistanceNm =
    descentGroundSpeedKts !== '' && Number(descentGroundSpeedKts) > 0
      ? (Number(descentGroundSpeedKts) * minutes) / 60
      : null;

  return {
    altitudeToLoseFt,
    todTimeSeconds,
    todTimeFormatted: formatDurationHhMmSs(todTimeSeconds),
    todDistanceNm,
  };
}

/**
 * Computes Active Runway (`Pista em Uso`) replacing the 44 rows of nested IFs in GP!H82:M130
 * with clean angular difference math while reproducing 100% of the spreadsheet results.
 */
export function computeActiveRunway(
  runway1: string,
  runway2: string,
  metarWindDirection: number | '',
  magneticDeclination: number | ''
): {
  magneticWindDeg: number | null;
  diffRwy1Deg: number | null;
  diffRwy2Deg: number | null;
  activeRunway: string;
} {
  const r1Num = parseInt(runway1, 10);
  const r2Num = parseInt(runway2, 10);
  if (Number.isNaN(r1Num) || Number.isNaN(r2Num) || r1Num <= 0 || r2Num <= 0) {
    return { magneticWindDeg: null, diffRwy1Deg: null, diffRwy2Deg: null, activeRunway: '' };
  }
  if (metarWindDirection === '' || Number.isNaN(Number(metarWindDirection))) {
    return { magneticWindDeg: null, diffRwy1Deg: null, diffRwy2Deg: null, activeRunway: '' };
  }

  const decl = magneticDeclination !== '' && !Number.isNaN(Number(magneticDeclination)) ? Number(magneticDeclination) : 0;
  // Note: In GP!I83, magneticWind = (windMetar + decl) mod 360
  const magneticWindDeg = (((Number(metarWindDirection) + decl) % 360) + 360) % 360;

  const r1Hdg = (r1Num * 10) % 360;
  const r2Hdg = (r2Num * 10) % 360;

  const angularDiff = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return d > 180 ? 360 - d : d;
  };

  const diffRwy1Deg = angularDiff(magneticWindDeg, r1Hdg);
  const diffRwy2Deg = angularDiff(magneticWindDeg, r2Hdg);

  const r1Label = String(r1Num).padStart(2, '0');
  const r2Label = String(r2Num).padStart(2, '0');

  if (Math.abs(diffRwy1Deg - diffRwy2Deg) < 0.01) {
    return {
      magneticWindDeg,
      diffRwy1Deg,
      diffRwy2Deg,
      activeRunway: `${r1Label} ou ${r2Label} - Vento Través`,
    };
  }

  return {
    magneticWindDeg,
    diffRwy1Deg,
    diffRwy2Deg,
    activeRunway: diffRwy1Deg < diffRwy2Deg ? r1Label : r2Label,
  };
}

/**
 * Computes Transition Level (`Nível de Transição - TL`) from hidden sheet `TB_TL`
 * Crosses QNH (hPa) and Transition Altitude (TA in feet: 2000..7000).
 */
const TL_TABLE: Array<{ qnhMin: number; qnhMax: number; offsets: Record<number, string> }> = [
  {
    qnhMin: 942.2,
    qnhMax: 959.4,
    offsets: { 2000: 'FL45', 3000: 'FL55', 4000: 'FL65', 5000: 'FL75', 6000: 'FL85', 7000: 'FL95' },
  },
  {
    qnhMin: 959.5,
    qnhMax: 977.1,
    offsets: { 2000: 'FL40', 3000: 'FL50', 4000: 'FL60', 5000: 'FL70', 6000: 'FL80', 7000: 'FL90' },
  },
  {
    qnhMin: 977.2,
    qnhMax: 995.0,
    offsets: { 2000: 'FL35', 3000: 'FL45', 4000: 'FL55', 5000: 'FL65', 6000: 'FL75', 7000: 'FL85' },
  },
  {
    qnhMin: 995.1,
    qnhMax: 1013.2,
    offsets: { 2000: 'FL30', 3000: 'FL40', 4000: 'FL50', 5000: 'FL60', 6000: 'FL70', 7000: 'FL80' },
  },
  {
    qnhMin: 1013.3,
    qnhMax: 1031.6,
    offsets: { 2000: 'FL25', 3000: 'FL35', 4000: 'FL45', 5000: 'FL55', 6000: 'FL65', 7000: 'FL75' },
  },
  {
    qnhMin: 1031.7,
    qnhMax: 1050.3,
    offsets: { 2000: 'FL20', 3000: 'FL30', 4000: 'FL40', 5000: 'FL50', 6000: 'FL60', 7000: 'FL70' },
  },
];

export function computeTransitionLevel(
  qnhHpa: number | '',
  transitionAltitudeFt: number | ''
): string {
  if (qnhHpa === '' || transitionAltitudeFt === '') return '—';
  const qnh = Number(qnhHpa);
  const ta = Number(transitionAltitudeFt);
  if (Number.isNaN(qnh) || Number.isNaN(ta) || qnh <= 0 || ta <= 0) return '—';
  if (ta > 7000) return 'ATC';

  const row = TL_TABLE.find((r) => qnh >= r.qnhMin && qnh <= r.qnhMax);
  if (!row) return '—';
  return row.offsets[ta] || '—';
}

/**
 * Altimeter conversions from GP!S59 & GP!S62
 */
export function convertHpaToInHg(hpa: number | ''): number | null {
  if (hpa === '' || Number.isNaN(Number(hpa)) || Number(hpa) <= 0) return null;
  return Number(hpa) / 33.864;
}

export function convertPolInputToHpa(polInput: number | ''): number | null {
  if (polInput === '' || Number.isNaN(Number(polInput)) || Number(polInput) <= 0) return null;
  const val = Number(polInput);
  // Support both 2991 (4 digits) and 29.91 (decimal)
  const normalizedPol = val > 100 ? val : val * 100;
  return normalizedPol * 0.33864;
}

/**
 * DME Arc Entry Lead Distance from GP!U70: `=((Speed - 40) / 100) + Radius`
 */
export function computeDmeArcLeadDistanceNm(
  entrySpeedKts: number | '',
  arcRadiusNm: number | ''
): number | null {
  if (entrySpeedKts === '' || arcRadiusNm === '') return null;
  const spd = Number(entrySpeedKts);
  const rad = Number(arcRadiusNm);
  if (Number.isNaN(spd) || Number.isNaN(rad) || spd <= 0 || rad <= 0) return null;
  return (spd - 40) / 100 + rad;
}

/**
 * Parses a raw METAR string to extract wind direction (deg), wind speed (kt), and QNH (hPa)
 */
export function parseMetarString(metar: string): {
  windDirection: number | null;
  windSpeedKts: number | null;
  qnhHpa: number | null;
} {
  if (!metar || !metar.trim()) {
    return { windDirection: null, windSpeedKts: null, qnhHpa: null };
  }
  const text = metar.toUpperCase();

  let windDirection: number | null = null;
  let windSpeedKts: number | null = null;
  const windMatch = text.match(/\b(\d{3}|VRB)(\d{2,3})(?:G\d{2,3})?(?:KT|MPS)\b/);
  if (windMatch) {
    if (windMatch[1] !== 'VRB') {
      windDirection = parseInt(windMatch[1], 10);
    }
    windSpeedKts = parseInt(windMatch[2], 10);
  }

  let qnhHpa: number | null = null;
  const qnhMatch = text.match(/\bQ(\d{4})\b/);
  if (qnhMatch) {
    qnhHpa = parseInt(qnhMatch[1], 10);
  } else {
    const altimMatch = text.match(/\bA(\d{4})\b/);
    if (altimMatch) {
      qnhHpa = Math.round(parseInt(altimMatch[1], 10) * 0.3386389);
    }
  }

  return { windDirection, windSpeedKts, qnhHpa };
}

/**
 * Fetches live METAR & TAF for an ICAO code using AviationWeather API (via Vite/Netlify proxy or fallback)
 */
export async function fetchLiveMetarAndTaf(icao: string): Promise<{ metar: string; taf: string }> {
  const code = icao.trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(code)) {
    throw new Error('Código ICAO inválido.');
  }

  let metar = '';
  let taf = '';

  try {
    const [metarRes, tafRes] = await Promise.all([
      fetch(`/api/aviationweather/api/data/metar?ids=${code}&format=raw`),
      fetch(`/api/aviationweather/api/data/taf?ids=${code}&format=raw`),
    ]);

    if (metarRes.ok) {
      const mText = (await metarRes.text()).trim();
      if (mText && !mText.startsWith('<!')) {
        metar = mText.split('\n')[0].trim();
      }
    }
    if (tafRes.ok) {
      const tText = (await tafRes.text()).trim();
      if (tText && !tText.startsWith('<!')) {
        taf = tText.replace(/\s+/g, ' ').trim();
      }
    }
  } catch (err) {
    console.warn('Primary METAR fetch failed:', err);
  }

  return { metar, taf };
}

/**
 * Finds an aerodrome by ICAO from combined global + user lists
 */
export function findAerodromeByIcao(icao: string, aerodromes: Aerodrome[]): Aerodrome | undefined {
  if (!icao) return undefined;
  const clean = icao.trim().toUpperCase();
  return aerodromes.find((a) => a.icao.toUpperCase() === clean);
}
