// Configuración de Firebase para App-Animes
const firebaseConfig = {
    apiKey: "AIzaSyD3b2c4E5fG6h7I8j9K0l1M2n3O4p5Q6r7S",
    authDomain: "app-animes-63d30.firebaseapp.com",
    databaseURL: "https://app-animes-63d30-default-rtdb.firebaseio.com",
    projectId: "app-animes-63d30",
    storageBucket: "app-animes-63d30.appspot.com",
    messagingSenderId: "378450975564",
    appId: "1:378450975564:android:a9f08c48a1bc80ae074de9"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();