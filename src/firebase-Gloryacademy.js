import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyB4_w1xlRevk3dbmAmN7eUcyUXdBIea408",
  authDomain: "chunkmaster-d5322.firebaseapp.com",
  projectId: "chunkmaster-d5322",
  storageBucket: "chunkmaster-d5322.firebasestorage.app",
  messagingSenderId: "849047351190",
  appId: "1:849047351190:web:b8069b52d0436b62cff7b7"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)