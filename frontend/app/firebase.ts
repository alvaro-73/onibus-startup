import { initializeApp } from "firebase/app";

import {
  getDatabase,
} from "firebase/database";

import {
  getAuth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    "AIzaSyB6kLOiqiVBLIFWOOmaqnN3B3M8pMUGm38",

  authDomain:
    "startup-onibus.firebaseapp.com",

  databaseURL:
    "https://startup-onibus-default-rtdb.firebaseio.com",

  projectId:
    "startup-onibus",

  storageBucket:
    "startup-onibus.firebasestorage.app",

  messagingSenderId:
    "999167151452",

  appId:
    "1:999167151452:web:76c52e8b3c9923c8c00599",
};

const app =
  initializeApp(
    firebaseConfig
  );

export const db =
  getDatabase(app);

export const auth =
  getAuth(app);