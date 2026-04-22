// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getDatabase, ref, push, get, query, orderByChild, limitToLast } 
from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAoiFKvCDF-5UBTOdzUYR3jFoHZJhpN7Kk",
  authDomain: "jogo-coloron.firebaseapp.com",
  databaseURL: "https://jogo-coloron-default-rtdb.firebaseio.com",
  projectId: "jogo-coloron",
  storageBucket: "jogo-coloron.firebasestorage.app",
  messagingSenderId: "738598767867",
  appId: "1:738598767867:web:e806626a3e395f48d2b45e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ================= CANVAS =================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ================= CONFIG =================
const cores = ["#ff3b3b", "#3bff5a", "#3b9eff", "#ffd93b"];
const gravidade = 0.4;
const pulo = -15;
const velocidadeJogo = 4;

// 🚀 NOVO: velocidade da câmera
let velocidadeCamera = 2;

// ================= ESTADO =================
let estado = "inicio";
let score = 0;
let cameraX = 0;

let salvou = false;
let salvando = false;

// ================= USUARIO =================
let nickname = localStorage.getItem("nickname") || "Jogador";

// ================= RANKING =================
let ranking = [];

// ================= BOLA =================
const bola = {
  x: 150,
  y: canvas.height - 300,
  radius: 10,
  cor: cores[Math.floor(Math.random() * cores.length)],
  dy: 0,
  dx: 0,
};

// ================= BASE =================
const baseInicial = {
  x: 100,
  y: canvas.height - 200,
  largura: 120,
  altura: 30,
  cor: "#ffffff",
};

// ================= PLATAFORMAS =================
let plataformas = [];

function gerarPlataformas() {
  plataformas = [];

  let x = 300;
  let y = canvas.height - 250;

  for (let i = 0; i < 20; i++) {

    let gap = 100 + Math.random() * 150;

    let variacao = (Math.random() - 0.5) * 120;
    y += variacao;

    if (y > canvas.height - 120) y = canvas.height - 120;
    if (y < canvas.height - 400) y = canvas.height - 400;

    plataformas.push({
      x,
      y,
      largura: 100,
      altura: 20,
      cor: cores[Math.floor(Math.random() * cores.length)],
      pontuada: false
    });

    x += gap;
  }
}

gerarPlataformas();

// ================= CONTROLES =================
let teclas = {};

window.addEventListener("keydown", (e) => {
  teclas[e.key.toLowerCase()] = true;

  if (estado === "inicio") {
    estado = "jogando";
    bola.dy = pulo;
  }
});

window.addEventListener("keyup", (e) => {
  teclas[e.key.toLowerCase()] = false;
});

// ================= CLIQUE =================
canvas.addEventListener("click", async () => {

  if (estado === "gameover") {
    if (salvou || salvando) return;

    salvando = true;
    await salvarRankingOnline();

    salvou = true;
    salvando = false;

    estado = "ranking";
    return;
  }

  if (estado === "ranking") {
    resetarJogo();
    return;
  }

  if (estado !== "jogando") return;

  let index = cores.indexOf(bola.cor);
  bola.cor = cores[(index + 1) % cores.length];
});

// ================= UPDATE =================
function update() {
  if (estado !== "jogando") return;

  // movimento
  if (teclas["arrowleft"] || teclas["a"]) {
    bola.dx = -velocidadeJogo;
  } else if (teclas["arrowright"] || teclas["d"]) {
    bola.dx = velocidadeJogo;
  } else {
    bola.dx = 0;
  }

  bola.x += bola.dx;

  // 🚀 CÂMERA INTELIGENTE + AUTOMÁTICA
  let alvo = bola.x - canvas.width / 3;

  cameraX += (alvo - cameraX) * 0.05;

  // empurra o jogador
  velocidadeCamera = 2 + score * 0.05;
  cameraX += velocidadeCamera;

  // 💀 MORTE SE FICAR PRA TRÁS
  if (bola.x < cameraX) {
    estado = "gameover";
  }

  // física
  bola.dy += gravidade;
  bola.y += bola.dy;

  let emPlataforma = false;

  // base
  if (
    bola.y + bola.radius > baseInicial.y &&
    bola.x > baseInicial.x &&
    bola.x < baseInicial.x + baseInicial.largura
  ) {
    bola.dy = pulo;
    emPlataforma = true;
  }

  // plataformas
  for (let p of plataformas) {
    if (
      bola.y + bola.radius > p.y &&
      bola.y + bola.radius < p.y + p.altura &&
      bola.x > p.x &&
      bola.x < p.x + p.largura
    ) {
      emPlataforma = true;

      if (bola.cor === p.cor) {
        bola.dy = pulo;

        if (!p.pontuada) {
          score++;
          p.pontuada = true;
        }
      } else {
        estado = "gameover";
      }
    }
  }

  if (!emPlataforma && bola.y > canvas.height) {
    estado = "gameover";
  }

  // reciclar plataformas
  for (let p of plataformas) {
    if (p.x - cameraX < -200) {
      let ultimo = plataformas[plataformas.length - 1];

      p.x = ultimo.x + 100 + Math.random() * 150;
      p.y = canvas.height - 120 + (Math.random() - 0.5) * 120;
      p.cor = cores[Math.floor(Math.random() * cores.length)];
      p.pontuada = false;
    }
  }
}

