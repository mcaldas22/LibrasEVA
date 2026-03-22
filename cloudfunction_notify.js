// ═══════════════════════════════════════════════════════════════════════
//  LibrasEVA – Cloud Function: Notificação de Novo Sinal
//  Arquivo: functions/index.js  (ou cloudfunction_notify.js)
//
//  Implantação:
//    npm install -g firebase-tools
//    firebase init functions
//    cd functions && npm install
//    firebase deploy --only functions
// ═══════════════════════════════════════════════════════════════════════

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp }     = require("firebase-admin/app");
const { getFirestore }      = require("firebase-admin/firestore");
const nodemailer            = require("nodemailer");

initializeApp();

// ── Configuração do e-mail  (use variáveis de ambiente no Firebase) ────
// firebase functions:config:set email.user="seu@gmail.com" email.pass="senha_app"
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@seudominio.com";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ── Trigger: documento criado em /pending ─────────────────────────────
exports.notificarNovoPendente = onDocumentCreated(
  "pending/{docId}",
  async (event) => {
    const data  = event.data?.data();
    const docId = event.params.docId;

    if (!data) return null;

    const assunto = `[LibrasEVA] Novo sinal aguardando aprovação: "${data.termo}"`;
    const corpo   = `
      <h2>LibrasEVA – Moderação</h2>
      <p>Um novo sinal foi enviado e aguarda sua aprovação:</p>
      <table>
        <tr><td><strong>Termo:</strong></td>     <td>${data.termo}</td></tr>
        <tr><td><strong>Disciplina:</strong></td><td>${data.disciplina}</td></tr>
        <tr><td><strong>Descrição:</strong></td> <td>${data.descricao || "—"}</td></tr>
        <tr><td><strong>Contribuinte:</strong></td><td>${data.contribuinte || "Anônimo"}</td></tr>
        <tr><td><strong>Vídeo:</strong></td>     <td><a href="${data.videoUrl}">${data.videoUrl}</a></td></tr>
        <tr><td><strong>ID:</strong></td>        <td>${docId}</td></tr>
      </table>
      <p>Acesse o painel admin da plataforma para aprovar ou rejeitar.</p>
    `;

    try {
      await transporter.sendMail({
        from:    `"LibrasEVA Bot" <${process.env.EMAIL_USER}>`,
        to:      ADMIN_EMAIL,
        subject: assunto,
        html:    corpo
      });
      console.log(`Notificação enviada para ${ADMIN_EMAIL}`);
    } catch (err) {
      console.error("Erro ao enviar e-mail:", err);
    }

    // Salvar notificação no Firestore também
    await getFirestore().collection("notifications").add({
      tipo:     "novo_pendente",
      termoId:  docId,
      termo:    data.termo,
      lida:     false,
      criadoEm: new Date()
    });

    return null;
  }
);

// ── Trigger: sinal aprovado → atualizar pontos do contribuinte ────────
exports.atualizarPontos = onDocumentCreated(
  "terms/{termoId}",
  async (event) => {
    const data = event.data?.data();
    if (!data || !data.contribuinteUid) return null;

    const userRef = getFirestore().doc(`users/${data.contribuinteUid}`);
    const snap    = await userRef.get();

    if (snap.exists) {
      const pontos = (snap.data().pontos ?? 0) + 50; // 50 pts por sinal aprovado
      const total  = (snap.data().totalSinais ?? 0) + 1;
      const badges = calcularBadges(total);
      await userRef.update({ pontos, totalSinais: total, badges, nome: data.contribuinte });
    } else {
      await userRef.set({
        pontos: 50,
        totalSinais: 1,
        badges: ["🌱 Iniciante"],
        nome: data.contribuinte || "Anônimo",
        criadoEm: new Date()
      });
    }
    return null;
  }
);

function calcularBadges(total) {
  const badges = [];
  if (total >= 1)  badges.push("🌱 Iniciante");
  if (total >= 5)  badges.push("📖 Colaborador");
  if (total >= 15) badges.push("⭐ Contribuidor");
  if (total >= 30) badges.push("🏆 Embaixador Libras");
  return badges;
}
