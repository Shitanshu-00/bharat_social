// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCzICx8kLn1-wfgCQkxIO0uIaS9zsSRXQE",
  authDomain: "bharat-social-e9d14.firebaseapp.com",
  projectId: "bharat-social-e9d14",
  storageBucket: "bharat-social-e9d14.firebasestorage.app",
  messagingSenderId: "78691594775",
  appId: "1:78691594775:web:dc8671e087fb90c4b66252",
  measurementId: "G-B17R774688"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);