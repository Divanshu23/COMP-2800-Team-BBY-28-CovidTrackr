//Firebase Connection
var firebaseConfig = {
    apiKey: "AIzaSyDxHi5COMdmSXae5UJB8oV4aB6sZAj5p4k",
    authDomain: "covid-blocker.firebaseapp.com",
    databaseURL: "https://covid-blocker.firebaseio.com",
    projectId: "covid-blocker",
    storageBucket: "covid-blocker.appspot.com",
    messagingSenderId: "976498148341",
    appId: "1:976498148341:web:c52974cc78ea5382cc56bc"
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();