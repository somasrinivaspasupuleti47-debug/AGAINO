// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBKqEy_870bLN8JvvRnADvvGIi3bVt_yqg",
  authDomain: "againo-b81eb.firebaseapp.com",
  projectId: "againo-b81eb",
  storageBucket: "againo-b81eb.firebasestorage.app",
  messagingSenderId: "943201893592",
  appId: "1:943201893592:web:84ab278ba0d819ef3a2bad"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const db = getFirestore(app);
export const storage = getStorage(app);