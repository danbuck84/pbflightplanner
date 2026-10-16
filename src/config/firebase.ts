import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import type {
  Aerodrome,
  BaseAircraft,
  FlightPlan,
  UserAircraftPrefix,
} from '../types/aviation';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCB6Uli_lEMOGxACK6VxRQiACrZH4UDLM0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pb-flightplanner.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pb-flightplanner',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pb-flightplanner.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1008331908989',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1008331908989:web:95c767346ddc45d7bb4e14',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-R7C9VLXVD8',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  try {
    await setDoc(
      doc(db, 'users', user.uid),
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('Could not sync user profile document to Firestore:', err);
  }
  return user;
}

export async function signOutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export { onAuthStateChanged, type User };

// --- User Flight Plans ---
export async function fetchUserFlightPlans(uid: string): Promise<FlightPlan[]> {
  const q = query(collection(db, 'users', uid, 'flightPlans'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  const plans: FlightPlan[] = [];
  snap.forEach((d) => plans.push(d.data() as FlightPlan));
  return plans;
}

export async function saveUserFlightPlan(uid: string, plan: FlightPlan): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'flightPlans', plan.id), plan);
}

export async function deleteUserFlightPlan(uid: string, planId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'flightPlans', planId));
}

// --- User Private Aircraft Prefixes (Fleet) ---
export async function fetchUserFleet(uid: string): Promise<UserAircraftPrefix[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'fleet'));
  const fleet: UserAircraftPrefix[] = [];
  snap.forEach((d) => fleet.push(d.data() as UserAircraftPrefix));
  return fleet;
}

export async function saveUserPrefix(uid: string, prefix: UserAircraftPrefix): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'fleet', prefix.id), prefix);
}

export async function deleteUserPrefix(uid: string, prefixId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'fleet', prefixId));
}

// --- User Private Aerodromes ---
export async function fetchUserAerodromes(uid: string): Promise<Aerodrome[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'customAerodromes'));
  const list: Aerodrome[] = [];
  snap.forEach((d) => list.push(d.data() as Aerodrome));
  return list;
}

export async function saveUserAerodrome(uid: string, aerodrome: Aerodrome): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'customAerodromes', aerodrome.icao.toUpperCase()), {
    ...aerodrome,
    isCustom: true,
  });
}

export async function deleteUserAerodrome(uid: string, icao: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'customAerodromes', icao.toUpperCase()));
}

// --- Global Base Aircraft Catalog (Admin managed) ---
export async function fetchGlobalAircraftCatalog(): Promise<BaseAircraft[] | null> {
  try {
    const snap = await getDocs(collection(db, 'catalog_aircraft'));
    if (snap.empty) return null;
    const list: BaseAircraft[] = [];
    snap.forEach((d) => list.push(d.data() as BaseAircraft));
    return list;
  } catch {
    return null;
  }
}

export async function saveGlobalBaseAircraft(aircraft: BaseAircraft): Promise<void> {
  await setDoc(doc(db, 'catalog_aircraft', aircraft.id), aircraft);
}

export async function deleteGlobalBaseAircraft(aircraftId: string): Promise<void> {
  await deleteDoc(doc(db, 'catalog_aircraft', aircraftId));
}

// --- Global Custom Aerodromes Catalog (Admin managed) ---
export async function fetchGlobalCustomAerodromes(): Promise<Aerodrome[]> {
  try {
    const snap = await getDocs(collection(db, 'catalog_aerodromes'));
    const list: Aerodrome[] = [];
    snap.forEach((d) => list.push(d.data() as Aerodrome));
    return list;
  } catch {
    return [];
  }
}

export async function saveGlobalAerodrome(aerodrome: Aerodrome): Promise<void> {
  await setDoc(doc(db, 'catalog_aerodromes', aerodrome.icao.toUpperCase()), aerodrome);
}

export async function deleteGlobalAerodrome(icao: string): Promise<void> {
  await deleteDoc(doc(db, 'catalog_aerodromes', icao.toUpperCase()));
}
