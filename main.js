// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  query,
  orderByChild,
  limitToLast,
}from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

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

// ================= CANVAS =================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

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
  radius: 14,
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
let particulas = [];

function gerarPlataformas() {
  plataformas = [];

  let x = 300;
  let y = canvas.height - 250;

  for (let i = 0; i < 35; i++) {
    let gap = 120 + Math.random() * 160;
    let variacao = (Math.random() - 0.5) * 140;

    y += variacao;

    if (y > canvas.height - 120) {
      y = canvas.height - 120;
    }

    if (y < canvas.height - 420) {
      y = canvas.height - 420;
    }

    plataformas.push({
      x: x,
      y: y,
      largura: 100,
      altura: 20,
      cor: cores[Math.floor(Math.random() * cores.length)],
      pontuada: false,
    });

    x += gap;
  }
}

gerarPlataformas();



// ================= CONTROLES =================

let teclas = {};

window.addEventListener("keydown", async (e) => {
  teclas[e.key.toLowerCase()] = true;

  // ================= INICIAR =================
  if (estado === "inicio") {
    estado = "jogando";

    bola.dy = pulo;

    particulas.push({
      x: bola.x - cameraX,
      y: bola.y,
      alpha: 1,
      cor: bola.cor,
    });
  }

  // ================= TROCAR COR =================
  if (e.key === " " || e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
    let index = cores.indexOf(bola.cor);

    bola.cor = cores[(index + 1) % cores.length];
  }

  // ================= REINICIAR =================
  if (estado === "gameover" && e.key.toLowerCase() === "r") {
    if (!salvou) {
      salvou = true;

      await salvarRankingOnline();
    }

    resetarJogo();
  }

  // ================= ABRIR RANKING =================
  if (estado === "gameover" && e.key === "Enter") {
    if (!salvou && !salvando) {
      salvando = true;

      await salvarRankingOnline();

      salvou = true;

      salvando = false;
    }

    estado = "ranking";
  }

  // ================= RANKING -> REINICIAR =================
  if (estado === "ranking" && e.key.toLowerCase() === "r") {
    resetarJogo();
  }
});

window.addEventListener("keyup", (e) => {
  teclas[e.key.toLowerCase()] = false;
});

window.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    if (estado === "inicio") {
      estado = "jogando";
    }

    bola.dy = pulo;

    let index = cores.indexOf(bola.cor);

    bola.cor = cores[(index + 1) % cores.length];
  },
  { passive: false },
);

window.addEventListener("keyup", (e) => {
  teclas[e.key.toLowerCase()] = false;
});

window.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();

    if (estado === "inicio") {
      estado = "jogando";
    }

    bola.dy = pulo;

    let index = cores.indexOf(bola.cor);

    bola.cor = cores[(index + 1) % cores.length];
  },
  { passive: false },
);

// ================= CLIQUE =================

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
      bola.dy >= 0 &&
      bola.y + bola.radius > p.y &&
      bola.y + bola.radius < p.y + p.altura &&
      bola.x > p.x &&
      bola.x < p.x + p.largura
    ) {
      emPlataforma = true;

      if (bola.cor === p.cor) {
        bola.y = p.y - bola.radius;
        bola.dy = pulo;

        if (!p.pontuada) {
          score++;
          scoreText.textContent = score;
          if (score >= 10) {
            scoreText.classList.add("scoreFire");
          } else {
            scoreText.classList.remove("scoreFire");
          }
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

    let maiorX = Math.max(...plataformas.map(plataforma => plataforma.x));

    let ultimaPlataforma = plataformas.find(plataforma => plataforma.x === maiorX);

    let gap = 120 + Math.random() * 160;

    let novoY = ultimaPlataforma.y + (Math.random() - 0.5) * 140;

    if (novoY > canvas.height - 120) {
      novoY = canvas.height - 120;
    }

    if (novoY < canvas.height - 420) {
      novoY = canvas.height - 420;
    }

    p.x = maiorX + gap;
    p.y = novoY;
    p.cor = cores[Math.floor(Math.random() * cores.length)];
    p.pontuada = false;
  }
}
}

// ================= RANKING =================
async function salvarRankingOnline() {

  if (score <= 0 || salvou) return;

  try {

    // REFERÊNCIA DO JOGADOR
    const jogadorRef = ref(
      db,
      `ranking/${nickname}`
    );

    // NOVA PONTUAÇÃO
    const novaPontuacaoRef =
    push(jogadorRef);

    // SALVAR SCORE
    await set(novaPontuacaoRef, {
      score: score,
      data: Date.now(),
    });

  } catch (e) {

    console.error(e);
  }

  // ================= RANKING GLOBAL =================

  const snapshot =
  await get(ref(db, "ranking"));

  const melhores = [];

  snapshot.forEach((usuario)=>{

    let maior = 0;

    usuario.forEach((pontuacao)=>{

      const dados =
      pontuacao.val();

      if(dados.score > maior){

        maior = dados.score;
      }
    });

    melhores.push({
      nome: usuario.key,
      score: maior,
    });
  });

  ranking = melhores;

  ranking.sort(
    (a,b)=>b.score-a.score
  );

  ranking = ranking.slice(0,5);
}

