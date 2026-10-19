
import { initializeApp } from
  "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";

import {
  getDatabase,
  ref,
  onValue,
  set
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// ==============================
// CONFIGURATION FIREBASE
// ==============================

const firebaseConfig = {
  apiKey: "AIzaSyDmAeYdG5_7OkFcMc0Dms7gfdCdPKo6YxM",
  authDomain: "architectures-d-objets-connect.firebaseapp.com",
  databaseURL: "https://architectures-d-objets-connect-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "architectures-d-objets-connect",
  storageBucket: "architectures-d-objets-connect.firebasestorage.app",
  messagingSenderId: "80276721847",
  appId: "1:80276721847:web:ed33c441e77979caacfd32",
  measurementId: "G-8R9QJY80EG"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ==============================
// ÉLÉMENTS HTML
// ==============================

const connection = document.getElementById("connection");
const message = document.getElementById("message");

const temperatureElement = document.getElementById("temperature");
const humiditeElement = document.getElementById("humidite");

const needleTemp = document.getElementById("needleTemp");
const needleHum = document.getElementById("needleHum");

// ==============================
// VARIABLES
// ==============================

let led1 = null;
let led2 = null;

let temperatureDisponible = false;
let humiditeDisponible = false;

let etat1Disponible = false;
let etat2Disponible = false;

// ==============================
// ÉTAT DE LA CONNEXION
// ==============================

function afficherConnexion() {
  const pret =
    temperatureDisponible &&
    humiditeDisponible &&
    etat1Disponible &&
    etat2Disponible;

  const texte = connection.querySelector(".status-text");

  connection.classList.remove("status--pending", "status--ok", "status--error");
  connection.classList.add(pret ? "status--ok" : "status--pending");

  if (texte) {
    texte.textContent = pret
      ? "Connecté à Firebase"
      : "Connexion en cours…";
  }
}

function mettreAJourLedUi(numero, allumee) {
  const etat = document.getElementById("etat" + numero);
  const badge = document.getElementById("badge" + numero);
  const btn = document.getElementById("btn" + numero);

  etat.textContent = allumee ? "Allumée" : "Éteinte";

  if (badge) {
    badge.textContent = allumee ? "ON" : "OFF";
    badge.dataset.state = allumee ? "on" : "off";
  }

  if (btn) {
    btn.textContent = allumee ? "Éteindre" : "Allumer";
    btn.classList.toggle("btn-toggle--off", !allumee);
    btn.setAttribute(
      "aria-label",
      allumee
        ? "Éteindre la LED " + numero
        : "Allumer la LED " + numero
    );
  }
}

// ==============================
// ROTATION DES AIGUILLES
// ==============================

function faireTournerAiguille(valeur, aiguille, minimum, maximum) {
  const nombre = Number(valeur);

  if (
    valeur === null ||
    valeur === undefined ||
    valeur === "" ||
    !Number.isFinite(nombre)
  ) {
    return;
  }

  // Limiter la mesure aux valeurs de la jauge
  const mesure = Math.max(minimum, Math.min(maximum, nombre));

  // Calculer l'angle de rotation entre -90° et +90°
  const angle =
    -90 + ((mesure - minimum) / (maximum - minimum)) * 180;

  // Appliquer la rotation à l'aiguille
  aiguille.style.transform = `rotate(${angle}deg)`;
}

// ==============================
// LECTURE DE LA TEMPÉRATURE
// Chemin Firebase : temperature
// ==============================

onValue(
  ref(db, "temperature"),
  (snapshot) => {
    const valeur = snapshot.val();

    const valide =
      valeur !== null &&
      valeur !== undefined &&
      valeur !== "" &&
      Number.isFinite(Number(valeur));

    if (valide) {
      const temperature = Number(valeur);

      temperatureElement.textContent = temperature.toFixed(1);

      faireTournerAiguille(
        temperature,
        needleTemp,
        0,
        100
      );
    } else {
      temperatureElement.textContent = "--";
      message.textContent =
        "La température est vide ou invalide dans Firebase.";
      message.className = "feedback feedback--error";
    }

    temperatureDisponible = true;
    afficherConnexion();
  },
  erreur
);

// ==============================
// LECTURE DE L'HUMIDITÉ
// Chemin Firebase : humidite
// ==============================

onValue(
  ref(db, "humidite"),
  (snapshot) => {
    const valeur = snapshot.val();

    const valide =
      valeur !== null &&
      valeur !== undefined &&
      valeur !== "" &&
      Number.isFinite(Number(valeur));

    if (valide) {
      const humidite = Number(valeur);

      humiditeElement.textContent = humidite.toFixed(1);

      faireTournerAiguille(
        humidite,
        needleHum,
        0,
        100
      );
    } else {
      humiditeElement.textContent = "--";
      message.textContent =
        "L'humidité est vide ou invalide dans Firebase.";
      message.className = "feedback feedback--error";
    }

    humiditeDisponible = true;
    afficherConnexion();
  },
  erreur
);

// ==============================
// SURVEILLANCE DES LEDS
// ==============================

function surveillerLed(chemin, numero, mettreAJour) {
  onValue(
    ref(db, chemin),
    (snapshot) => {
      const valeur = snapshot.val();

      if (typeof valeur !== "boolean") {
        message.textContent =
          chemin + " doit contenir true ou false.";
        message.className = "feedback feedback--error";
        return;
      }

      mettreAJour(valeur);
      mettreAJourLedUi(numero, valeur);

      document
        .getElementById("dot" + numero)
        .classList.toggle("on", valeur);

      document.getElementById("btn" + numero).disabled = false;

      if (numero === 1) etat1Disponible = true;
      if (numero === 2) etat2Disponible = true;

      afficherConnexion();
    },
    erreur
  );
}

surveillerLed("Led_1", 1, (valeur) => {
  led1 = valeur;
});

surveillerLed("Led_2", 2, (valeur) => {
  led2 = valeur;
});

// ==============================
// CHANGER L'ÉTAT DES LEDS
// ==============================

async function changerLed(chemin, etat) {
  if (typeof etat !== "boolean") return;

  message.textContent = "Envoi de la commande…";
  message.className = "feedback feedback--busy";

  document.getElementById("btn1").disabled = true;
  document.getElementById("btn2").disabled = true;

  try {
    await set(ref(db, chemin), !etat);

    message.textContent = "Commande enregistrée (" + chemin + ").";
    message.className = "feedback feedback--success";
  } catch (e) {
    console.error("Erreur commande LED :", e);

    message.textContent =
      "Échec de la commande. Vérifie les règles Firebase et la connexion.";
    message.className = "feedback feedback--error";
  } finally {
    document.getElementById("btn1").disabled = led1 === null;
    document.getElementById("btn2").disabled = led2 === null;
  }
}

// Événements des boutons

document.getElementById("btn1").addEventListener("click", () => {
  changerLed("Led_1", led1);
});

document.getElementById("btn2").addEventListener("click", () => {
  changerLed("Led_2", led2);
});

// ==============================
// GESTION DES ERREURS FIREBASE
// ==============================

function erreur(e) {
  console.error("Erreur Firebase :", e);

  connection.classList.remove("status--pending", "status--ok");
  connection.classList.add("status--error");

  const texte = connection.querySelector(".status-text");
  if (texte) texte.textContent = "Erreur de connexion";

  message.textContent =
    "Impossible de lire Firebase. Vérifie les règles d'accès.";
  message.className = "feedback feedback--error";
}
