import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";

import {
  getDatabase,
  ref,
  get,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoiFKvCDF-5UBTOdzUYR3jFoHZJhpN7Kk",
  authDomain: "jogo-coloron.firebaseapp.com",
  databaseURL: "https://jogo-coloron-default-rtdb.firebaseio.com",
  projectId: "jogo-coloron",
  storageBucket: "jogo-coloron.firebasestorage.app",
  messagingSenderId: "738598767867",
  appId: "1:738598767867:web:e806626a3e395f48d2b45e",
};

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

const input = document.getElementById("nomeInput");

const btnSalvar = document.getElementById("btnSalvar");
const btnEditar = document.getElementById("btnEditar");

const msg = document.getElementById("msg");

const avatarSelecionado = document.getElementById("avatarSelecionado");

const avatarOptions = document.querySelectorAll(".avatarOption");

const cenarios = document.querySelectorAll(".cenario");

const btnComecar = document.getElementById("btnComecar");

// ============================
// CARREGAR DADOS
// ============================

let nickname = localStorage.getItem("nickname");

let avatar = localStorage.getItem("avatar");

let cenario = localStorage.getItem("cenario");

// ============================
// NICKNAME
// ============================

if (nickname) {
  input.value = nickname;

  input.disabled = true;

  btnSalvar.style.display = "none";

  btnEditar.style.display = "block";
}

btnSalvar.onclick = () => {
  let nome = input.value
    .trim()
    .slice(0, 15)
    .replace(/[^a-zA-Z0-9_ ]/g, "");

  if (!nome) {
    msg.textContent = "Digite um nickname válido.";

    return;
  }

  localStorage.setItem("nickname", nome);

  input.disabled = true;

  btnSalvar.style.display = "none";

  btnEditar.style.display = "block";

  msg.textContent = "Nickname salvo!";
};

btnEditar.onclick = () => {
  input.disabled = false;

  input.focus();

  btnSalvar.style.display = "block";

  btnEditar.style.display = "none";
};

// ============================
// AVATAR
// ============================

if (avatar) {
  avatarSelecionado.src = avatar;

  avatarOptions.forEach((img) => {
    img.classList.remove("activeAvatar");

    if (img.src.includes(avatar)) {
      img.classList.add("activeAvatar");
    }
  });
}

avatarOptions.forEach((img) => {
  img.onclick = () => {
    avatarOptions.forEach((i) => {
      i.classList.remove("activeAvatar");
    });

    img.classList.add("activeAvatar");

    avatarSelecionado.src = img.src;

    localStorage.setItem("avatar", img.src);
  };
});

const avatarPopup = document.getElementById("avatarPopup");

avatarSelecionado.onclick = () => {
  avatarPopup.classList.toggle("active");
};

// ============================
// CENÁRIOS
// ============================

if (cenario) {
  btnComecar.style.display = "block";

  cenarios.forEach((c) => {
    c.classList.remove("activeCenario");

    if (c.dataset.cenario === cenario) {
      c.classList.add("activeCenario");
    }
  });
}

cenarios.forEach((c) => {
  c.onclick = () => {
    cenarios.forEach((i) => {
      i.classList.remove("activeCenario");
    });

    c.classList.add("activeCenario");

    localStorage.setItem("cenario", c.dataset.cenario);

    btnComecar.style.display = "block";
  };
});

// ============================
// COMEÇAR
// ============================

btnComecar.onclick = () => {
  if (!localStorage.getItem("nickname")) {
    msg.textContent = "Salve seu nickname.";

    return;
  }

  if (!localStorage.getItem("cenario")) {
    msg.textContent = "Escolha um cenário.";

    return;
  }

  window.location.href = "indexJogo.html";
};

window.addEventListener("click", (e) => {
  if (!avatarPopup.contains(e.target) && e.target !== avatarSelecionado) {
    avatarPopup.classList.remove("active");
  }
});


const btnRanking =
document.getElementById(
  "btnRanking"
);

const rankingPopup =
document.getElementById(
  "rankingPopup"
);

const rankingLista =
document.getElementById(
  "rankingLista"
);

btnRanking.onclick =
async () => {

  rankingPopup.style.display =
  "flex";

  rankingLista.innerHTML =
  "<p>Carregando...</p>";

 const snapshot =
await get(ref(db, "ranking"));

let ranking = [];

snapshot.forEach((usuario)=>{

  let maior = 0;

  usuario.forEach((pontuacao)=>{

    const dados =
    pontuacao.val();

    if(dados.score > maior){

      maior = dados.score;
    }
  });

  ranking.push({

    nome: usuario.key,
    score: maior,
  });
});

ranking.sort(
  (a,b)=>b.score-a.score
);

ranking = ranking.slice(0,20);

  rankingLista.innerHTML = "";

  ranking.forEach((p,i)=>{

    rankingLista.innerHTML += `

      <div class="rankItem">

        <span>#${i+1}</span>

        <strong>${p.nome}</strong>

        <b>${p.score}</b>

      </div>

    `;
  });
};

rankingPopup.onclick = (e)=>{

  if(e.target === rankingPopup){

    rankingPopup.style.display =
    "none";
  }
};