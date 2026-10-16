import React, { useState } from 'react';
import {
  CloudSun,
  RefreshCw,
  ExternalLink,
  Plane,
  Scale,
  Compass,
  Map,
  Plus,
  Trash2,
  Copy,
  Check,
  ArrowDownRight,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type {
  Aerodrome,
  AerodromePlanningConfig,
  BaseAircraft,
  ComputedRouteLeg,
  FlightPeriod,
  FlightPlan,
  FlightRule,
  FuelUnit,
  PropulsionType,
  RouteLeg,
  UserAircraftPrefix,
  UserPreferences,
} from '../types/aviation';
import { AerodromeAutocomplete } from './AerodromeAutocomplete';
import {
  buildAtcRouteString,
  buildRemarkString,
  computeActiveRunway,
  computeDmeArcLeadDistanceNm,
  computeTopOfDescent,
  computeTrafficPatternAltitude,
  computeTransitionLevel,
  convertHpaToInHg,
  convertPolInputToHpa,
  fetchLiveMetarAndTaf,
  parseMetarString,
} from '../utils/aviationMath';
import {
  distanceUnitLabel,
  formatFuelCapacity,
  formatFuelFlow,
  formatWeight,
  fromFeet,
  fromFpm,
  fromKg,
  fromKnots,
  fromNm,
  speedUnitLabel,
  toFeet,
  toFpm,
  toKg,
  toKnots,
  toNm,
  vsUnitLabel,
} from '../utils/unitConversions';

interface FlightPlannerTabProps {
  plan: FlightPlan;
  onUpdatePlan: (updater: (prev: FlightPlan) => FlightPlan) => void;
  onResetPlan: () => void;
  userPrefs: UserPreferences;
  aerodromes: Aerodrome[];
  baseAircraftList: BaseAircraft[];
  userFleet: UserAircraftPrefix[];
  originAerodrome?: Aerodrome;
  destinationAerodrome?: Aerodrome;
  alternateAerodrome?: Aerodrome;
  activeAircraft: {
    name: string;
    typeIcaoWake: string;
    performanceCategory: string;
    fuelConsumptionLph: number;
    fuelCapacityDisplay: string;
    emptyWeightKg: number;
    propulsionType: PropulsionType;
    defaultCruiseIasKts: number;
    defaultDescentIasKts: number;
    defaultDescentVsFpm: number;
    alternateSpeedKts: number;
    alternateFuelFlowLph: number;
    climbSpeedKts: number;
    climbVsFpm: number;
    climbFuelFlowLph: number;
    descentFuelFlowLph: number;
    fuelType: string;
    simulator: string;
    minRunwayLengthFt: number;
    runwaySurfaceType: string;
  };
  computedLegsAB: ComputedRouteLeg[];
  computedLegBC: ComputedRouteLeg;
  totals: ReturnType<typeof import('../utils/aviationMath').computeTotalsAndFuelReserve>;
  grossWeightKg: number | null;
}

const USEFUL_LINKS = [
  { label: 'Windy.com', url: 'https://www.windy.com/' },
  { label: 'AISWEB Cartas', url: 'https://aisweb.decea.mil.br/?i=cartas' },
  { label: 'Beyond EFB', url: 'https://web.beyond.aero/' },
  { label: 'REDEMET', url: 'https://redemet.decea.mil.br/' },
];

export const FlightPlannerTab: React.FC<FlightPlannerTabProps> = ({
  plan,
  onUpdatePlan,
  onResetPlan,
  userPrefs,
  aerodromes,
  baseAircraftList,
  userFleet,
  originAerodrome,
  destinationAerodrome,
  alternateAerodrome,
  activeAircraft,
  computedLegsAB,
  computedLegBC,
  totals,
  grossWeightKg,
}) => {
  const [loadingWeather, setLoadingWeather] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const applyMetarParsedValues = (
    target: 'origin' | 'destination' | 'alternate',
    metarText: string,
    tafText?: string
  ) => {
    onUpdatePlan((prev) => {
      const current = prev[target];
      const nextTaf = tafText !== undefined ? tafText : current.taf;
      const parsed = parseMetarString(metarText, nextTaf);
      return {
        ...prev,
        [target]: {
          ...current,
          metar: metarText,
          taf: nextTaf,
          metarWindDirection:
            parsed.windDirection !== null ? parsed.windDirection : current.metarWindDirection,
          metarWindSpeedKts:
            parsed.windSpeedKts !== null ? parsed.windSpeedKts : current.metarWindSpeedKts,
          qnhHpa: parsed.qnhHpa !== null ? parsed.qnhHpa : current.qnhHpa,
        },
      };
    });
  };

  const handleFetchWeatherFor = async (
    target: 'origin' | 'destination' | 'alternate',
    overrideIcao?: string
  ) => {
    const icao = (overrideIcao ?? plan[target].icao).trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(icao)) return;
    setLoadingWeather((prev) => ({ ...prev, [target]: true }));
    try {
      const { metar, taf } = await fetchLiveMetarAndTaf(icao);
      onUpdatePlan((prev) => {
        const current = prev[target];
        const nextMetar = metar || current.metar;
        const nextTaf = taf || current.taf;
        const parsed = parseMetarString(nextMetar, nextTaf);

        // Fallback to Origin or Alternate wind/QNH if this aerodrome has no METAR station (e.g. SDUB)
        const refWindDir =
          prev.origin.metarWindDirection !== ''
            ? prev.origin.metarWindDirection
            : prev.alternate.metarWindDirection !== ''
            ? prev.alternate.metarWindDirection
            : prev.destination.metarWindDirection;
        const refWindSpd =
          prev.origin.metarWindSpeedKts !== ''
            ? prev.origin.metarWindSpeedKts
            : prev.alternate.metarWindSpeedKts !== ''
            ? prev.alternate.metarWindSpeedKts
            : prev.destination.metarWindSpeedKts;
        const refQnh =
          prev.origin.qnhHpa !== ''
            ? prev.origin.qnhHpa
            : prev.alternate.qnhHpa !== ''
            ? prev.alternate.qnhHpa
            : prev.destination.qnhHpa;

        return {
          ...prev,
          [target]: {
            ...current,
            metar: nextMetar,
            taf: nextTaf,
            metarWindDirection:
              parsed.windDirection !== null
                ? parsed.windDirection
                : current.metarWindDirection !== ''
                ? current.metarWindDirection
                : refWindDir,
            metarWindSpeedKts:
              parsed.windSpeedKts !== null
                ? parsed.windSpeedKts
                : current.metarWindSpeedKts !== ''
                ? current.metarWindSpeedKts
                : refWindSpd,
            qnhHpa:
              parsed.qnhHpa !== null
                ? parsed.qnhHpa
                : current.qnhHpa !== ''
                ? current.qnhHpa
                : refQnh,
          },
        };
      });
    } finally {
      setLoadingWeather((prev) => ({ ...prev, [target]: false }));
    }
  };

  const handleFetchAllWeather = async () => {
    const targets = ['origin', 'destination', 'alternate'] as const;
    setLoadingWeather({ origin: true, destination: true, alternate: true });
    try {
      const results = await Promise.all(
        targets.map(async (t) => {
          const icao = plan[t].icao.trim().toUpperCase();
          if (!/^[A-Z0-9]{4}$/.test(icao)) return { metar: '', taf: '' };
          try {
            return await fetchLiveMetarAndTaf(icao);
          } catch {
            return { metar: '', taf: '' };
          }
        })
      );

      onUpdatePlan((prev) => {
        const nextOriginMetar = results[0].metar || prev.origin.metar;
        const nextOriginTaf = results[0].taf || prev.origin.taf;
        const pOrigin = parseMetarString(nextOriginMetar, nextOriginTaf);

        const nextDestMetar = results[1].metar || prev.destination.metar;
        const nextDestTaf = results[1].taf || prev.destination.taf;
        const pDest = parseMetarString(nextDestMetar, nextDestTaf);

        const nextAltMetar = results[2].metar || prev.alternate.metar;
        const nextAltTaf = results[2].taf || prev.alternate.taf;
        const pAlt = parseMetarString(nextAltMetar, nextAltTaf);

        const fallbackWindDir =
          pOrigin.windDirection ??
          pAlt.windDirection ??
          pDest.windDirection ??
          (prev.origin.metarWindDirection !== '' ? prev.origin.metarWindDirection : '') ??
          '';
        const fallbackWindSpd =
          pOrigin.windSpeedKts ??
          pAlt.windSpeedKts ??
          pDest.windSpeedKts ??
          (prev.origin.metarWindSpeedKts !== '' ? prev.origin.metarWindSpeedKts : '') ??
          '';
        const fallbackQnh =
          pOrigin.qnhHpa ??
          pAlt.qnhHpa ??
          pDest.qnhHpa ??
          (prev.origin.qnhHpa !== '' ? prev.origin.qnhHpa : '') ??
          '';

        return {
          ...prev,
          origin: {
            ...prev.origin,
            metar: nextOriginMetar,
            taf: nextOriginTaf,
            metarWindDirection: pOrigin.windDirection ?? fallbackWindDir,
            metarWindSpeedKts: pOrigin.windSpeedKts ?? fallbackWindSpd,
            qnhHpa: pOrigin.qnhHpa ?? fallbackQnh,
          },
          destination: {
            ...prev.destination,
            metar: nextDestMetar,
            taf: nextDestTaf,
            metarWindDirection: pDest.windDirection ?? fallbackWindDir,
            metarWindSpeedKts: pDest.windSpeedKts ?? fallbackWindSpd,
            qnhHpa: pDest.qnhHpa ?? fallbackQnh,
          },
          alternate: {
            ...prev.alternate,
            metar: nextAltMetar,
            taf: nextAltTaf,
            metarWindDirection: pAlt.windDirection ?? fallbackWindDir,
            metarWindSpeedKts: pAlt.windSpeedKts ?? fallbackWindSpd,
            qnhHpa: pAlt.qnhHpa ?? fallbackQnh,
          },
        };
      });
    } finally {
      setLoadingWeather({ origin: false, destination: false, alternate: false });
    }
  };

  const handleAerodromeChange = (
    target: 'origin' | 'destination' | 'alternate',
    icao: string
  ) => {
    const cleanIcao = icao.trim().toUpperCase();
    onUpdatePlan((prev) => {
      const isDifferentIcao = prev[target].icao.trim().toUpperCase() !== cleanIcao;
      const updated = {
        ...prev,
        [target]: {
          ...prev[target],
          icao,
          ...(isDifferentIcao
            ? {
                metar: '',
                taf: '',
                metarWindDirection: '' as const,
                metarWindSpeedKts: '' as const,
                qnhHpa: '' as const,
              }
            : {}),
        },
      };
      if (target === 'origin' && updated.legs.length > 0) {
        const firstLeg = { ...updated.legs[0], origin: icao };
        updated.legs = [firstLeg, ...updated.legs.slice(1)];
      }
      if (target === 'destination') {
        updated.alternateLeg = { ...updated.alternateLeg, origin: icao };
      }
      if (target === 'alternate') {
        updated.alternateLeg = { ...updated.alternateLeg, waypoint: icao };
      }
      return updated;
    });

    if (/^[A-Z0-9]{4}$/.test(cleanIcao)) {
      void handleFetchWeatherFor(target, cleanIcao);
    }
  };

  const handleAircraftSelectionChange = (val: string) => {
    if (val.startsWith('prefix:')) {
      const prefixId = val.replace('prefix:', '');
      const found = userFleet.find((p) => p.id === prefixId);
      const newCruiseIas = found?.defaultCruiseIasKts || 110;
      const newAltIas = found?.alternateSpeedKts || found?.defaultDescentIasKts || newCruiseIas;
      onUpdatePlan((prev) => ({
        ...prev,
        selectedAircraftSource: 'prefix',
        selectedPrefixId: prefixId,
        operatorRemark: found?.operatorName || prev.operatorRemark,
        legs: prev.legs.map((l) => ({
          ...l,
          iasKts:
            l.iasKts === '' || l.iasKts === activeAircraft.defaultCruiseIasKts
              ? newCruiseIas
              : l.iasKts,
        })),
        alternateLeg: {
          ...prev.alternateLeg,
          iasKts: newAltIas,
        },
        descentSpeedKts: '',
        descentVerticalSpeedFpm: '',
        alternateDescentSpeedKts: '',
        alternateDescentVerticalSpeedFpm: '',
        dmeArcEntrySpeedKts: '',
      }));
    } else {
      const baseId = val.replace('base:', '');
      const found = baseAircraftList.find((b) => b.id === baseId);
      const newCruiseIas = found?.defaultCruiseIasKts || 110;
      const newAltIas = found?.alternateSpeedKts || found?.defaultDescentIasKts || newCruiseIas;
      onUpdatePlan((prev) => ({
        ...prev,
        selectedAircraftSource: 'base',
        selectedBaseAircraftId: baseId,
        legs: prev.legs.map((l) => ({
          ...l,
          iasKts:
            l.iasKts === '' || l.iasKts === activeAircraft.defaultCruiseIasKts
              ? newCruiseIas
              : l.iasKts,
        })),
        alternateLeg: {
          ...prev.alternateLeg,
          iasKts: newAltIas,
        },
        descentSpeedKts: '',
        descentVerticalSpeedFpm: '',
        alternateDescentSpeedKts: '',
        alternateDescentVerticalSpeedFpm: '',
        dmeArcEntrySpeedKts: '',
      }));
    }
  };

  const updateLeg = (index: number, patch: Partial<RouteLeg>) => {
    onUpdatePlan((prev) => {
      const nextLegs = prev.legs.map((l, idx) => (idx === index ? { ...l, ...patch } : { ...l }));
      // Auto-chain origin of next leg when waypoint is edited
      if (patch.waypoint !== undefined && index + 1 < nextLegs.length) {
        const wp = patch.waypoint.trim().toUpperCase();
        if (wp && wp !== prev.destination.icao.toUpperCase()) {
          nextLegs[index + 1] = { ...nextLegs[index + 1], origin: wp };
        }
      }
      return { ...prev, legs: nextLegs };
    });
  };

  const addLeg = () => {
    onUpdatePlan((prev) => {
      const lastLeg = prev.legs[prev.legs.length - 1];
      const nextOrigin =
        lastLeg && lastLeg.waypoint && lastLeg.waypoint !== prev.destination.icao
          ? lastLeg.waypoint
          : prev.origin.icao;
      const newLeg: RouteLeg = {
        id: `leg-${Date.now()}`,
        origin: nextOrigin,
        waypoint: '',
        distanceNm: '',
        magneticCourse: '',
        iasKts: lastLeg?.iasKts || activeAircraft.defaultCruiseIasKts,
        altitudeInput: lastLeg?.altitudeInput || '',
        isReaCorridor: lastLeg?.isReaCorridor ?? false,
        windDirection: lastLeg?.windDirection ?? '',
        windSpeedKts: lastLeg?.windSpeedKts ?? '',
        notes: '',
      };
      return { ...prev, legs: [...prev.legs, newLeg] };
    });
  };

  const removeLeg = (index: number) => {
    onUpdatePlan((prev) => {
      if (prev.legs.length <= 1) return prev;
      const nextLegs = prev.legs.filter((_, i) => i !== index);
      if (nextLegs.length > 0) {
        nextLegs[0] = { ...nextLegs[0], origin: prev.origin.icao };
        for (let i = 1; i < nextLegs.length; i++) {
          if (nextLegs[i - 1].waypoint) {
            nextLegs[i] = { ...nextLegs[i], origin: nextLegs[i - 1].waypoint };
          }
        }
      }
      return { ...prev, legs: nextLegs };
    });
  };

  const closeRouteToDestination = () => {
    const destIcao = plan.destination.icao.trim().toUpperCase();
    if (!destIcao) return;

    onUpdatePlan((prev) => {
      const lastLeg = prev.legs[prev.legs.length - 1];
      if (!lastLeg) return prev;

      // If the last leg already ends at Destination, nothing to add
      if (lastLeg.waypoint.trim().toUpperCase() === destIcao) {
        return prev;
      }

      // If the last leg's waypoint is still blank, set it directly to Destination
      if (!lastLeg.waypoint.trim()) {
        const nextLegs = prev.legs.map((l, idx) =>
          idx === prev.legs.length - 1 ? { ...l, waypoint: destIcao } : l
        );
        return { ...prev, legs: nextLegs };
      }

      // Otherwise, append the final leg from the last fix (e.g., ILHA ANCHIETA) to Destination (e.g., SDUB)
      const finalLeg: RouteLeg = {
        id: `leg-${Date.now()}`,
        origin: lastLeg.waypoint.trim().toUpperCase(),
        waypoint: destIcao,
        distanceNm: '',
        magneticCourse: '',
        iasKts: lastLeg.iasKts || activeAircraft.defaultCruiseIasKts,
        altitudeInput: lastLeg.altitudeInput || '',
        isReaCorridor: lastLeg.isReaCorridor ?? false,
        windDirection: lastLeg.windDirection ?? '',
        windSpeedKts: lastLeg.windSpeedKts ?? '',
        notes: 'Pouso no Destino',
      };
      return { ...prev, legs: [...prev.legs, finalLeg] };
    });
  };

  const copyWindToAllLegs = (windDirection: number | '', windSpeedKts: number | '') => {
    onUpdatePlan((prev) => ({
      ...prev,
      legs: prev.legs.map((l) => ({ ...l, windDirection, windSpeedKts })),
    }));
  };

  // --- Section 5 Chart Headers ---
  const chartHeaders =
    plan.flightRule === 'VFR'
      ? ['WAC', 'VAC', 'ADC', 'PDC', 'REA/H']
      : ['ERC', 'ADC', 'PDC', 'SID', 'STAR'];

  // --- Section 7 Automated Parameters from Aircraft Profile & Route ---
  const validRouteAltitudesFt = computedLegsAB
    .map((l) => l.altitudeFeet)
    .filter((ft): ft is number => ft !== null && ft > 0);

  const autoCruiseAltDestFt: number | '' =
    validRouteAltitudesFt.length > 0 ? Math.max(...validRouteAltitudesFt) : '';

  const autoCruiseAltAltFt: number | '' =
    computedLegBC.altitudeFeet && computedLegBC.altitudeFeet > 0
      ? computedLegBC.altitudeFeet
      : autoCruiseAltDestFt;

  const effectiveDescentCruiseAltDestFt: number | '' =
    plan.descentCruiseAltitudeFt !== '' ? plan.descentCruiseAltitudeFt : autoCruiseAltDestFt;

  const effectiveDescentCruiseAltAltFt: number | '' =
    plan.alternateDescentCruiseAltitudeFt !== ''
      ? plan.alternateDescentCruiseAltitudeFt
      : autoCruiseAltAltFt;

  const effectiveDescentVsDestFpm: number | '' =
    plan.descentVerticalSpeedFpm !== ''
      ? plan.descentVerticalSpeedFpm
      : activeAircraft.defaultDescentVsFpm;

  const effectiveDescentVsAltFpm: number | '' =
    plan.alternateDescentVerticalSpeedFpm !== ''
      ? plan.alternateDescentVerticalSpeedFpm
      : activeAircraft.defaultDescentVsFpm;

  const effectiveDescentSpeedDestKts: number | '' =
    plan.descentSpeedKts !== '' ? plan.descentSpeedKts : activeAircraft.defaultDescentIasKts;

  const effectiveDescentSpeedAltKts: number | '' =
    plan.alternateDescentSpeedKts !== ''
      ? plan.alternateDescentSpeedKts
      : activeAircraft.alternateSpeedKts;

  const effectiveDmeArcSpeedKts: number | '' =
    plan.dmeArcEntrySpeedKts !== ''
      ? plan.dmeArcEntrySpeedKts
      : activeAircraft.defaultDescentIasKts;

  // --- Section 7 Computations ---
  const ctOrigin = computeTrafficPatternAltitude(
    plan.flightRule,
    plan.origin.charts.col2,
    originAerodrome?.elevationFeet ?? null,
    activeAircraft.propulsionType,
    plan.origin.vacTrafficPatternAltitudeFt
  );
  const ctDest = computeTrafficPatternAltitude(
    plan.flightRule,
    plan.destination.charts.col2,
    destinationAerodrome?.elevationFeet ?? null,
    activeAircraft.propulsionType,
    plan.destination.vacTrafficPatternAltitudeFt
  );
  const ctAlt = computeTrafficPatternAltitude(
    plan.flightRule,
    plan.alternate.charts.col2,
    alternateAerodrome?.elevationFeet ?? null,
    activeAircraft.propulsionType,
    plan.alternate.vacTrafficPatternAltitudeFt
  );

  const todDest = computeTopOfDescent(
    effectiveDescentCruiseAltDestFt,
    ctDest.effectiveFt,
    effectiveDescentVsDestFpm,
    effectiveDescentSpeedDestKts
  );
  const todAlt = computeTopOfDescent(
    effectiveDescentCruiseAltAltFt,
    ctAlt.effectiveFt,
    effectiveDescentVsAltFpm,
    effectiveDescentSpeedAltKts
  );

  const parsedOriginWeather = parseMetarString(plan.origin.metar, plan.origin.taf);
  const parsedDestWeather = parseMetarString(plan.destination.metar, plan.destination.taf);
  const parsedAltWeather = parseMetarString(plan.alternate.metar, plan.alternate.taf);

  const rawWindOrigin: number | '' =
    plan.origin.metarWindDirection !== ''
      ? plan.origin.metarWindDirection
      : parsedOriginWeather.windDirection ?? '';
  const rawWindDest: number | '' =
    plan.destination.metarWindDirection !== ''
      ? plan.destination.metarWindDirection
      : parsedDestWeather.windDirection ?? '';
  const rawWindAlt: number | '' =
    plan.alternate.metarWindDirection !== ''
      ? plan.alternate.metarWindDirection
      : parsedAltWeather.windDirection ?? '';

  const fallbackAnyWind: number | '' =
    rawWindOrigin !== '' ? rawWindOrigin : rawWindAlt !== '' ? rawWindAlt : rawWindDest;

  const effectiveWindDirByAero: Record<'origin' | 'destination' | 'alternate', number | ''> = {
    origin: rawWindOrigin !== '' ? rawWindOrigin : fallbackAnyWind,
    destination: rawWindDest !== '' ? rawWindDest : fallbackAnyWind,
    alternate: rawWindAlt !== '' ? rawWindAlt : fallbackAnyWind,
  };

  const rawQnhOrigin: number | '' =
    plan.origin.qnhHpa !== '' ? plan.origin.qnhHpa : parsedOriginWeather.qnhHpa ?? '';
  const rawQnhDest: number | '' =
    plan.destination.qnhHpa !== '' ? plan.destination.qnhHpa : parsedDestWeather.qnhHpa ?? '';
  const rawQnhAlt: number | '' =
    plan.alternate.qnhHpa !== '' ? plan.alternate.qnhHpa : parsedAltWeather.qnhHpa ?? '';

  const fallbackAnyQnh: number | '' =
    rawQnhOrigin !== '' ? rawQnhOrigin : rawQnhAlt !== '' ? rawQnhAlt : rawQnhDest;

  const effectiveQnhByAero: Record<'origin' | 'destination' | 'alternate', number | ''> = {
    origin: rawQnhOrigin !== '' ? rawQnhOrigin : fallbackAnyQnh,
    destination: rawQnhDest !== '' ? rawQnhDest : fallbackAnyQnh,
    alternate: rawQnhAlt !== '' ? rawQnhAlt : fallbackAnyQnh,
  };

  const rwyOrigin = computeActiveRunway(
    originAerodrome?.runway1 || '',
    originAerodrome?.runway2 || '',
    effectiveWindDirByAero.origin,
    plan.origin.magneticDeclination !== '' ? plan.origin.magneticDeclination : -21
  );
  const rwyDest = computeActiveRunway(
    destinationAerodrome?.runway1 || '',
    destinationAerodrome?.runway2 || '',
    effectiveWindDirByAero.destination,
    plan.destination.magneticDeclination !== '' ? plan.destination.magneticDeclination : -21
  );
  const rwyAlt = computeActiveRunway(
    alternateAerodrome?.runway1 || '',
    alternateAerodrome?.runway2 || '',
    effectiveWindDirByAero.alternate,
    plan.alternate.magneticDeclination !== '' ? plan.alternate.magneticDeclination : -21
  );

  const tlDest = computeTransitionLevel(
    effectiveQnhByAero.destination,
    plan.destination.transitionAltitudeFt || 6000
  );
  const tlAlt = computeTransitionLevel(
    effectiveQnhByAero.alternate,
    plan.alternate.transitionAltitudeFt || 6000
  );

  const dmeLeadNm = computeDmeArcLeadDistanceNm(effectiveDmeArcSpeedKts, plan.dmeArcRadiusNm);

  const atcRouteString = buildAtcRouteString(
    plan.legs,
    plan.destination.icao,
    plan.alternate.icao
  );
  const remarkString = buildRemarkString(
    plan.operatorRemark,
    activeAircraft.performanceCategory,
    plan.callsign,
    plan.origin.icao
  );

  const selectedAircraftSelectValue =
    plan.selectedAircraftSource === 'prefix' && plan.selectedPrefixId
      ? `prefix:${plan.selectedPrefixId}`
      : `base:${plan.selectedBaseAircraftId}`;

  return (
    <div className="space-y-6">
      {/* SECTION 1: FLIGHT INFO & WEATHER */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
              1
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Informações do Voo & Meteorologia (METAR / TAF)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Busque METAR/TAF ao vivo (preenchendo vento e QNH automaticamente) ou edite manualmente para voos com clima customizado.
              </p>
            </div>
          </div>

          {/* Useful links bar from GP */}
          <div className="flex flex-wrap items-center gap-1.5">
            {USEFUL_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 transition hover:border-sky-500 hover:text-sky-500"
              >
                <span>{link.label}</span>
                <ExternalLink className="h-3 w-3 opacity-70" />
              </a>
            ))}
          </div>
        </div>

        {/* Callsign, Departure Time, Plan Title & Fetch Live Weather Button */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Callsign / Matrícula
            </label>
            <input
              type="text"
              value={plan.callsign}
              onChange={(e) =>
                onUpdatePlan((p) => ({ ...p, callsign: e.target.value.toUpperCase() }))
              }
              placeholder="Ex: PR-DAN"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 font-mono text-sm font-bold uppercase text-sky-600 dark:text-sky-400 focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Horário Decolagem (UTC)
            </label>
            <input
              type="text"
              value={plan.departureTimeUtc}
              onChange={(e) => onUpdatePlan((p) => ({ ...p, departureTimeUtc: e.target.value }))}
              placeholder="1108"
              maxLength={5}
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 font-mono text-sm font-semibold focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
              Identificação / Nome do Planejamento
            </label>
            <input
              type="text"
              value={plan.title}
              onChange={(e) => onUpdatePlan((p) => ({ ...p, title: e.target.value }))}
              placeholder="Ex: SBMT → SDAM (Voo VFR Corredor REA)"
              className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-sm font-medium focus:border-sky-500 focus:outline-none"
            />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
            <button
              type="button"
              onClick={handleFetchAllWeather}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
            >
              <CloudSun className="h-4 w-4 shrink-0" />
              <span>Atualizar METAR/TAF</span>
            </button>
            <button
              type="button"
              onClick={onResetPlan}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/20"
              title="Zerar e limpar todos os campos do planejamento"
            >
              <Trash2 className="h-4 w-4 shrink-0" />
              <span>Resetar Tudo</span>
            </button>
          </div>
        </div>

        {/* Origin A, Destination B, Alternate C table */}
        <div className="space-y-3">
          {(
            [
              { key: 'origin', label: 'Origem A:', badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', aero: originAerodrome },
              { key: 'destination', label: 'Destino B:', badgeColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', aero: destinationAerodrome },
              { key: 'alternate', label: 'Alternativo C:', badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', aero: alternateAerodrome },
            ] as const
          ).map(({ key, label, badgeColor, aero }) => {
            const cfg = plan[key];
            return (
              <div
                key={key}
                className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-3 lg:grid-cols-12 lg:items-center"
              >
                <div className="lg:col-span-2">
                  <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${badgeColor}`}>
                    {label}
                  </span>
                  <div className="mt-1">
                    <AerodromeAutocomplete
                      value={cfg.icao}
                      onChange={(icao) => handleAerodromeChange(key, icao)}
                      aerodromes={aerodromes}
                    />
                  </div>
                </div>

                <div className="lg:col-span-3">
                  <div className="text-[11px] font-medium text-slate-400">Nome do Aeródromo</div>
                  {aero ? (
                    <div className="mt-0.5">
                      <div className="truncate text-xs font-bold text-slate-800 dark:text-slate-100">
                        {aero.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {aero.city} • Elev:{' '}
                        {userPrefs.altitudeUnit === 'm' ? (
                          <>
                            <span className="font-mono font-semibold">{aero.elevationMeters} m</span> ({Math.round(aero.elevationFeet)} ft)
                          </>
                        ) : (
                          <>
                            <span className="font-mono font-semibold">{Math.round(aero.elevationFeet)} ft</span> ({aero.elevationMeters} m)
                          </>
                        )}{' '}
                        • RWY <span className="font-mono font-semibold">{aero.runway1}/{aero.runway2}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-xs font-medium text-amber-500">
                      {cfg.icao
                        ? 'Não localizado — inclua na aba Frota & Aeródromos'
                        : 'Informe o ICAO'}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      METAR (Editável / Extrai Vento & QNH)
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFetchWeatherFor(key)}
                      disabled={loadingWeather[key]}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      <RefreshCw className={`h-3 w-3 ${loadingWeather[key] ? 'animate-spin' : ''}`} />
                      <span>Buscar ao vivo</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={cfg.metar}
                    onChange={(e) => applyMetarParsedValues(key, e.target.value)}
                    placeholder={`METAR ${cfg.icao || 'XXXX'}...`}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="lg:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    TAF (Previsão Terminal)
                  </label>
                  <input
                    type="text"
                    value={cfg.taf}
                    onChange={(e) => applyMetarParsedValues(key, cfg.metar, e.target.value)}
                    placeholder={`TAF ${cfg.icao || 'XXXX'}...`}
                    className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono text-xs text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTIONS 2, 3, 4, 5: AIRCRAFT, WEIGHT, FLIGHT RULES & CHARTS */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* 2. Informações da Aeronave */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-3">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
              2
            </span>
            <Plane className="h-4 w-4 text-sky-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Informações da Aeronave
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300">
                Aeronave / Prefixo
              </label>
              <select
                value={selectedAircraftSelectValue}
                onChange={(e) => handleAircraftSelectionChange(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-2 text-xs font-semibold"
              >
                {userFleet.length > 0 && (
                  <optgroup label="Meus Prefixos Particulares">
                    {userFleet.map((p) => (
                      <option key={p.id} value={`prefix:${p.id}`}>
                        {p.registration} — {p.baseAircraftName}
                      </option>
                    ))}
                  </optgroup>
                )}
                <optgroup label="Catálogo de Aeronaves Base">
                  {baseAircraftList.map((b) => (
                    <option key={b.id} value={`base:${b.id}`}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <div>
                <div className="text-[10px] text-slate-400">Tipo/ICAO/Est. Turb.</div>
                <div className="mt-0.5 font-mono font-bold text-sky-600 dark:text-sky-400">
                  {activeAircraft.typeIcaoWake}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">
                  Consumo ({userPrefs.fuelVolumeUnit === 'gal' ? 'Gal/Hora' : 'Litro/Hora'})
                </div>
                <div className="mt-0.5 font-mono font-bold">
                  {formatFuelFlow(activeAircraft.fuelConsumptionLph, userPrefs.fuelVolumeUnit)}
                </div>
              </div>
              <div className="col-span-2 border-t border-slate-200/60 dark:border-slate-700/60 pt-2">
                <div className="text-[10px] text-slate-400">
                  Capacidade de Combustível ({userPrefs.fuelVolumeUnit === 'gal' ? 'galões' : 'litros'})
                </div>
                <div className="mt-0.5 font-mono font-semibold">
                  {formatFuelCapacity(activeAircraft.fuelCapacityDisplay, userPrefs.fuelVolumeUnit)}
                </div>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 dark:text-slate-300">
                Unidade de Combustível (Cálculo Rota)
              </label>
              <select
                value={plan.fuelUnit}
                onChange={(e) =>
                  onUpdatePlan((p) => ({ ...p, fuelUnit: e.target.value as FuelUnit }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="Kilogramas (kg)">Kilogramas (kg)</option>
                <option value="Litros (L)">Litros (L)</option>
                <option value="Galão (Gal)">Galão (Gal)</option>
                <option value="Pounds (lbs)">Pounds (lbs)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. Informações de Peso */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-3">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
              3
            </span>
            <Scale className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Informações de Peso ({userPrefs.weightUnit})
            </h3>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-300">
                  # Tripulantes (POB)
                </label>
                <input
                  type="number"
                  min={1}
                  value={plan.crewCount}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({ ...p, crewCount: Math.max(1, Number(e.target.value)) }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-300">
                  Peso Médio ({userPrefs.weightUnit})
                </label>
                <input
                  type="number"
                  min={0}
                  value={fromKg(plan.AverageCrewWeightKg, userPrefs.weightUnit, 0)}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({
                      ...p,
                      AverageCrewWeightKg: Number(toKg(e.target.value === '' ? 0 : Number(e.target.value), userPrefs.weightUnit)) || 0,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-300">
                Carga / Bagagem ({userPrefs.weightUnit})
              </label>
              <input
                type="number"
                min={0}
                value={fromKg(plan.cargoWeightKg, userPrefs.weightUnit, 0)}
                onChange={(e) =>
                  onUpdatePlan((p) => ({
                    ...p,
                    cargoWeightKg: Number(toKg(e.target.value === '' ? 0 : Number(e.target.value), userPrefs.weightUnit)) || 0,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
              <div>
                <div className="text-[10px] text-slate-400">Peso Vazio (BEW)</div>
                <div className="mt-0.5 font-mono font-semibold">
                  {formatWeight(activeAircraft.emptyWeightKg, userPrefs.weightUnit, 0)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">GW (Peso Bruto Est.)</div>
                <div className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {grossWeightKg !== null ? formatWeight(grossWeightKg, userPrefs.weightUnit, 1) : '—'}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Regra de Voo */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
              4
            </span>
            <Compass className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Regra de Voo
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-300">
                Regra de Voo
              </label>
              <select
                value={plan.flightRule}
                onChange={(e) =>
                  onUpdatePlan((p) => ({ ...p, flightRule: e.target.value as FlightRule }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs font-bold"
              >
                <option value="VFR">VFR (Visual)</option>
                <option value="IFR">IFR (Instrumentos)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-300">
                Período do Voo
              </label>
              <select
                value={plan.flightPeriod}
                onChange={(e) =>
                  onUpdatePlan((p) => ({ ...p, flightPeriod: e.target.value as FlightPeriod }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="Diurno">Diurno (+30m VFR)</option>
                <option value="Noturno">Noturno (+45m)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-600 dark:text-slate-300">
                Conting. Op. Solo (+10%)
              </label>
              <select
                value={plan.groundContingency ? 'Sim' : 'Não'}
                onChange={(e) =>
                  onUpdatePlan((p) => ({ ...p, groundContingency: e.target.value === 'Sim' }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
              >
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </div>
          </div>
        </section>

        {/* 5. Cartas Aéreas */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm lg:col-span-4">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                5
              </span>
              <Map className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Cartas Aéreas & TA (AISWEB)
              </h3>
            </div>
            <span className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[10px] font-semibold">
              Modo {plan.flightRule}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-500">
                  <th className="py-1.5 px-1 text-left">ICAO</th>
                  <th className="py-1.5 px-1">TA (ft)</th>
                  {chartHeaders.map((h) => (
                    <th key={h} className="py-1.5 px-1">
                      {h}
                    </th>
                  ))}
                  <th className="py-1.5 px-1">AISWEB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(['origin', 'destination', 'alternate'] as const).map((key) => {
                  const cfg: AerodromePlanningConfig = plan[key];
                  return (
                    <tr key={key}>
                      <td className="py-2 px-1 text-left font-mono font-bold text-sky-600 dark:text-sky-400">
                        {cfg.icao || '—'}
                      </td>
                      <td className="py-2 px-1">
                        <input
                          type="number"
                          step={500}
                          value={cfg.transitionAltitudeFt}
                          onChange={(e) =>
                            onUpdatePlan((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                transitionAltitudeFt:
                                  e.target.value === '' ? '' : Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="6000"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs"
                        />
                      </td>
                      {(['col1', 'col2', 'col3', 'col4', 'col5'] as const).map((colKey) => (
                        <td key={colKey} className="py-2 px-1">
                          <input
                            type="checkbox"
                            checked={cfg.charts[colKey]}
                            onChange={(e) =>
                              onUpdatePlan((p) => ({
                                ...p,
                                [key]: {
                                  ...p[key],
                                  charts: {
                                    ...p[key].charts,
                                    [colKey]: e.target.checked,
                                  },
                                },
                              }))
                            }
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                        </td>
                      ))}
                      <td className="py-2 px-1">
                        {cfg.icao && (
                          <a
                            href={`https://aisweb.decea.mil.br/?i=cartas&icaocode=${cfg.icao}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center rounded bg-sky-500/10 p-1 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20"
                            title={`Abrir cartas de ${cfg.icao} na AISWEB`}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* SECTION 6: ROUTE PLANNING SMART TABLE */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
              6
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Planejamento de Rota (Navegação por Trechos)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Preencha os trechos, distâncias, rumos, velocidades, altitudes e vento. Proa magnética, GS, tempos, ETO/ETA e combustível são calculados em tempo real.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Altitude OK / REA
            </span>
            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Altitude NOK
            </span>
            {plan.destination.icao.trim() &&
              plan.legs[plan.legs.length - 1]?.waypoint.trim().toUpperCase() !==
                plan.destination.icao.trim().toUpperCase() && (
                <button
                  type="button"
                  onClick={closeRouteToDestination}
                  title="Adiciona automaticamente o trecho final do último fixo até o Aeródromo de Destino"
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Fechar Rota p/ Destino ({plan.destination.icao.trim().toUpperCase()})
                  </span>
                </button>
              )}
            <button
              type="button"
              onClick={addLeg}
              className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
            >
              <Plus className="h-4 w-4" />
              <span>Adicionar Trecho</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-2 text-left">De (Origem / Fixo)</th>
                <th className="py-2.5 px-2 text-left">Para (Fixo / Portão / Destino)</th>
                <th className="py-2.5 px-1.5 text-center">Dist. ({distanceUnitLabel(userPrefs.distanceUnit)})</th>
                <th className="py-2.5 px-1.5 text-center">Rumo Mag.</th>
                <th className="py-2.5 px-1.5 text-center">VI / IAS ({speedUnitLabel(userPrefs.speedUnit)})</th>
                <th className="py-2.5 px-1.5 text-center">Mach</th>
                <th className="py-2.5 px-1.5 text-center">Regra PI</th>
                <th className="py-2.5 px-1.5 text-center">Altitude / FL</th>
                <th className="py-2.5 px-1 text-center">REA/H</th>
                <th className="py-2.5 px-1.5 text-center">VA / TAS ({speedUnitLabel(userPrefs.speedUnit)})</th>
                <th className="py-2.5 px-1.5 text-center">Vento Dir (°)</th>
                <th className="py-2.5 px-1.5 text-center">Vento ({speedUnitLabel(userPrefs.speedUnit)})</th>
                <th className="py-2.5 px-1.5 text-center">Proa Mag.</th>
                <th className="py-2.5 px-1.5 text-center">VS / GS ({speedUnitLabel(userPrefs.speedUnit)})</th>
                <th className="py-2.5 px-1.5 text-center">Duração</th>
                <th className="py-2.5 px-1.5 text-center">ETO / ETA</th>
                <th className="py-2.5 px-1.5 text-center">Combustível</th>
                <th className="py-2.5 px-2 text-left">Observações</th>
                <th className="py-2.5 px-1 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {computedLegsAB.map((leg, index) => {
                const statusBadge =
                  leg.altitudeStatus === 'OK' || leg.altitudeStatus === 'REA/H'
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : leg.altitudeStatus === 'NOK'
                    ? 'border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : leg.altitudeStatus === 'TA?'
                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300'
                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950';

                const isDestinationLeg =
                  Boolean(plan.destination.icao.trim()) &&
                  leg.waypoint.trim().toUpperCase() ===
                    plan.destination.icao.trim().toUpperCase();

                return (
                  <tr
                    key={leg.id}
                    className={
                      isDestinationLeg
                        ? 'bg-emerald-500/5 hover:bg-emerald-500/10'
                        : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                    }
                  >
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={leg.origin}
                        onChange={(e) =>
                          updateLeg(index, { origin: e.target.value.toUpperCase() })
                        }
                        className="w-28 rounded border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/70 px-2 py-1 font-mono text-xs font-semibold uppercase"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={leg.waypoint}
                          onChange={(e) =>
                            updateLeg(index, { waypoint: e.target.value.toUpperCase() })
                          }
                          placeholder="FIXO / ICAO"
                          className="w-36 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1 font-mono text-xs font-bold uppercase focus:border-sky-500 focus:outline-none"
                        />
                        {isDestinationLeg && (
                          <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                            DESTINO B
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <input
                        type="number"
                        step="0.1"
                        min={0}
                        value={fromNm(leg.distanceNm, userPrefs.distanceUnit, 1)}
                        onChange={(e) =>
                          updateLeg(index, {
                            distanceNm: toNm(e.target.value === '' ? '' : Number(e.target.value), userPrefs.distanceUnit),
                          })
                        }
                        className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={leg.magneticCourse}
                        onChange={(e) =>
                          updateLeg(index, {
                            magneticCourse: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={fromKnots(leg.iasKts, userPrefs.speedUnit, 0)}
                        onChange={(e) =>
                          updateLeg(index, {
                            iasKts: toKnots(e.target.value === '' ? '' : Number(e.target.value), userPrefs.speedUnit),
                          })
                        }
                        className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {leg.mach !== null ? leg.mach.toFixed(2) : '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      {leg.semicircularRule && (
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                            leg.semicircularRule === 'PAR'
                              ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                              : 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                          }`}
                        >
                          {leg.semicircularRule}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <input
                        type="text"
                        value={leg.altitudeInput}
                        onChange={(e) =>
                          updateLeg(index, { altitudeInput: e.target.value.toUpperCase() })
                        }
                        placeholder="4500 / A045"
                        title={
                          leg.altitudeStatus === 'NOK'
                            ? `Altitude fora da regra ${leg.semicircularRule} (${plan.flightRule})`
                            : 'Altitude válida'
                        }
                        className={`w-20 rounded border px-1.5 py-1 text-center font-mono text-xs font-bold ${statusBadge}`}
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      <input
                        type="checkbox"
                        checked={leg.isReaCorridor}
                        onChange={(e) => updateLeg(index, { isReaCorridor: e.target.checked })}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                        title="Voo em Corredor Visual REA/REH"
                      />
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-semibold text-slate-700 dark:text-slate-300">
                      {leg.tasKts !== null ? fromKnots(leg.tasKts, userPrefs.speedUnit, 0) : '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        max={360}
                        value={leg.windDirection}
                        onChange={(e) =>
                          updateLeg(index, {
                            windDirection: e.target.value === '' ? '' : Number(e.target.value),
                          })
                        }
                        className="w-14 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 py-1 text-center font-mono text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-1.5 text-center">
                      <div className="flex items-center justify-center gap-0.5">
                        <input
                          type="number"
                          min={0}
                          value={fromKnots(leg.windSpeedKts, userPrefs.speedUnit, 0)}
                          onChange={(e) =>
                            updateLeg(index, {
                              windSpeedKts: toKnots(e.target.value === '' ? '' : Number(e.target.value), userPrefs.speedUnit),
                            })
                          }
                          className="w-12 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1 py-1 text-center font-mono text-xs"
                        />
                        {index === 0 && (
                          <button
                            type="button"
                            onClick={() => copyWindToAllLegs(leg.windDirection, leg.windSpeedKts)}
                            title="Repetir este vento para todos os trechos"
                            className="rounded p-0.5 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-sky-500"
                          >
                            <ArrowDownRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                      {leg.magneticHeading !== null ? `${Math.round(leg.magneticHeading)}°` : '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {leg.groundSpeedKts !== null ? fromKnots(leg.groundSpeedKts, userPrefs.speedUnit, 0) : '—'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono text-[11px]">
                      {leg.durationFormatted}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono text-[11px] font-semibold">
                      {leg.etoFormatted}
                    </td>
                    <td className="py-1.5 px-1.5 text-center font-mono font-semibold">
                      {leg.fuelRequired !== null ? leg.fuelRequired.toFixed(1) : '—'}
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        type="text"
                        value={leg.notes}
                        onChange={(e) => updateLeg(index, { notes: e.target.value })}
                        placeholder="Obs..."
                        className="w-28 rounded border border-slate-200 dark:border-slate-800 bg-transparent px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="py-1.5 px-1 text-center">
                      {plan.legs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLeg(index)}
                          className="rounded p-1 text-slate-400 hover:bg-rose-500/10 hover:text-rose-500"
                          title="Remover trecho"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {/* Prompt row if the last leg has not yet closed into Destination (B) */}
              {plan.destination.icao.trim() &&
                plan.legs[plan.legs.length - 1]?.waypoint.trim() &&
                plan.legs[plan.legs.length - 1]?.waypoint.trim().toUpperCase() !==
                  plan.destination.icao.trim().toUpperCase() && (
                  <tr className="bg-emerald-500/10">
                    <td colSpan={19} className="py-2 px-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                          Falta fechar o último trecho da rota principal:{' '}
                          <strong className="font-mono">
                            {plan.legs[plan.legs.length - 1]?.waypoint.trim().toUpperCase()} →{' '}
                            {plan.destination.icao.trim().toUpperCase()} (Destino B)
                          </strong>
                        </span>
                        <button
                          type="button"
                          onClick={closeRouteToDestination}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm hover:bg-emerald-500"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            Inserir Trecho Final ({plan.legs[plan.legs.length - 1]?.waypoint.trim().toUpperCase()} →{' '}
                            {plan.destination.icao.trim().toUpperCase()})
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}

              {/* Separator Banner for Alternate Leg (B -> C) */}
              <tr className="border-t-2 border-amber-500/40 bg-amber-500/15">
                <td
                  colSpan={19}
                  className="py-1.5 px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"
                >
                  ↳ Trecho de Alternativa (B → C): Voo do Destino ({plan.destination.icao || 'DEST'}) até o Aeródromo Alternativo ({plan.alternate.icao || 'ALT'})
                </td>
              </tr>

              {/* Alternate Leg Row (Row 43: SDAM DESTINO -> SDTF ALTERNATIVO) */}
              <tr className="bg-amber-500/5">
                <td className="py-2 px-2 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  {plan.destination.icao || 'DEST'} (DESTINO)
                </td>
                <td className="py-2 px-2 font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                  {plan.alternate.icao || 'ALT'} (ALTERNATIVO)
                </td>
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    step="0.1"
                    min={0}
                    value={fromNm(plan.alternateLeg.distanceNm, userPrefs.distanceUnit, 1)}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: {
                          ...p.alternateLeg,
                          distanceNm: toNm(e.target.value === '' ? '' : Number(e.target.value), userPrefs.distanceUnit),
                        },
                      }))
                    }
                    className="w-16 rounded border border-amber-500/40 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs font-bold"
                  />
                </td>
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min={0}
                    max={360}
                    value={plan.alternateLeg.magneticCourse}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: {
                          ...p.alternateLeg,
                          magneticCourse: e.target.value === '' ? '' : Number(e.target.value),
                        },
                      }))
                    }
                    className="w-14 rounded border border-amber-500/40 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs"
                  />
                </td>
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    min={0}
                    value={fromKnots(plan.alternateLeg.iasKts, userPrefs.speedUnit, 0)}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: {
                          ...p.alternateLeg,
                          iasKts: toKnots(e.target.value === '' ? '' : Number(e.target.value), userPrefs.speedUnit),
                        },
                      }))
                    }
                    className="w-14 rounded border border-amber-500/40 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs"
                  />
                </td>
                <td className="py-2 px-1.5 text-center font-mono text-[11px]">
                  {computedLegBC.mach !== null ? computedLegBC.mach.toFixed(2) : '—'}
                </td>
                <td className="py-2 px-1.5 text-center font-mono text-[10px] font-bold">
                  {computedLegBC.semicircularRule || '—'}
                </td>
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="text"
                    value={plan.alternateLeg.altitudeInput}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: {
                          ...p.alternateLeg,
                          altitudeInput: e.target.value.toUpperCase(),
                        },
                      }))
                    }
                    placeholder="Alt/FL"
                    className="w-20 rounded border border-amber-500/40 bg-white dark:bg-slate-950 px-1.5 py-1 text-center font-mono text-xs"
                  />
                </td>
                <td className="py-2 px-1 text-center">
                  <input
                    type="checkbox"
                    checked={plan.alternateLeg.isReaCorridor}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: { ...p.alternateLeg, isReaCorridor: e.target.checked },
                      }))
                    }
                    className="h-4 w-4 rounded"
                  />
                </td>
                <td className="py-2 px-1.5 text-center font-mono">
                  {computedLegBC.tasKts !== null ? fromKnots(computedLegBC.tasKts, userPrefs.speedUnit, 0) : '—'}
                </td>
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    value={plan.alternateLeg.windDirection}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: {
                          ...p.alternateLeg,
                          windDirection: e.target.value === '' ? '' : Number(e.target.value),
                        },
                      }))
                    }
                    className="w-14 rounded border border-amber-500/40 bg-white dark:bg-slate-950 px-1 py-1 text-center font-mono text-xs"
                  />
                </td>
                <td className="py-2 px-1.5 text-center">
                  <input
                    type="number"
                    value={fromKnots(plan.alternateLeg.windSpeedKts, userPrefs.speedUnit, 0)}
                    onChange={(e) =>
                      onUpdatePlan((p) => ({
                        ...p,
                        alternateLeg: {
                          ...p.alternateLeg,
                          windSpeedKts: toKnots(e.target.value === '' ? '' : Number(e.target.value), userPrefs.speedUnit),
                        },
                      }))
                    }
                    className="w-12 rounded border border-amber-500/40 bg-white dark:bg-slate-950 px-1 py-1 text-center font-mono text-xs"
                  />
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-bold">
                  {computedLegBC.magneticHeading !== null
                    ? `${Math.round(computedLegBC.magneticHeading)}°`
                    : '—'}
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-bold">
                  {computedLegBC.groundSpeedKts !== null
                    ? fromKnots(computedLegBC.groundSpeedKts, userPrefs.speedUnit, 0)
                    : '—'}
                </td>
                <td className="py-2 px-1.5 text-center font-mono text-[11px]">
                  {computedLegBC.durationFormatted}
                </td>
                <td className="py-2 px-1.5 text-center font-mono text-[11px]">
                  {computedLegBC.etoFormatted}
                </td>
                <td className="py-2 px-1.5 text-center font-mono font-semibold">
                  {computedLegBC.fuelRequired !== null
                    ? computedLegBC.fuelRequired.toFixed(1)
                    : '0.0'}
                </td>
                <td className="py-2 px-2 text-xs text-amber-600 dark:text-amber-400" colSpan={2}>
                  Trecho Alternativo (B+C)
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Route Summary Totals (Rows 44-47) + Route & Remark Copy Cards */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-7">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Origem → Destino (A+B)
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {Number(fromNm(totals.distanceAB, userPrefs.distanceUnit, 1)).toFixed(1)} {distanceUnitLabel(userPrefs.distanceUnit)}
              </div>
              <div className="mt-0.5 font-mono text-xs text-sky-600 dark:text-sky-400">
                ⏱ {totals.durationFormattedAB} • ⛽ {totals.fuelAB.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Destino → Altern. (B+C)
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {Number(fromNm(totals.distanceBC, userPrefs.distanceUnit, 1)).toFixed(1)} {distanceUnitLabel(userPrefs.distanceUnit)}
              </div>
              <div className="mt-0.5 font-mono text-xs text-amber-600 dark:text-amber-400">
                ⏱ {totals.durationFormattedBC} • ⛽ {totals.fuelBC.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                Total Origem → Alt. (A+B+C)
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                {Number(fromNm(totals.distanceABC, userPrefs.distanceUnit, 1)).toFixed(1)} {distanceUnitLabel(userPrefs.distanceUnit)}
              </div>
              <div className="mt-0.5 font-mono text-xs text-slate-600 dark:text-slate-300">
                ⏱ {totals.durationFormattedABC} • ⛽ {totals.fuelABC.toFixed(1)}
              </div>
            </div>

            <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
              <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                Total + Reserva + Conting.
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                ⏱ {totals.totalEnduranceFormatted}
              </div>
              <div className="mt-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                ⛽ {totals.totalFuelWithReserve.toFixed(1)} (Asa: {totals.fuelPerWing.toFixed(1)})
              </div>
            </div>
          </div>

          {/* ATC Route & Remark (Row 52) */}
          <div className="space-y-2.5 lg:col-span-5">
            <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Rota de Voo (Plano de Voo / vPilot)
                </div>
                <div className="truncate font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {atcRouteString}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(atcRouteString, 'route')}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-500"
              >
                {copiedField === 'route' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === 'route' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Remark (Item 18 — OPR / PER / RMK)
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-slate-400">OPR/:</span>
                    <input
                      type="text"
                      value={
                        !plan.operatorRemark ||
                        plan.operatorRemark.toUpperCase().includes('GOLD')
                          ? 'PARTICULAR'
                          : plan.operatorRemark
                      }
                      onChange={(e) =>
                        onUpdatePlan((p) => ({
                          ...p,
                          operatorRemark: e.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="PARTICULAR"
                      className="w-32 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
                <div className="mt-0.5 truncate font-mono text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {remarkString}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(remarkString, 'rmk')}
                className="flex shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-sky-500"
              >
                {copiedField === 'rmk' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedField === 'rmk' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 7: FLIGHT PLANNING (TRAFFIC PATTERN, TOD, ACTIVE RUNWAY, ALTIMETER, TL & DME ARC) */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
            7
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Planejamento de Voo (Circuito de Tráfego, TOD, Pista em Uso, QNH/TL e Arco DME)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cálculos automáticos de altitude de circuito, ponto ideal de descida (TOD), cabeceira em uso pelo vento magnético e nível de transição.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* 7A: Circuito de Tráfego (CT) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Circuito de Tráfego — CT
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Regra CT Tipo Aeronave:</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {activeAircraft.propulsionType}
                </span>
              </div>

              {(
                [
                  { key: 'origin', label: `Origem (${plan.origin.icao || '—'})`, ct: ctOrigin, aero: originAerodrome },
                  { key: 'destination', label: `Destino (${plan.destination.icao || '—'})`, ct: ctDest, aero: destinationAerodrome },
                  { key: 'alternate', label: `Alternativo (${plan.alternate.icao || '—'})`, ct: ctAlt, aero: alternateAerodrome },
                ] as const
              ).map(({ key, label, ct, aero }) => (
                <div
                  key={key}
                  className="rounded-lg border border-slate-200/80 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{label}</span>
                    <span className="rounded bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                      Tipo: {ct.typeLabel}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Elevação:{' '}
                      {aero
                        ? userPrefs.altitudeUnit === 'm'
                          ? `${aero.elevationMeters} m`
                          : `${Math.round(aero.elevationFeet)} ft`
                        : '—'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>CT ({userPrefs.altitudeUnit}):</span>
                      {ct.typeLabel === 'VAC' ? (
                        <input
                          type="number"
                          step={userPrefs.altitudeUnit === 'm' ? 50 : 100}
                          value={fromFeet(plan[key].vacTrafficPatternAltitudeFt, userPrefs.altitudeUnit, 0)}
                          onChange={(e) =>
                            onUpdatePlan((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                vacTrafficPatternAltitudeFt: toFeet(
                                  e.target.value === '' ? '' : Number(e.target.value),
                                  userPrefs.altitudeUnit
                                ),
                              },
                            }))
                          }
                          placeholder={String(fromFeet(ct.standardFt || 3000, userPrefs.altitudeUnit, 0))}
                          className="w-20 rounded border border-sky-500/50 bg-sky-500/10 px-1.5 py-0.5 text-center font-mono text-xs font-bold text-sky-600 dark:text-sky-300"
                        />
                      ) : (
                        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                          {ct.effectiveFt !== null
                            ? `${fromFeet(ct.effectiveFt, userPrefs.altitudeUnit, 0)} ${userPrefs.altitudeUnit}`
                            : 'N/A'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7B: Ideal de Descida até o Circuito de Tráfego (TOD) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Ideal de Descida — TOD (Top of Descent)
              </h3>
              {Number(effectiveDescentSpeedDestKts) > 0 &&
                Number(effectiveDescentVsDestFpm) > 0 && (
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    {((Number(effectiveDescentSpeedDestKts) / 60) * (1000 / Number(effectiveDescentVsDestFpm))).toFixed(1)} NM / 1.000 ft
                  </span>
                )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                    <th className="py-1.5 text-left">Parâmetro</th>
                    <th className="py-1.5 text-center">Destino ({plan.destination.icao || 'DEST'})</th>
                    <th className="py-1.5 text-center">Altern. ({plan.alternate.icao || 'ALT'})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 font-medium">
                      <div>Altitude Cruzeiro ({userPrefs.altitudeUnit}):</div>
                      <div className="text-[10px] font-normal text-slate-400">Auto da Rota</div>
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        step={userPrefs.altitudeUnit === 'm' ? 50 : 100}
                        value={fromFeet(effectiveDescentCruiseAltDestFt, userPrefs.altitudeUnit, 0)}
                        onChange={(e) =>
                          onUpdatePlan((p) => ({
                            ...p,
                            descentCruiseAltitudeFt: toFeet(
                              e.target.value === '' ? '' : Number(e.target.value),
                              userPrefs.altitudeUnit
                            ),
                          }))
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        step={userPrefs.altitudeUnit === 'm' ? 50 : 100}
                        value={fromFeet(effectiveDescentCruiseAltAltFt, userPrefs.altitudeUnit, 0)}
                        onChange={(e) =>
                          onUpdatePlan((p) => ({
                            ...p,
                            alternateDescentCruiseAltitudeFt: toFeet(
                              e.target.value === '' ? '' : Number(e.target.value),
                              userPrefs.altitudeUnit
                            ),
                          }))
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center font-mono text-xs"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">
                      <div>Vertical Speed ({vsUnitLabel(userPrefs.verticalSpeedUnit)}):</div>
                      <div className="text-[10px] font-normal text-slate-400">Auto da Aeronave</div>
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        step={userPrefs.verticalSpeedUnit === 'm/s' ? '0.5' : 50}
                        value={fromFpm(effectiveDescentVsDestFpm, userPrefs.verticalSpeedUnit, 1)}
                        onChange={(e) =>
                          onUpdatePlan((p) => ({
                            ...p,
                            descentVerticalSpeedFpm: toFpm(
                              e.target.value === '' ? '' : Number(e.target.value),
                              userPrefs.verticalSpeedUnit
                            ),
                          }))
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        step={userPrefs.verticalSpeedUnit === 'm/s' ? '0.5' : 50}
                        value={fromFpm(effectiveDescentVsAltFpm, userPrefs.verticalSpeedUnit, 1)}
                        onChange={(e) =>
                          onUpdatePlan((p) => ({
                            ...p,
                            alternateDescentVerticalSpeedFpm: toFpm(
                              e.target.value === '' ? '' : Number(e.target.value),
                              userPrefs.verticalSpeedUnit
                            ),
                          }))
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center font-mono text-xs"
                      />
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">Descida até o CT ({userPrefs.altitudeUnit}):</td>
                    <td className="py-2 text-center font-mono font-bold">
                      {todDest.altitudeToLoseFt !== null
                        ? `${fromFeet(todDest.altitudeToLoseFt, userPrefs.altitudeUnit, 0)} ${userPrefs.altitudeUnit}`
                        : '—'}
                    </td>
                    <td className="py-2 text-center font-mono font-bold">
                      {todAlt.altitudeToLoseFt !== null
                        ? `${fromFeet(todAlt.altitudeToLoseFt, userPrefs.altitudeUnit, 0)} ${userPrefs.altitudeUnit}`
                        : '—'}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">TOD (Tempo p/ Destino):</td>
                    <td className="py-2 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                      {todDest.todTimeFormatted}
                    </td>
                    <td className="py-2 text-center font-mono font-bold text-sky-600 dark:text-sky-400">
                      {todAlt.todTimeFormatted}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 font-medium">
                      <div>Velocidade Descida ({speedUnitLabel(userPrefs.speedUnit)}):</div>
                      <div className="text-[10px] font-normal text-slate-400">Auto da Aeronave</div>
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        value={fromKnots(effectiveDescentSpeedDestKts, userPrefs.speedUnit, 0)}
                        onChange={(e) =>
                          onUpdatePlan((p) => ({
                            ...p,
                            descentSpeedKts: toKnots(
                              e.target.value === '' ? '' : Number(e.target.value),
                              userPrefs.speedUnit
                            ),
                          }))
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center font-mono text-xs font-semibold"
                      />
                    </td>
                    <td className="py-2 text-center">
                      <input
                        type="number"
                        value={fromKnots(effectiveDescentSpeedAltKts, userPrefs.speedUnit, 0)}
                        onChange={(e) =>
                          onUpdatePlan((p) => ({
                            ...p,
                            alternateDescentSpeedKts: toKnots(
                              e.target.value === '' ? '' : Number(e.target.value),
                              userPrefs.speedUnit
                            ),
                          }))
                        }
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1.5 py-1 text-center font-mono text-xs"
                      />
                    </td>
                  </tr>
                  <tr className="bg-emerald-500/10">
                    <td className="py-2 px-1 font-bold text-emerald-700 dark:text-emerald-300">
                      TOD (Distância {distanceUnitLabel(userPrefs.distanceUnit)}):
                    </td>
                    <td className="py-2 text-center font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {todDest.todDistanceNm !== null
                        ? `${Number(fromNm(todDest.todDistanceNm, userPrefs.distanceUnit, 1)).toFixed(1)} ${distanceUnitLabel(userPrefs.distanceUnit)}`
                        : '—'}
                    </td>
                    <td className="py-2 text-center font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {todAlt.todDistanceNm !== null
                        ? `${Number(fromNm(todAlt.todDistanceNm, userPrefs.distanceUnit, 1)).toFixed(1)} ${distanceUnitLabel(userPrefs.distanceUnit)}`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 7C: Definição de Pista em Uso */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Definição de Pista em Uso
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                    <th className="py-1.5 text-left">Aeródromo</th>
                    <th className="py-1.5 font-mono">{plan.origin.icao || 'ORIG'}</th>
                    <th className="py-1.5 font-mono">{plan.destination.icao || 'DEST'}</th>
                    <th className="py-1.5 font-mono">{plan.alternate.icao || 'ALT'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-left font-medium">Cabeceira 1:</td>
                    <td className="py-2 font-mono font-semibold">{originAerodrome?.runway1 || '—'}</td>
                    <td className="py-2 font-mono font-semibold">{destinationAerodrome?.runway1 || '—'}</td>
                    <td className="py-2 font-mono font-semibold">{alternateAerodrome?.runway1 || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left font-medium">Cabeceira 2:</td>
                    <td className="py-2 font-mono font-semibold">{originAerodrome?.runway2 || '—'}</td>
                    <td className="py-2 font-mono font-semibold">{destinationAerodrome?.runway2 || '—'}</td>
                    <td className="py-2 font-mono font-semibold">{alternateAerodrome?.runway2 || '—'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-left font-medium">Vento METAR (°):</td>
                    {(['origin', 'destination', 'alternate'] as const).map((key) => (
                      <td key={key} className="py-1.5">
                        <input
                          type="number"
                          min={0}
                          max={360}
                          value={effectiveWindDirByAero[key]}
                          onChange={(e) =>
                            onUpdatePlan((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                metarWindDirection:
                                  e.target.value === '' ? '' : Number(e.target.value),
                              },
                            }))
                          }
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1 text-center font-mono text-xs font-semibold"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-left font-medium">Declinação Mag. (°):</td>
                    {(['origin', 'destination', 'alternate'] as const).map((key) => (
                      <td key={key} className="py-1.5">
                        <input
                          type="number"
                          value={
                            plan[key].magneticDeclination !== ''
                              ? plan[key].magneticDeclination
                              : -21
                          }
                          onChange={(e) =>
                            onUpdatePlan((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                magneticDeclination:
                                  e.target.value === '' ? '' : Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="-21"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-amber-500/15">
                    <td className="py-2.5 px-1 text-left font-bold text-amber-700 dark:text-amber-300">
                      Pista em Uso:
                    </td>
                    <td className="py-2.5 font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {rwyOrigin.activeRunway || '—'}
                    </td>
                    <td className="py-2.5 font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {rwyDest.activeRunway || '—'}
                    </td>
                    <td className="py-2.5 font-mono text-sm font-bold text-amber-600 dark:text-amber-400">
                      {rwyAlt.activeRunway || '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Bottom row of Section 7: Altimeter QNH, Transition Level (TL) & DME Arc Entry */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Ajuste de Altímetro (hPa <-> inHg) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Ajuste de Altímetro (QNH: hPa ↔ POL)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                    <th className="py-1 text-left">Unidade</th>
                    <th className="py-1 font-mono">{plan.origin.icao || 'ORIG'}</th>
                    <th className="py-1 font-mono">{plan.destination.icao || 'DEST'}</th>
                    <th className="py-1 font-mono">{plan.alternate.icao || 'ALT'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800">
                  <tr>
                    <td className="py-2 text-left font-medium">Digite em hPa:</td>
                    {(['origin', 'destination', 'alternate'] as const).map((key) => (
                      <td key={key} className="py-1.5">
                        <input
                          type="number"
                          value={effectiveQnhByAero[key]}
                          onChange={(e) =>
                            onUpdatePlan((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                qnhHpa: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="1013"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1 text-center font-mono text-xs font-bold"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-left text-slate-500">Equiv. em POL (inHg):</td>
                    {(['origin', 'destination', 'alternate'] as const).map((key) => {
                      const inHg = convertHpaToInHg(effectiveQnhByAero[key]);
                      return (
                        <td key={key} className="py-2 font-mono font-semibold text-sky-600 dark:text-sky-400">
                          {inHg !== null ? inHg.toFixed(2) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="py-2 text-left font-medium">Digite em POL:</td>
                    {(['origin', 'destination', 'alternate'] as const).map((key) => (
                      <td key={key} className="py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={plan[key].qnhPolInput}
                          onChange={(e) =>
                            onUpdatePlan((p) => ({
                              ...p,
                              [key]: {
                                ...p[key],
                                qnhPolInput: e.target.value === '' ? '' : Number(e.target.value),
                              },
                            }))
                          }
                          placeholder="2992"
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-1 text-center font-mono text-xs"
                        />
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 text-left text-slate-500">Equiv. em hPa:</td>
                    {(['origin', 'destination', 'alternate'] as const).map((key) => {
                      const hpa = convertPolInputToHpa(plan[key].qnhPolInput);
                      return (
                        <td key={key} className="py-2 font-mono font-semibold">
                          {hpa !== null ? Math.round(hpa) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Nível de Transição (TL) */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Nível de Transição — Troca de QNE para QNH
            </h3>
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Calculado automaticamente cruzando a TA informada na Seção 5 com o QNH (hPa) de Destino e Alternativo:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3.5 text-center">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Destino ({plan.destination.icao || '—'})
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-sky-600 dark:text-sky-400">
                  {tlDest}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  TA: {plan.destination.transitionAltitudeFt || 6000} ft • QNH:{' '}
                  {effectiveQnhByAero.destination || '—'}
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-center">
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Alternativo ({plan.alternate.icao || '—'})
                </div>
                <div className="mt-1 font-mono text-xl font-bold text-amber-600 dark:text-amber-400">
                  {tlAlt}
                </div>
                <div className="mt-1 text-[10px] text-slate-500">
                  TA: {plan.alternate.transitionAltitudeFt || 6000} ft • QNH:{' '}
                  {effectiveQnhByAero.alternate || '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Entrada no Arco DME */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Definindo a Entrada no Arco DME
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-600 dark:text-slate-300">
                  <div>Velocidade Entrada no Arco ({speedUnitLabel(userPrefs.speedUnit)}):</div>
                  <div className="text-[10px] font-normal text-slate-400">Auto da Aeronave</div>
                </label>
                <input
                  type="number"
                  value={fromKnots(effectiveDmeArcSpeedKts, userPrefs.speedUnit, 0)}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({
                      ...p,
                      dmeArcEntrySpeedKts: toKnots(
                        e.target.value === '' ? '' : Number(e.target.value),
                        userPrefs.speedUnit
                      ),
                    }))
                  }
                  placeholder="Ex: 140"
                  className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-center font-mono text-xs font-semibold"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="font-medium text-slate-600 dark:text-slate-300">
                  Raio do Arco DME ({distanceUnitLabel(userPrefs.distanceUnit)}):
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={fromNm(plan.dmeArcRadiusNm, userPrefs.distanceUnit, 1)}
                  onChange={(e) =>
                    onUpdatePlan((p) => ({
                      ...p,
                      dmeArcRadiusNm: toNm(
                        e.target.value === '' ? '' : Number(e.target.value),
                        userPrefs.distanceUnit
                      ),
                    }))
                  }
                  placeholder="Ex: 12"
                  className="w-24 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1 text-center font-mono text-xs font-semibold"
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                  {distanceUnitLabel(userPrefs.distanceUnit)} a Iniciar a Curva:
                </span>
                <span className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {dmeLeadNm !== null
                    ? `${Number(fromNm(dmeLeadNm, userPrefs.distanceUnit, 1)).toFixed(1)} ${distanceUnitLabel(userPrefs.distanceUnit)}`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
