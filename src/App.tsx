import React, { useState, useEffect, useMemo } from 'react';
import {
  Compass,
  Radio,
  Plane,
  BookOpen,
  Sun,
  Moon,
  FolderKanban,
  Save,
  Plus,
  Trash2,
  ShieldCheck,
  Lock,
  LogOut,
  LogIn,
  X,
  RotateCcw,
  Edit3,
  Copy,
  Check,
  Eraser,
} from 'lucide-react';
import rawAerodromes from './data/aerodromes.json';
import {
  DEFAULT_BASE_AIRCRAFT,
  DEFAULT_SAMPLE_FLIGHT_PLAN,
  createBlankFlightPlan,
} from './data/baseAircraft';
import type {
  Aerodrome,
  BaseAircraft,
  ComputedRouteLeg,
  FlightPlan,
  PropulsionType,
  UserAircraftPrefix,
} from './types/aviation';
import {
  computeActiveRunway,
  computeRouteLeg,
  computeTotalsAndFuelReserve,
  findAerodromeByIcao,
  formatAltitudeOrFlightLevel,
  parseDepartureTimeSeconds,
} from './utils/aviationMath';
import {
  auth,
  onAuthStateChanged,
  signInWithGoogle,
  signOutUser,
  fetchUserFlightPlans,
  saveUserFlightPlan,
  deleteUserFlightPlan,
  fetchUserFleet,
  saveUserPrefix,
  deleteUserPrefix,
  fetchUserAerodromes,
  saveUserAerodrome,
  deleteUserAerodrome,
  fetchGlobalAircraftCatalog,
  saveGlobalBaseAircraft,
  deleteGlobalBaseAircraft,
  fetchGlobalCustomAerodromes,
  saveGlobalAerodrome,
  deleteGlobalAerodrome,
  type User,
} from './config/firebase';
import { FlightPlannerTab } from './components/FlightPlannerTab';
import { PhraseologyTab } from './components/PhraseologyTab';
import { FleetAndAerodromesTab } from './components/FleetAndAerodromesTab';
import { ReferenceSummaryTab } from './components/ReferenceSummaryTab';

const LOCAL_STORAGE_KEYS = {
  THEME: 'pb_theme',
  CURRENT_PLAN: 'pb_current_plan',
  SAVED_PLANS: 'pb_saved_plans',
  USER_FLEET: 'pb_user_fleet',
  USER_AERODROMES: 'pb_user_aerodromes',
  BASE_AIRCRAFT: 'pb_base_aircraft',
  ADMIN_SESSION: 'pb_admin_session',
};

