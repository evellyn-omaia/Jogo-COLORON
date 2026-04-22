let nomeSalvo = false;

const input = document.getElementById("nomeInput");
const btn = document.getElementById("btnSalvar");

// salvar nome
btn.onclick = (e) => {
  e.stopPropagation(); // ⛔ evita conflito com clique geral

  let nome = input.value.trim();
  if (!nome) nome = "Jogador";

  localStorage.setItem("nickname", nome);
  nomeSalvo = true;

  alert("Nome salvo!");
};

// clicar na tela (fora do botão)
document.body.addEventListener("click", (e) => {

  // ⛔ ignora clique no botão ou input
  if (e.target === input || e.target === btn) return;

  if (!nomeSalvo && !localStorage.getItem("nickname")) {
    alert("Salve seu nome primeiro!");
    return;
  }

  window.location.href = "indexJogo.html";
});