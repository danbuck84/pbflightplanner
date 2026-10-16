export type FuelUnit = 'Kilogramas (kg)' | 'Litros (L)' | 'Galão (Gal)' | 'Pounds (lbs)';
export type FlightRule = 'VFR' | 'IFR';
export type FlightPeriod = 'Diurno' | 'Noturno';
export type PropulsionType = 'Aviões hélice' | 'Aviões jato' | 'Helicópteros';
export type PerformanceCategory = 'A' | 'B' | 'C' | 'D' | 'E';
export type WakeTurbulenceCategory = 'L' | 'M' | 'H' | 'J';

export interface Aerodrome {
  icao: string;
  name: string;
  city: string;
  elevationMeters: number;
  elevationFeet: number;
  runway1: string;
  runway2: string;
  isCustom?: boolean;
}

export type RunwaySurfaceType = 'Hard and Soft' | 'Hard only' | 'Soft only' | 'Water';
export type AircraftFuelType = 'Avgas (100LL)' | 'Jet A-1';

export interface BaseAircraft {
  id: string;
  name: string;
  aircraftTypeCode: string; // e.g., 'L' (Landplane) or 'H' (Helicopter)
  icaoCode: string;         // e.g., 'C172', 'PC12', 'B738'
  wakeTurbulence: WakeTurbulenceCategory;
  performanceCategory: PerformanceCategory;
  fuelConsumptionLph: number; // Cruise fuel flow in Liters per hour
  fuelCapacityDisplay: string;
  emptyWeightKg: number;
  propulsionType: PropulsionType;
  defaultCruiseIasKts: number;
  defaultDescentIasKts: number;
  defaultDescentVsFpm: number;
  // Little Navmap Extended Performance Profile fields
  simulator?: string;
  minRunwayLengthFt?: number;
  runwaySurfaceType?: RunwaySurfaceType;
  fuelType?: AircraftFuelType;
  usableFuelLiters?: number;
  reserveFuelLiters?: number;
  taxiFuelLiters?: number;
  extraFuelLiters?: number;
  contingencyPercent?: number;
  climbSpeedKts?: number;
  climbVsFpm?: number;
  climbFuelFlowLph?: number;
  descentFuelFlowLph?: number;
  alternateSpeedKts?: number;
  alternateFuelFlowLph?: number;
  operatorName?: string;
  notes?: string;
}

export interface UserAircraftPrefix {
  id: string;
  registration: string;     // e.g., 'PR-DAN', 'PS-PBV'
  baseAircraftId: string;
  baseAircraftName: string;
  aircraftTypeCode: string;
  icaoCode: string;
  wakeTurbulence: WakeTurbulenceCategory;
  performanceCategory: PerformanceCategory;
  fuelConsumptionLph: number;
  fuelCapacityDisplay: string;
  emptyWeightKg: number;
  propulsionType: PropulsionType;
  defaultCruiseIasKts: number;
  defaultDescentIasKts: number;
  defaultDescentVsFpm: number;
  operatorName: string;
  notes?: string;
  // Little Navmap Extended Performance Profile fields
  simulator?: string;
  minRunwayLengthFt?: number;
  runwaySurfaceType?: RunwaySurfaceType;
  fuelType?: AircraftFuelType;
  usableFuelLiters?: number;
  reserveFuelLiters?: number;
  taxiFuelLiters?: number;
  extraFuelLiters?: number;
  contingencyPercent?: number;
  climbSpeedKts?: number;
  climbVsFpm?: number;
  climbFuelFlowLph?: number;
  descentFuelFlowLph?: number;
  alternateSpeedKts?: number;
  alternateFuelFlowLph?: number;
}

export interface ChartChecklist {
  col1: boolean; // VFR: WAC | IFR: ERC
  col2: boolean; // VFR: VAC | IFR: ADC
  col3: boolean; // VFR: ADC | IFR: PDC
  col4: boolean; // VFR: PDC | IFR: SID
  col5: boolean; // VFR: REA/H | IFR: STAR
}

export interface AerodromePlanningConfig {
  icao: string;
  transitionAltitudeFt: number | '';
  charts: ChartChecklist;
  metar: string;
  taf: string;
  metarWindDirection: number | '';
  metarWindSpeedKts: number | '';
  magneticDeclination: number | '';
  qnhHpa: number | '';
  qnhPolInput: number | '';
  vacTrafficPatternAltitudeFt: number | '';
}

export interface RouteLeg {
  id: string;
  origin: string;
  waypoint: string;
  distanceNm: number | '';
  magneticCourse: number | '';
  iasKts: number | '';
  altitudeInput: string; // e.g., '3200', '4000', 'A035', 'FL055'
  isReaCorridor: boolean;
  windDirection: number | '';
  windSpeedKts: number | '';
  notes: string;
  isAlternateLeg?: boolean;
}

export interface ComputedRouteLeg extends RouteLeg {
  altitudeFeet: number | null;
  flightLevelPrefix: 'A' | 'F' | '';
  speedOfSoundKts: number | null;
  mach: number | null;
  semicircularRule: 'PAR' | 'ÍMPAR' | '';
  tasKts: number | null;
  magneticHeading: number | null;
  groundSpeedKts: number | null;
  groundSpeedKnotsPerMin: number | null;
  durationDays: number | null; // Excel fraction of day
  durationMinutes: number | null;
  durationFormatted: string;
  etoFormatted: string;
  fuelRequired: number | null;
  altitudeStatus: 'OK' | 'NOK' | 'REA/H' | 'TA?' | '';
  segmentType: 'AB' | 'BC';
}

export interface FlightPlan {
  id: string;
  title: string;
  updatedAt: string;
  callsign: string;
  departureTimeUtc: string; // e.g., '1108' or '11:08'
  origin: AerodromePlanningConfig;
  destination: AerodromePlanningConfig;
  alternate: AerodromePlanningConfig;
  selectedAircraftSource: 'base' | 'prefix';
  selectedBaseAircraftId: string;
  selectedPrefixId: string;
  fuelUnit: FuelUnit;
  crewCount: number;
  AverageCrewWeightKg: number;
  cargoWeightKg: number;
  flightRule: FlightRule;
  flightPeriod: FlightPeriod;
  groundContingency: boolean;
  operatorRemark: string;
  legs: RouteLeg[];
  alternateLeg: RouteLeg;
  // Section 7 Descent & DME Arc parameters
  descentCruiseAltitudeFt: number | '';
  descentVerticalSpeedFpm: number | '';
  descentSpeedKts: number | '';
  alternateDescentCruiseAltitudeFt: number | '';
  alternateDescentVerticalSpeedFpm: number | '';
  alternateDescentSpeedKts: number | '';
  dmeArcEntrySpeedKts: number | '';
  dmeArcRadiusNm: number | '';
  // Phraseology optional extra fields
  parkingStand?: string;
  departureFreqGround?: string;
  departureFreqTower?: string;
  departureFreqApp?: string;
  enrouteCenterName?: string;
  enrouteFreqCenter?: string;
  arrivalFreqApp?: string;
  arrivalFreqTower?: string;
  arrivalFreqGround?: string;
  sidOrExitProfile?: string;
  starOrApproachProfile?: string;
  transponderCode?: string;
}