export const App: React.FC = () => {
  // --- Theme State ---
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.THEME);
    return saved === 'light' ? 'light' : 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem(LOCAL_STORAGE_KEYS.THEME, theme);
  }, [theme]);

  // --- Navigation Tab ---
  const [activeTab, setActiveTab] = useState<'planner' | 'phraseology' | 'fleet' | 'reference'>(
    'planner'
  );

  // --- Auth & Admin State ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION) === 'true';
  });
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUser, setAdminUser] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminError, setAdminError] = useState('');

  // --- Data State ---
  const [baseAircraftList, setBaseAircraftList] = useState<BaseAircraft[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.BASE_AIRCRAFT);
      return saved ? JSON.parse(saved) : DEFAULT_BASE_AIRCRAFT;
    } catch {
      return DEFAULT_BASE_AIRCRAFT;
    }
  });

  const [userFleet, setUserFleet] = useState<UserAircraftPrefix[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_FLEET);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customAerodromes, setCustomAerodromes] = useState<Aerodrome[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.USER_AERODROMES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [globalExtraAerodromes, setGlobalExtraAerodromes] = useState<Aerodrome[]>([]);

  const sanitizeFlightPlan = (p: FlightPlan): FlightPlan => ({
    ...p,
    callsign: p.callsign === 'GLD1537' ? '' : p.callsign,
    operatorRemark:
      p.operatorRemark && p.operatorRemark.toUpperCase().includes('GOLD')
        ? 'PARTICULAR'
        : p.operatorRemark,
  });

  const [plan, setPlan] = useState<FlightPlan>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PLAN);
      return saved ? sanitizeFlightPlan(JSON.parse(saved)) : DEFAULT_SAMPLE_FLIGHT_PLAN;
    } catch {
      return DEFAULT_SAMPLE_FLIGHT_PLAN;
    }
  });

  const [savedPlans, setSavedPlans] = useState<FlightPlan[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.SAVED_PLANS);
      const parsed: FlightPlan[] = saved ? JSON.parse(saved) : [DEFAULT_SAMPLE_FLIGHT_PLAN];
      return parsed.map(sanitizeFlightPlan);
    } catch {
      return [DEFAULT_SAMPLE_FLIGHT_PLAN];
    }
  });

  const [showPlansModal, setShowPlansModal] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);

  // Persist current plan locally
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CURRENT_PLAN, JSON.stringify(plan));
  }, [plan]);

  // Listen to Firebase Auth state and load user/global data
  useEffect(() => {
    fetchGlobalAircraftCatalog().then((catalog) => {
      if (catalog && catalog.length > 0) {
        setBaseAircraftList(catalog);
        localStorage.setItem(LOCAL_STORAGE_KEYS.BASE_AIRCRAFT, JSON.stringify(catalog));
      }
    });
    fetchGlobalCustomAerodromes().then((list) => {
      if (list.length > 0) {
        setGlobalExtraAerodromes(list);
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const [cloudPlans, cloudFleet, cloudAeros] = await Promise.all([
            fetchUserFlightPlans(user.uid),
            fetchUserFleet(user.uid),
            fetchUserAerodromes(user.uid),
          ]);
          if (cloudPlans.length > 0) {
            const sanitizedPlans = cloudPlans.map(sanitizeFlightPlan);
            setSavedPlans(sanitizedPlans);
            localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_PLANS, JSON.stringify(sanitizedPlans));
          }
          if (cloudFleet.length > 0) {
            const sanitizedFleet = cloudFleet.map((f) => ({
              ...f,
              operatorName:
                !f.operatorName || f.operatorName.toUpperCase().includes('GOLD')
                  ? 'PARTICULAR'
                  : f.operatorName,
            }));
            setUserFleet(sanitizedFleet);
            localStorage.setItem(LOCAL_STORAGE_KEYS.USER_FLEET, JSON.stringify(sanitizedFleet));
          }
          if (cloudAeros.length > 0) {
            setCustomAerodromes(cloudAeros);
            localStorage.setItem(
              LOCAL_STORAGE_KEYS.USER_AERODROMES,
              JSON.stringify(cloudAeros)
            );
          }
        } catch (err) {
          console.warn('Could not load user data from Firestore:', err);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Combined Aerodromes list (custom + global extra + 2,506 built-in aerodromes)
  const allAerodromes = useMemo(() => {
    const map = new Map<string, Aerodrome>();
    for (const a of rawAerodromes as Aerodrome[]) {
      map.set(a.icao.toUpperCase(), a);
    }
    for (const a of globalExtraAerodromes) {
      map.set(a.icao.toUpperCase(), a);
    }
    for (const a of customAerodromes) {
      map.set(a.icao.toUpperCase(), { ...a, isCustom: true });
    }
    return Array.from(map.values());
  }, [customAerodromes, globalExtraAerodromes]);

  const originAerodrome = useMemo(
    () => findAerodromeByIcao(plan.origin.icao, allAerodromes),
    [plan.origin.icao, allAerodromes]
  );
  const destinationAerodrome = useMemo(
    () => findAerodromeByIcao(plan.destination.icao, allAerodromes),
    [plan.destination.icao, allAerodromes]
  );
  const alternateAerodrome = useMemo(
    () => findAerodromeByIcao(plan.alternate.icao, allAerodromes),
    [plan.alternate.icao, allAerodromes]
  );

  // Resolve active aircraft parameters (from either user prefix or base catalog)
  const activeAircraft = useMemo(() => {
    if (plan.selectedAircraftSource === 'prefix' && plan.selectedPrefixId) {
      const pref = userFleet.find((p) => p.id === plan.selectedPrefixId);
      if (pref) {
        const cruiseIas = pref.defaultCruiseIasKts || 110;
        const descentIas = pref.defaultDescentIasKts || Math.round(cruiseIas * 0.9);
        const descentVs = pref.defaultDescentVsFpm || 600;
        return {
          name: `${pref.registration} (${pref.baseAircraftName})`,
          typeIcaoWake: `${pref.aircraftTypeCode}/${pref.icaoCode}/${pref.wakeTurbulence}`,
          performanceCategory: pref.performanceCategory,
          fuelConsumptionLph: pref.fuelConsumptionLph,
          fuelCapacityDisplay: pref.fuelCapacityDisplay,
          emptyWeightKg: pref.emptyWeightKg,
          propulsionType: pref.propulsionType,
          defaultCruiseIasKts: cruiseIas,
          defaultDescentIasKts: descentIas,
          defaultDescentVsFpm: descentVs,
          alternateSpeedKts: pref.alternateSpeedKts || descentIas,
          alternateFuelFlowLph: pref.alternateFuelFlowLph || pref.fuelConsumptionLph,
          climbSpeedKts: pref.climbSpeedKts || Math.round(cruiseIas * 0.75),
          climbVsFpm: pref.climbVsFpm || descentVs,
          climbFuelFlowLph: pref.climbFuelFlowLph || Math.round(pref.fuelConsumptionLph * 1.25),
          descentFuelFlowLph: pref.descentFuelFlowLph || Math.round(pref.fuelConsumptionLph * 0.65),
          fuelType:
            pref.fuelType ||
            (pref.propulsionType === 'Aviões jato' ? 'Jet A-1' : 'Avgas (100LL)'),
          simulator: pref.simulator || 'MSFS',
          minRunwayLengthFt: pref.minRunwayLengthFt ?? 0,
          runwaySurfaceType: pref.runwaySurfaceType || 'Hard and Soft',
        };
      }
    }
    const base =
      baseAircraftList.find((b) => b.id === plan.selectedBaseAircraftId) ||
      baseAircraftList[0] ||
      DEFAULT_BASE_AIRCRAFT[0];
    const cruiseIas = base.defaultCruiseIasKts || 110;
    const descentIas = base.defaultDescentIasKts || Math.round(cruiseIas * 0.9);
    const descentVs = base.defaultDescentVsFpm || 600;
    return {
      name: base.name,
      typeIcaoWake: `${base.aircraftTypeCode}/${base.icaoCode}/${base.wakeTurbulence}`,
      performanceCategory: base.performanceCategory,
      fuelConsumptionLph: base.fuelConsumptionLph,
      fuelCapacityDisplay: base.fuelCapacityDisplay,
      emptyWeightKg: base.emptyWeightKg,
      propulsionType: base.propulsionType as PropulsionType,
      defaultCruiseIasKts: cruiseIas,
      defaultDescentIasKts: descentIas,
      defaultDescentVsFpm: descentVs,
      alternateSpeedKts: base.alternateSpeedKts || descentIas,
      alternateFuelFlowLph: base.alternateFuelFlowLph || base.fuelConsumptionLph,
      climbSpeedKts: base.climbSpeedKts || Math.round(cruiseIas * 0.75),
      climbVsFpm: base.climbVsFpm || descentVs,
      climbFuelFlowLph: base.climbFuelFlowLph || Math.round(base.fuelConsumptionLph * 1.25),
      descentFuelFlowLph: base.descentFuelFlowLph || Math.round(base.fuelConsumptionLph * 0.65),
      fuelType:
        base.fuelType || (base.propulsionType === 'Aviões jato' ? 'Jet A-1' : 'Avgas (100LL)'),
      simulator: base.simulator || 'MSFS',
      minRunwayLengthFt: base.minRunwayLengthFt ?? 0,
      runwaySurfaceType: base.runwaySurfaceType || 'Hard and Soft',
    };
  }, [
    plan.selectedAircraftSource,
    plan.selectedPrefixId,
    plan.selectedBaseAircraftId,
    userFleet,
    baseAircraftList,
  ]);

  // Compute Route Legs (A+B) and Alternate Leg (B+C)
  const departureSeconds = useMemo(
    () => parseDepartureTimeSeconds(plan.departureTimeUtc),
    [plan.departureTimeUtc]
  );

  const computedLegsAB = useMemo(() => {
    const results: ComputedRouteLeg[] = [];
    let runningEtoSeconds: number | null = departureSeconds;

    for (const leg of plan.legs) {
      const effectiveLeg = {
        ...leg,
        iasKts: leg.iasKts !== '' ? leg.iasKts : activeAircraft.defaultCruiseIasKts,
      };
      const comp = computeRouteLeg(
        effectiveLeg,
        runningEtoSeconds,
        departureSeconds,
        activeAircraft.fuelConsumptionLph,
        plan.fuelUnit,
        plan.flightRule,
        plan.origin.transitionAltitudeFt || 6000,
        'AB'
      );
      if (comp.durationMinutes !== null) {
        const legSec = comp.durationMinutes * 60;
        runningEtoSeconds = (runningEtoSeconds ?? 0) + legSec;
      }
      results.push(comp);
    }
    return results;
  }, [
    plan.legs,
    departureSeconds,
    activeAircraft.fuelConsumptionLph,
    activeAircraft.defaultCruiseIasKts,
    plan.fuelUnit,
    plan.flightRule,
    plan.origin.transitionAltitudeFt,
  ]);

  const computedLegBC = useMemo(() => {
    const lastEto =
      computedLegsAB.length > 0
        ? computedLegsAB.reduce(
            (acc, l) => acc + (l.durationMinutes !== null ? l.durationMinutes * 60 : 0),
            departureSeconds ?? 0
          )
        : departureSeconds;

    const effectiveAltLeg = {
      ...plan.alternateLeg,
      iasKts:
        plan.alternateLeg.iasKts !== ''
          ? plan.alternateLeg.iasKts
          : activeAircraft.alternateSpeedKts,
    };

    return computeRouteLeg(
      effectiveAltLeg,
      lastEto,
      departureSeconds,
      activeAircraft.alternateFuelFlowLph,
      plan.fuelUnit,
      plan.flightRule,
      plan.destination.transitionAltitudeFt || 6000,
      'BC'
    );
  }, [
    plan.alternateLeg,
    computedLegsAB,
    departureSeconds,
    activeAircraft.alternateFuelFlowLph,
    activeAircraft.alternateSpeedKts,
    plan.fuelUnit,
    plan.flightRule,
    plan.destination.transitionAltitudeFt,
  ]);

  const totals = useMemo(
    () =>
      computeTotalsAndFuelReserve(
        computedLegsAB,
        computedLegBC,
        plan.flightRule,
        plan.flightPeriod,
        plan.groundContingency
      ),
    [computedLegsAB, computedLegBC, plan.flightRule, plan.flightPeriod, plan.groundContingency]
  );

  // Gross Weight (GW) in kg (matching GP!G22)
  const grossWeightKg = useMemo(() => {
    if (!activeAircraft.emptyWeightKg) return null;
    // Convert total fuel with reserve to kg if needed
    let fuelKg = totals.totalFuelWithReserve;
    if (plan.fuelUnit === 'Litros (L)') {
      fuelKg = totals.totalFuelWithReserve * 0.72;
    } else if (plan.fuelUnit === 'Pounds (lbs)') {
      fuelKg = totals.totalFuelWithReserve / 2.20462262;
    } else if (plan.fuelUnit === 'Galão (Gal)') {
      fuelKg = (totals.totalFuelWithReserve / 0.264172052) * 0.72;
    }
    const crewTotal = (plan.crewCount || 0) * (plan.AverageCrewWeightKg || 0);
    return crewTotal + (plan.cargoWeightKg || 0) + activeAircraft.emptyWeightKg + fuelKg;
  }, [
    activeAircraft.emptyWeightKg,
    totals.totalFuelWithReserve,
    plan.fuelUnit,
    plan.crewCount,
    plan.AverageCrewWeightKg,
    plan.cargoWeightKg,
  ]);

  // Predominant cruising altitude for Phraseology (matching GP!AV44:AY61 mode / highest frequency altitude)
  const predominantAltitudeCode = useMemo(() => {
    const validFeet = computedLegsAB
      .map((l) => l.altitudeFeet)
      .filter((ft): ft is number => ft !== null && ft > 0);

    if (validFeet.length > 0) {
      // Sort descending so ties prefer the higher cruising altitude (like LARGE in GP!AV44:AV59)
      const sortedDesc = [...validFeet].sort((a, b) => b - a);
      const counts = new Map<number, number>();
      for (const ft of sortedDesc) {
        counts.set(ft, (counts.get(ft) || 0) + 1);
      }
      let modeFt = sortedDesc[0];
      let maxCount = 0;
      for (const ft of sortedDesc) {
        const count = counts.get(ft) || 0;
        if (count > maxCount) {
          maxCount = count;
          modeFt = ft;
        }
      }
      return formatAltitudeOrFlightLevel(modeFt, plan.origin.transitionAltitudeFt).code;
    }

    const fallbackCruiseFt = Number(plan.descentCruiseAltitudeFt);
    if (Number.isFinite(fallbackCruiseFt) && fallbackCruiseFt > 0) {
      return formatAltitudeOrFlightLevel(fallbackCruiseFt, plan.origin.transitionAltitudeFt).code;
    }

    return '';
  }, [computedLegsAB, plan.descentCruiseAltitudeFt, plan.origin.transitionAltitudeFt]);

  const originActiveRunway = useMemo(
    () =>
      computeActiveRunway(
        originAerodrome?.runway1 || '',
        originAerodrome?.runway2 || '',
        plan.origin.metarWindDirection,
        plan.origin.magneticDeclination
      ).activeRunway,
    [
      originAerodrome,
      plan.origin.metarWindDirection,
      plan.origin.magneticDeclination,
    ]
  );

  const destinationActiveRunway = useMemo(
    () =>
      computeActiveRunway(
        destinationAerodrome?.runway1 || '',
        destinationAerodrome?.runway2 || '',
        plan.destination.metarWindDirection,
        plan.destination.magneticDeclination
      ).activeRunway,
    [
      destinationAerodrome,
      plan.destination.metarWindDirection,
      plan.destination.magneticDeclination,
    ]
  );

  // --- State for inline renaming a saved flight plan in the modal ---
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editingPlanTitle, setEditingPlanTitle] = useState('');

  // --- Handlers for Saving / Loading / Editing / Resetting Plans ---
  const buildPlanTitle = (p: FlightPlan): string => {
    if (p.title && p.title.trim()) return p.title.trim();
    const orig = p.origin.icao.trim() || 'ORIG';
    const dest = p.destination.icao.trim() || 'DEST';
    const cs = p.callsign.trim() ? ` (${p.callsign.trim()})` : '';
    return `${orig} → ${dest}${cs}`;
  };

  const handleSaveCurrentPlan = async () => {
    const updated: FlightPlan = {
      ...plan,
      title: buildPlanTitle(plan),
      updatedAt: new Date().toISOString(),
    };
    setPlan(updated);
    const nextList = [updated, ...savedPlans.filter((p) => p.id !== updated.id)];
    setSavedPlans(nextList);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_PLANS, JSON.stringify(nextList));

    if (currentUser) {
      try {
        await saveUserFlightPlan(currentUser.uid, updated);
      } catch (err) {
        console.warn('Error saving flight plan to Firestore:', err);
      }
    }
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleSaveAsNewPlan = async () => {
    const baseTitle = buildPlanTitle(plan);
    const created: FlightPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
      title: `${baseTitle} (Novo)`,
      updatedAt: new Date().toISOString(),
    };
    setPlan(created);
    const nextList = [created, ...savedPlans];
    setSavedPlans(nextList);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_PLANS, JSON.stringify(nextList));

    if (currentUser) {
      try {
        await saveUserFlightPlan(currentUser.uid, created);
      } catch (err) {
        console.warn('Error saving new flight plan to Firestore:', err);
      }
    }
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2000);
  };

  const handleDuplicateSavedPlan = async (targetPlan: FlightPlan) => {
    const duplicated: FlightPlan = {
      ...targetPlan,
      id: `plan-${Date.now()}`,
      title: `${buildPlanTitle(targetPlan)} (Cópia)`,
      updatedAt: new Date().toISOString(),
    };
    const nextList = [duplicated, ...savedPlans];
    setSavedPlans(nextList);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_PLANS, JSON.stringify(nextList));

    if (currentUser) {
      try {
        await saveUserFlightPlan(currentUser.uid, duplicated);
      } catch (err) {
        console.warn('Error saving duplicated plan to Firestore:', err);
      }
    }
  };

  const handleRenameSavedPlan = async (targetPlan: FlightPlan, newTitle: string) => {
    const trimmed = newTitle.trim() || buildPlanTitle(targetPlan);
    const updated: FlightPlan = {
      ...targetPlan,
      title: trimmed,
      updatedAt: new Date().toISOString(),
    };
    const nextList = savedPlans.map((p) => (p.id === updated.id ? updated : p));
    setSavedPlans(nextList);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_PLANS, JSON.stringify(nextList));
    if (plan.id === updated.id) {
      setPlan((prev) => ({ ...prev, title: trimmed }));
    }
    setEditingPlanId(null);
    setEditingPlanTitle('');

    if (currentUser) {
      try {
        await saveUserFlightPlan(currentUser.uid, updated);
      } catch (err) {
        console.warn('Error renaming plan in Firestore:', err);
      }
    }
  };

  const handleResetAllFields = () => {
    const blank = createBlankFlightPlan();
    setPlan(blank);
    setShowPlansModal(false);
  };

  const handleDeletePlan = async (id: string) => {
    const nextList = savedPlans.filter((p) => p.id !== id);
    setSavedPlans(nextList);
    localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_PLANS, JSON.stringify(nextList));
    if (editingPlanId === id) {
      setEditingPlanId(null);
    }
    if (currentUser) {
      try {
        await deleteUserFlightPlan(currentUser.uid, id);
      } catch (err) {
        console.warn('Error deleting plan from Firestore:', err);
      }
    }
  };

  // --- Handlers for Fleet & Aerodromes ---
  const handleSaveUserPrefix = async (prefix: UserAircraftPrefix) => {
    const next = [prefix, ...userFleet.filter((p) => p.id !== prefix.id)];
    setUserFleet(next);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_FLEET, JSON.stringify(next));
    if (currentUser) {
      try {
        await saveUserPrefix(currentUser.uid, prefix);
      } catch (err) {
        console.warn('Error saving user prefix to Firestore:', err);
      }
    }
  };

  const handleDeleteUserPrefix = async (id: string) => {
    const next = userFleet.filter((p) => p.id !== id);
    setUserFleet(next);
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_FLEET, JSON.stringify(next));
    if (currentUser) {
      try {
        await deleteUserPrefix(currentUser.uid, id);
      } catch (err) {
        console.warn('Error deleting user prefix from Firestore:', err);
      }
    }
  };

  const handleSaveBaseAircraft = async (aircraft: BaseAircraft) => {
    if (!isAdmin) return;
    const next = [
      ...baseAircraftList.filter((b) => b.id !== aircraft.id),
      aircraft,
    ];
    setBaseAircraftList(next);
    localStorage.setItem(LOCAL_STORAGE_KEYS.BASE_AIRCRAFT, JSON.stringify(next));
    try {
      await saveGlobalBaseAircraft(aircraft);
    } catch (err) {
      console.warn('Error saving global base aircraft to Firestore:', err);
    }
  };

  const handleDeleteBaseAircraft = async (id: string) => {
    if (!isAdmin) return;
    const next = baseAircraftList.filter((b) => b.id !== id);
    setBaseAircraftList(next);
    localStorage.setItem(LOCAL_STORAGE_KEYS.BASE_AIRCRAFT, JSON.stringify(next));
    try {
      await deleteGlobalBaseAircraft(id);
    } catch (err) {
      console.warn('Error deleting global base aircraft from Firestore:', err);
    }
  };

  const handleSaveAerodrome = async (aerodrome: Aerodrome, isGlobal: boolean) => {
    if (isGlobal && isAdmin) {
      const next = [
        ...globalExtraAerodromes.filter((a) => a.icao !== aerodrome.icao),
        aerodrome,
      ];
      setGlobalExtraAerodromes(next);
      try {
        await saveGlobalAerodrome(aerodrome);
      } catch (err) {
        console.warn('Error saving global aerodrome:', err);
      }
    } else {
      const next = [
        ...customAerodromes.filter((a) => a.icao !== aerodrome.icao),
        { ...aerodrome, isCustom: true },
      ];
      setCustomAerodromes(next);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER_AERODROMES, JSON.stringify(next));
      if (currentUser) {
        try {
          await saveUserAerodrome(currentUser.uid, aerodrome);
        } catch (err) {
          console.warn('Error saving custom aerodrome:', err);
        }
      }
    }
  };

  const handleDeleteAerodrome = async (icao: string, isGlobal: boolean) => {
    if (isGlobal && isAdmin) {
      setGlobalExtraAerodromes((prev) => prev.filter((a) => a.icao !== icao));
      try {
        await deleteGlobalAerodrome(icao);
      } catch (err) {
        console.warn('Error deleting global aerodrome:', err);
      }
    } else {
      const next = customAerodromes.filter((a) => a.icao !== icao);
      setCustomAerodromes(next);
      localStorage.setItem(LOCAL_STORAGE_KEYS.USER_AERODROMES, JSON.stringify(next));
      if (currentUser) {
        try {
          await deleteUserAerodrome(currentUser.uid, icao);
        } catch (err) {
          console.warn('Error deleting custom aerodrome:', err);
        }
      }
    }
  };

  // --- Admin Login Handler (`pbadmin` / `PBAdmin2026@`) ---
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminUser.trim() === 'pbadmin' && adminPass === 'PBAdmin2026@') {
      setIsAdmin(true);
      sessionStorage.setItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION, 'true');
      setShowAdminModal(false);
      setAdminUser('');
      setAdminPass('');
      setAdminError('');
    } else {
      setAdminError('Usuário ou senha de administrador inválidos.');
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(
        msg.includes('unauthorized-domain')
          ? 'Domínio ainda não autorizado no Console do Firebase (Authentication > Settings > Authorized domains).'
          : 'Não foi possível concluir o login com Google. Verifique se o provedor Google está ativo no Console do Firebase.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* Brand Logo (matches horizontal lockup + vector emblem) */}
          <div className="flex items-center gap-3.5">
            <img
              src="/favicon.svg"
              alt="PB Flight Planner Logo"
              className="h-12 w-12 shrink-0 rounded-xl shadow-md shadow-sky-950/50 ring-1 ring-slate-700/50"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                  <span className="text-[#29ABE2] dark:text-[#38BDF8]">PB</span>{' '}
                  <span>FLIGHT PLANNER</span>
                </h1>
                <span className="rounded-md bg-sky-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-600 dark:text-sky-400">
                  VFR &amp; IFR • DECEA
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                <span className="inline-block h-[2px] w-5 rounded-full bg-[#29ABE2]" />
                <span className="font-mono font-semibold uppercase tracking-[0.26em] text-slate-500 dark:text-slate-400">
                  EFB &amp; NAVIGATION
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  Uso exclusivo para simulação aérea
                </span>
              </div>
            </div>
          </div>

          {/* Main Navigation Tabs */}
          <nav className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'planner'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>Planejamento (GP)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('phraseology')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'phraseology'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Radio className="h-4 w-4" />
              <span>Fraseologia</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('fleet')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'fleet'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Plane className="h-4 w-4" />
              <span>Frota & Aeródromos</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('reference')}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                activeTab === 'reference'
                  ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Resumo & Tabelas</span>
            </button>
          </nav>

          {/* Right Action Controls: Reset, Save Plan, My Flights, Admin, Theme, Google Auth */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleResetAllFields}
              title="Limpar e resetar todos os campos do planejamento atual"
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 transition hover:bg-rose-500/20"
            >
              <Eraser className="h-3.5 w-3.5" />
              <span>Limpar Campos</span>
            </button>

            <button
              type="button"
              onClick={handleSaveCurrentPlan}
              className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saveFeedback ? 'Salvo!' : 'Salvar Voo'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPlansModal(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-500"
            >
              <FolderKanban className="h-3.5 w-3.5 text-sky-500" />
              <span>Meus Voos ({savedPlans.length})</span>
            </button>

            {/* Admin Toggle Button */}
            {isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setIsAdmin(false);
                  sessionStorage.removeItem(LOCAL_STORAGE_KEYS.ADMIN_SESSION);
                }}
                title="Sair do modo Admin"
                className="flex items-center gap-1 rounded-xl bg-amber-500/15 px-2.5 py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
              >
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAdminModal(true)}
                title="Acesso Administrativo"
                className="rounded-xl border border-slate-300 dark:border-slate-700 p-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <Lock className="h-4 w-4" />
              </button>
            )}

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Mudar para Tema Claro' : 'Mudar para Tema Escuro'}
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 text-slate-700 dark:text-amber-400 hover:border-sky-500"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* Google Auth */}
            {currentUser ? (
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 pl-2 pr-2.5 py-1">
                {currentUser.photoURL && (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Piloto'}
                    className="h-6 w-6 rounded-full"
                  />
                )}
                <span className="max-w-[110px] truncate text-xs font-semibold">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  title="Sair da conta Google"
                  className="text-slate-400 hover:text-rose-500"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-500"
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Entrar com Google</span>
              </button>
            )}
          </div>
        </div>

        {authError && (
          <div className="border-t border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-700 dark:text-amber-300">
            {authError}
            <button
              type="button"
              onClick={() => setAuthError(null)}
              className="ml-3 font-bold underline"
            >
              Fechar
            </button>
          </div>
        )}
      </header>

      {/* Main Content Container */}
      <main className="mx-auto max-w-[1600px] px-4 py-6">
        {activeTab === 'planner' && (
          <FlightPlannerTab
            plan={plan}
            onUpdatePlan={setPlan}
            onResetPlan={handleResetAllFields}
            aerodromes={allAerodromes}
            baseAircraftList={baseAircraftList}
            userFleet={userFleet}
            originAerodrome={originAerodrome}
            destinationAerodrome={destinationAerodrome}
            alternateAerodrome={alternateAerodrome}
            activeAircraft={activeAircraft}
            computedLegsAB={computedLegsAB}
            computedLegBC={computedLegBC}
            totals={totals}
            grossWeightKg={grossWeightKg}
          />
        )}

        {activeTab === 'phraseology' && (
          <PhraseologyTab
            plan={plan}
            originAerodrome={originAerodrome}
            destinationAerodrome={destinationAerodrome}
            alternateAerodrome={alternateAerodrome}
            originActiveRunway={originActiveRunway}
            destinationActiveRunway={destinationActiveRunway}
            predominantAltitudeCode={predominantAltitudeCode}
            totalEnduranceFormatted={totals.totalEnduranceFormatted}
          />
        )}

        {activeTab === 'fleet' && (
          <FleetAndAerodromesTab
            baseAircraftList={baseAircraftList}
            userFleet={userFleet}
            aerodromes={allAerodromes}
            isAdmin={isAdmin}
            isAuthenticated={Boolean(currentUser)}
            onSaveUserPrefix={handleSaveUserPrefix}
            onDeleteUserPrefix={handleDeleteUserPrefix}
            onSelectAircraftForPlan={(source, id) => {
              setPlan((prev) => ({
                ...prev,
                selectedAircraftSource: source,
                ...(source === 'prefix'
                  ? { selectedPrefixId: id }
                  : { selectedBaseAircraftId: id }),
              }));
              setActiveTab('planner');
            }}
            onSaveBaseAircraft={handleSaveBaseAircraft}
            onDeleteBaseAircraft={handleDeleteBaseAircraft}
            onSaveAerodrome={handleSaveAerodrome}
            onDeleteAerodrome={handleDeleteAerodrome}
            onOpenAdminModal={() => setShowAdminModal(true)}
          />
        )}

        {activeTab === 'reference' && <ReferenceSummaryTab />}
      </main>

      {/* Saved Flight Plans Modal */}
      {showPlansModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setShowPlansModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Meus Planejamentos de Voo
                </h3>
                <p className="text-xs text-slate-500">
                  {currentUser
                    ? `Sincronizado na conta Google (${currentUser.email})`
                    : 'Salvos localmente neste navegador (faça login com Google para salvar na nuvem)'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPlansModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleResetAllFields}
                className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500"
              >
                <Plus className="h-4 w-4" />
                <span>Novo Planejamento (Limpar Tudo)</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAsNewPlan}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
              >
                <Save className="h-4 w-4" />
                <span>Salvar Atual como Novo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlan({
                    ...DEFAULT_SAMPLE_FLIGHT_PLAN,
                    id: `sample-${Date.now()}`,
                    updatedAt: new Date().toISOString(),
                  });
                  setShowPlansModal(false);
                }}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Carregar Exemplo (SBMT → SDAM)</span>
              </button>
            </div>

            {savedPlans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 py-10 text-center">
                <FolderKanban className="mx-auto h-8 w-8 text-slate-400" />
                <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                  Nenhum planejamento de voo salvo.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Preencha os dados na tela principal e clique em "Salvar Voo" no topo para guardar seus planejamentos.
                </p>
              </div>
            ) : (
              <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
                {savedPlans.map((sp) => {
                  const isEditingThisTitle = editingPlanId === sp.id;
                  const isActivePlan = sp.id === plan.id;

                  return (
                    <div
                      key={sp.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition ${
                        isActivePlan
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-sky-600 dark:text-sky-400">
                            {sp.origin.icao || '----'} → {sp.destination.icao || '----'}{' '}
                            {sp.alternate.icao ? `(Alt: ${sp.alternate.icao})` : ''}
                          </span>
                          <span className="rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                            {sp.callsign || 'SEM CALLSIGN'} • {sp.flightRule}
                          </span>
                          {isActivePlan && (
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                              Aberto no Painel
                            </span>
                          )}
                        </div>

                        {isEditingThisTitle ? (
                          <div className="mt-2 flex items-center gap-1.5">
                            <input
                              type="text"
                              autoFocus
                              value={editingPlanTitle}
                              onChange={(e) => setEditingPlanTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSavedPlan(sp, editingPlanTitle);
                                if (e.key === 'Escape') setEditingPlanId(null);
                              }}
                              className="w-full max-w-xs rounded-lg border border-sky-500 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs font-semibold focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleRenameSavedPlan(sp, editingPlanTitle)}
                              className="rounded-lg bg-emerald-600 p-1.5 text-white hover:bg-emerald-500"
                              title="Confirmar novo nome"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingPlanId(null)}
                              className="rounded-lg border border-slate-300 dark:border-slate-700 p-1.5 text-slate-500"
                              title="Cancelar"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                              {sp.title || 'Planejamento sem título'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPlanId(sp.id);
                                setEditingPlanTitle(sp.title || buildPlanTitle(sp));
                              }}
                              className="rounded p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-sky-500"
                              title="Renomear este planejamento"
                            >
                              <Edit3 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setPlan(sp);
                            setActiveTab('planner');
                            setShowPlansModal(false);
                          }}
                          className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
                          title="Carregar este voo no painel para visualizar ou editar"
                        >
                          {isActivePlan ? 'Editar' : 'Abrir / Editar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateSavedPlan(sp)}
                          className="rounded-lg border border-slate-300 dark:border-slate-700 p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          title="Duplicar planejamento"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePlan(sp.id)}
                          className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-1.5 text-rose-500 hover:bg-rose-500/20"
                          title="Apagar este voo salvo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
          onClick={() => setShowAdminModal(false)}
        >
          <form
            onSubmit={handleAdminSubmit}
            className="w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Acesso Exclusivo Admin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              Desbloqueia criação, edição e exclusão no Catálogo Global de Aeronaves Base e Aeródromos.
            </p>
            {adminError && (
              <div className="mb-3 rounded-lg bg-rose-500/15 p-2 text-xs font-medium text-rose-500">
                {adminError}
              </div>
            )}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-300">
                  Usuário Admin
                </label>
                <input
                  type="text"
                  required
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  placeholder="Usuário Admin"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-600 dark:text-slate-300">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-1 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-500"
              >
                Entrar como Admin
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
