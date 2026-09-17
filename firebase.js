import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Substitua com as suas credenciais reais do Firebase se necessário
const firebaseConfig = {
  apiKey: "AIzaSyDmB57KvZJGpPiUj9GbAfUCtduNlkK7_nY",
  authDomain: "eduplay-tcc.firebaseapp.com",
  projectId: "eduplay-tcc",
  storageBucket: "eduplay-tcc.firebasestorage.app",
  messagingSenderId: "574631222893",
  appId: "1:574631222893:web:4065103d26e78efe492964"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);