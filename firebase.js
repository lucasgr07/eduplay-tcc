// Importa as funções necessárias do Firebase
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmB57KvZJGpPiUj9GbAfUCtduNlkK7_nY",
  authDomain: "eduplay-tcc.firebaseapp.com",
  projectId: "eduplay-tcc",
  storageBucket: "eduplay-tcc.firebasestorage.app",
  messagingSenderId: "574631222893",
  appId: "1:574631222893:web:4065103d26e78efe492964"
};

// Inicializa o aplicativo do Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o banco de dados (Firestore) e exporta para usarmos no resto do TCC
export const db = getFirestore(app);