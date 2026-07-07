import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; 
import { getFunctions } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Inicialização segura
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// CONFIGURANDO DATABASE ID DO AMBIENTE ATUAL
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || 'ai-studio-4551b9d4-cbf8-4a88-96e4-47c6d55b185b');

let storageInstance: any = null;

export const getFirebaseStorage = () => {
  if (!storageInstance) {
    try {
      storageInstance = getStorage(app);
    } catch (error) {
      console.warn("⚠️ Firebase Storage service is not available. Ensure it is enabled in your Firebase project.", error);
    }
  }
  return storageInstance;
};

export { ref, uploadBytes, getDownloadURL };

export const functions = getFunctions(app, "southamerica-east1");
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginAnonymously = async () => {
  try {
    return await signInAnonymously(auth);
  } catch (error: any) {
    if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
      console.warn("Autenticação Anônima desabilitada (auth/admin-restricted-operation). Seguindo sem usuário autenticado.");
      return null;
    }
    throw error;
  }
};
export const logout = () => signOut(auth);

// Exportação do tipo de operação
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Handler de erro unificado
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    userId: auth.currentUser?.uid,
    operationType,
    path
  };
  console.error('🔥 Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}