const scoreText = document.getElementById("score");
const playerText = document.getElementById("player");

playerText.textContent = nickname;
const hudAvatar = document.getElementById("hudAvatar");

hudAvatar.src = localStorage.getItem("avatar");

// ================= DESENHO =================

// ================= FUNDO =================
// ================= FUNDO =================

const imagemCenario = new Image();

const cenarioEscolhido = localStorage.getItem("cenario") || "cenario1";

imagemCenario.src = `./cenarios/${cenarioEscolhido}.png`;

let fundoPronto = false;

imagemCenario.onload = () => {
  fundoPronto = true;
};

function desenharFundo() {
  if (fundoPronto) {
    ctx.drawImage(imagemCenario, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#0f172a";

    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function desenharBase() {
  ctx.fillStyle = baseInicial.cor;
  ctx.fillRect(
    baseInicial.x - cameraX,
    baseInicial.y,
    baseInicial.largura,
    baseInicial.altura,
  );
}

function desenharPlataformas() {
  for (let p of plataformas) {
    ctx.fillStyle = p.cor;

    ctx.shadowBlur = 15;
    ctx.shadowColor = p.cor;

    ctx.fillRect(p.x - cameraX, p.y, p.largura, p.altura);

    ctx.shadowBlur = 0;
  }
}

function desenharBola() {
  ctx.beginPath();

  ctx.arc(bola.x - cameraX, bola.y, bola.radius, 0, Math.PI * 2);

  ctx.fillStyle = bola.cor;

  ctx.shadowBlur = 25;
  ctx.shadowColor = bola.cor;

  ctx.fill();

  ctx.closePath();

  ctx.shadowBlur = 0;
}

function desenharParticulas() {
  particulas.forEach((p, i) => {
    p.alpha -= 0.02;

    ctx.globalAlpha = p.alpha;

    ctx.fillStyle = p.cor;

    ctx.beginPath();

    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);

    ctx.fill();

    ctx.globalAlpha = 1;

    if (p.alpha <= 0) {
      particulas.splice(i, 1);
    }
  });
}

function desenharGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.72)";

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.fillStyle = "#fff";

  ctx.font = "bold 70px Arial";

  ctx.shadowBlur = 25;

  ctx.shadowColor = "#ff3b3b";

  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 60);

  ctx.shadowBlur = 0;

  ctx.font = "32px Arial";

  ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 10);

  ctx.font = "22px Arial";

  ctx.fillStyle = "#60a5fa";

  ctx.fillText("ENTER = Ranking", canvas.width / 2, canvas.height / 2 + 80);

  ctx.fillStyle = "#4ade80";

  ctx.fillText("R = Reiniciar", canvas.width / 2, canvas.height / 2 + 120);
}

function desenharRanking() {
  ctx.fillStyle = "rgba(0,0,0,0.82)";

  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = "center";

  ctx.fillStyle = "#fff";

  ctx.font = "bold 60px Arial";

  ctx.shadowBlur = 20;

  ctx.shadowColor = "#ffd93b";

  ctx.fillText("🏆 RANKING", canvas.width / 2, 120);

  ctx.shadowBlur = 0;

  ranking.forEach((p, i) => {
    let y = 220 + i * 75;

    // CARD
    ctx.fillStyle = "rgba(255,255,255,0.08)";

    ctx.fillRect(canvas.width / 2 - 250, y - 40, 500, 55);

    // POSIÇÃO
    ctx.fillStyle = "#ffd93b";

    ctx.font = "bold 26px Arial";

    ctx.fillText(`#${i + 1}`, canvas.width / 2 - 180, y);

    // NOME
    ctx.fillStyle = "#fff";

    ctx.fillText(p.nome, canvas.width / 2, y);

    // SCORE
    ctx.fillStyle = "#60a5fa";

    ctx.fillText(p.score, canvas.width / 2 + 180, y);
  });

  ctx.fillStyle = "#fff";

  ctx.font = "22px Arial";

  ctx.fillText(
    "Pressione R para jogar novamente",
    canvas.width / 2,
    canvas.height - 70,
  );
}

// ================= RESET =================
function resetarJogo() {
  estado = "inicio";
  score = 0;
  scoreText.textContent = "0";
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
  desenharParticulas();

  if (estado === "inicio") {
    ctx.fillStyle = "#fff";

    ctx.textAlign = "center";

    ctx.font = "bold 50px Arial";

    ctx.fillText("COLORON", canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = "24px Arial";

    ctx.fillText(
      "Pressione qualquer tecla",
      canvas.width / 2,
      canvas.height / 2 + 10,
    );
  }
  if (estado === "gameover") desenharGameOver();

  if (estado === "ranking") desenharRanking();

  update();

  requestAnimationFrame(loop);
}

//================= BOTÃO ===================
document.getElementById("btnMenu").onclick = () => {
  window.location.href = "index.html";
};

loop();
