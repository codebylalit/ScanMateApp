// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBF-t2F4QJXzDKv99Cm3guW7cgjZzwOkhU",
  authDomain: "scanmate-6633c.firebaseapp.com",
  projectId: "scanmate-6633c",
  storageBucket: "scanmate-6633c.appspot.com",
  messagingSenderId: "64378646967",
  appId: "1:64378646967:web:7147446b082163bc06f832",
  measurementId: "G-L8GMEVPE8N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