// ================= RANKING =================
async function salvarRankingOnline() {
  if (score <= 0 || salvou) return;

  try {
    await push(ref(db, 'ranking'), {
      nome: nickname,
      score: score
    });
  } catch (e) {
    console.error(e);
  }

  const rankingQuery = query(
    ref(db, 'ranking'),
    orderByChild('score'),
    limitToLast(5)
  );

  const snapshot = await get(rankingQuery);

  ranking = [];

  snapshot.forEach((child) => {
    ranking.push(child.val());
  });

  ranking.sort((a, b) => b.score - a.score);
}

// ================= DESENHO =================
function desenharFundo() {
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#0f2027");
  grad.addColorStop(0.5, "#203a43");
  grad.addColorStop(1, "#2c5364");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function desenharBase() {
  ctx.fillStyle = baseInicial.cor;
  ctx.fillRect(baseInicial.x - cameraX, baseInicial.y, baseInicial.largura, baseInicial.altura);
}

function desenharPlataformas() {
  for (let p of plataformas) {
    ctx.fillStyle = p.cor;
    ctx.fillRect(p.x - cameraX, p.y, p.largura, p.altura);
  }
}

function desenharBola() {
  ctx.beginPath();
  ctx.arc(bola.x - cameraX, bola.y, bola.radius, 0, Math.PI * 2);
  ctx.fillStyle = bola.cor;
  ctx.fill();
}

function desenharHUD() {
  ctx.fillStyle = "#fff";
  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, 20, 40);
}

function desenharGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.7)";
  ctx.fillRect(canvas.width/2 - 150, canvas.height/2 - 100, 300, 200);

  ctx.fillStyle = "#fff";
  ctx.font = "28px Arial";
  ctx.fillText("GAME OVER", canvas.width/2 - 90, canvas.height/2 - 40);

  ctx.font = "20px Arial";
  ctx.fillText("Score: " + score, canvas.width/2 - 60, canvas.height/2);
}

function desenharRanking() {
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillRect(canvas.width/2 - 150, canvas.height/2 - 120, 300, 240);

  ctx.fillStyle = "#fff";
  ctx.font = "24px Arial";
  ctx.fillText("RANKING", canvas.width/2 - 60, canvas.height/2 - 70);

  ctx.font = "18px Arial";

  ranking.forEach((p, i) => {
    ctx.fillText(`${i+1}º - ${p.nome}: ${p.score}`, canvas.width/2 - 100, canvas.height/2 - 30 + i*25);
  });
}

// ================= RESET =================
function resetarJogo() {
  estado = "inicio";
  score = 0;
  cameraX = 0;

  salvou = false;
  salvando = false;

  bola.x = 150;
  bola.y = canvas.height - 300;
  bola.dy = 0;
  bola.cor = cores[Math.floor(Math.random() * cores.length)];

  gerarPlataformas();
}

// ================= LOOP =================
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  desenharFundo();
  desenharBase();
  desenharPlataformas();
  desenharBola();
  desenharHUD();

  if (estado === "gameover") desenharGameOver();
  if (estado === "ranking") desenharRanking();

  update();

  requestAnimationFrame(loop);
}

loop();