import * as FileSystem from 'expo-file-system/legacy';

const SESSION_FILE = `${FileSystem.documentDirectory}supervisor-session.json`;

export type SupervisorSession = {
  supervisorId: string;
  name: string;
  loggedInAt: string;
};

const VALID_SUPERVISOR_ID = 'NHAI-SUP-001';
const VALID_PIN = '1234';

/** Session lives in memory only — fresh login every app launch */
let activeSession: SupervisorSession | null = null;

/** Clear any old persisted session from earlier builds */
export async function resetAuthOnLaunch(): Promise<void> {
  activeSession = null;
  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE);
    if (info.exists) {
      await FileSystem.deleteAsync(SESSION_FILE, { idempotent: true });
    }
  } catch {
    /* ignore */
  }
}

export async function isLoggedIn(): Promise<boolean> {
  return activeSession !== null;
}

export async function getSession(): Promise<SupervisorSession | null> {
  return activeSession;
}

export async function loginSupervisor(
  supervisorId: string,
  pin: string
): Promise<{ ok: true; session: SupervisorSession } | { ok: false; message: string }> {
  const id = supervisorId.trim().toUpperCase();
  const code = pin.trim();

  if (!id || !code) {
    return { ok: false, message: 'Enter Supervisor ID and PIN.' };
  }

  if (id === VALID_SUPERVISOR_ID && code === VALID_PIN) {
    const session: SupervisorSession = {
      supervisorId: id,
      name: 'NHAI Supervisor',
      loggedInAt: new Date().toISOString(),
    };
    activeSession = session;
    return { ok: true, session };
  }

  return { ok: false, message: 'Wrong ID or PIN.' };
}

export async function logoutSupervisor(): Promise<void> {
  activeSession = null;
}
