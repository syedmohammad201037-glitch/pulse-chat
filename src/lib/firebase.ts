import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

// Configuration provided in the user's instructions
const userFirebaseConfig = {
  apiKey: "AIzaSyDmUtzxYMLeF4lamqdMK-xE9cSW0Ju7iHg",
  authDomain: "chattingapp-363a8.firebaseapp.com",
  projectId: "chattingapp-363a8",
  storageBucket: "chattingapp-363a8.firebasestorage.app",
  messagingSenderId: "452277007725",
  appId: "1:452277007725:web:19af8e977f58248fcad664",
  measurementId: "G-HZEEVGDN3Y"
};

const app = initializeApp(userFirebaseConfig);

// Auto-fallback to long polling when WebSocket/streaming is blocked (some ISPs, proxies, school/office networks).
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Security-Audit Error-Handling Wrapper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
        displayName: provider.displayName,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
