# LibrasEVA 🤟
### Plataforma Interativa de Aprendizagem Científica em Língua Brasileira de Sinais

> Uma plataforma colaborativa e gamificada para descobrir, aprender e contribuir com sinais científicos em Libras — acessível offline, instalável como app (PWA) e com moderação integrada.

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Estrutura de Arquivos](#estrutura-de-arquivos)
3. [Como Executar Localmente](#como-executar-localmente)
4. [Configurar Firebase](#configurar-firebase)
5. [Configurar Admin UID](#configurar-admin-uid)
6. [Alternativa: Supabase](#alternativa-supabase)
7. [Implantar Firebase Hosting](#implantar-firebase-hosting)
8. [Implantar Cloud Functions](#implantar-cloud-functions)
9. [Estrutura do Firestore](#estrutura-do-firestore)
10. [Checklist de Testes](#checklist-de-testes)

---

## Visão Geral

| Funcionalidade | Descrição |
|---|---|
| 🎓 Banco de Sinais | 5 disciplinas: Biologia, Química, Física, Genética, Banco Geral |
| 🎬 Player Modal | Vídeo YouTube ou MP4, transcrição, likes, favoritos, rating 1–5 |
| 🔍 Busca Global | Filtragem instantânea (client-side) por termo ou descrição |
| 📤 Upload | Contribuintes autenticados enviam vídeos → fila de moderação |
| 🛡 Moderação | Painel admin: aprovar/rejeitar sinais pendentes |
| 🏆 Leaderboard | Ranking de contribuidores com badges automáticos |
| 📦 Exportar ZIP | Pacote didático (.zip) com todos os termos aprovados |
| 📱 PWA | Instalável, funciona offline (Service Worker) |
| ♿ Acessibilidade | Alto contraste, `prefers-reduced-motion`, ARIA completo |

---

## Estrutura de Arquivos

```
projeto libras/
├── index.html              ← SPA principal (7 telas + modal)
├── style.css               ← Design system completo
├── script.js               ← Toda a lógica (Firebase + fallback local)
├── manifest.json           ← Manifesto PWA
├── sw.js                   ← Service Worker (offline)
├── firebase.rules          ← Regras Firestore + Storage (comentadas)
├── cloudfunction_notify.js ← Cloud Function: notificação + pontos
├── data/
│   └── terms.json          ← 10 sinais de exemplo (fallback local)
├── assets/
│   ├── icon-192.png        ← Ícone PWA (criar/substituir)
│   └── icon-512.png        ← Ícone PWA (criar/substituir)
└── videos/                 ← (opcional) vídeos locais
```

---

## Como Executar Localmente

### Opção A — VS Code Live Server (recomendado)
1. Instale a extensão **Live Server** no VS Code.
2. Clique com o botão direito em `index.html` → **Open with Live Server**.
3. A plataforma abrirá em `http://127.0.0.1:5500` com fallback local.

### Opção B — Python HTTP Server
```bash
# Python 3
python -m http.server 5500
# Acesse: http://localhost:5500
```

### Opção C — Node.js
```bash
npx serve .
```

> **Modo Offline / Fallback:** Quando `apiKey === "REPLACE_ME"` em `script.js`, a plataforma carrega automaticamente `data/terms.json` sem precisar do Firebase.

---

## Configurar Firebase

### 1. Criar Projeto
1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. **Criar projeto** → defina o nome → desative Google Analytics (opcional).

### 2. Ativar Serviços
- **Authentication** → Provedores de login → Google → Ativar
- **Firestore Database** → Criar banco → Modo de produção (regras abaixo)
- **Storage** → Ativar (plano Blaze necessário para Cloud Functions)

### 3. Obter Credenciais
1. Engrenagem ⚙️ → Configurações do projeto → **Seus apps** → Web (`</>`).
2. Copie o objeto `firebaseConfig`.

### 4. Colar em `script.js`
```javascript
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSy...",
  authDomain:        "meu-projeto.firebaseapp.com",
  projectId:         "meu-projeto",
  storageBucket:     "meu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

### 5. Implantar Regras de Segurança
Copie as regras do arquivo `firebase.rules` para o console Firebase:
- **Firestore** → Regras → cole o bloco `rules_version = '2'` de Firestore
- **Storage** → Regras → cole o bloco de Storage

---

## Configurar Admin UID

1. No console Firebase → Authentication → usuários → faça login na plataforma uma vez com sua conta Google.
2. Copie o **UID** do seu usuário (coluna UID na lista de usuários).
3. Substitua em `script.js`:
```javascript
const ADMIN_UID = "SEU_UID_AQUI"; // ex: "abc123xyz456"
```
4. Substitua também nas regras Firestore em `firebase.rules`:
```
function isAdmin() {
  return isAuthenticated() && request.auth.uid == "SEU_UID_AQUI";
}
```

---

## Alternativa: Supabase

Caso prefira Supabase ao Firebase:

### Schema SQL
```sql
-- Tabela de sinais aprovados
CREATE TABLE terms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  termo       TEXT NOT NULL,
  disciplina  TEXT NOT NULL CHECK (disciplina IN ('biologia','quimica','fisica','genetica','banco')),
  descricao   TEXT,
  video_url   TEXT,
  thumbnail   TEXT,
  contribuinte TEXT,
  contribuinte_uid UUID REFERENCES auth.users(id),
  curtidas    INTEGER DEFAULT 0,
  rating_avg  FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'approved',
  criado_em   TIMESTAMPTZ DEFAULT now()
);

-- Tabela de pendentes
CREATE TABLE pending (LIKE terms INCLUDING ALL);

-- Storage bucket para vídeos
-- Supabase Dashboard → Storage → Create bucket "videos" (público)
```

### Upload com Supabase JS
```javascript
import { createClient } from "https://esm.sh/@supabase/supabase-js";
const supabase = createClient("https://xxx.supabase.co", "anon-key");

// Upload
const { data, error } = await supabase.storage
  .from("videos")
  .upload(`${userId}/${Date.now()}_${file.name}`, file);
const videoUrl = supabase.storage.from("videos").getPublicUrl(data.path).data.publicUrl;
```

---

## Implantar Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: .   (raiz do projeto)
# Single-page app: No  (temos index.html com roteamento próprio)
firebase deploy --only hosting
```

---

## Implantar Cloud Functions

```bash
cd functions/
npm init -y
npm install firebase-admin firebase-functions nodemailer
# Copie cloudfunction_notify.js para functions/index.js
firebase deploy --only functions
```

Configurar variáveis de ambiente:
```bash
firebase functions:secrets:set EMAIL_USER
firebase functions:secrets:set EMAIL_PASS
firebase functions:secrets:set ADMIN_EMAIL
```

---

## Estrutura do Firestore

### Coleção `terms`
```json
{
  "id": "auto-gerado",
  "termo": "Fotossíntese",
  "disciplina": "biologia",
  "descricao": "Processo de conversão de luz em energia...",
  "videoUrl": "https://storage.googleapis.com/...",
  "thumbnail": "https://storage.googleapis.com/...",
  "contribuinte": "Prof. Ana Lima",
  "contribuinteUid": "uid-firebase-auth",
  "curtidas": 62,
  "ratingAvg": 4.9,
  "ratingCount": 30,
  "status": "approved",
  "criadoEm": "Timestamp"
}
```

### Sub-coleção `terms/{id}/ratings`
```json
{
  "uid-usuario": { "valor": 5, "uid": "uid-usuario" }
}
```

### Coleção `pending`
Mesma estrutura de `terms` com `status: "pending"`.

### Coleção `users`
```json
{
  "uid-firebase": {
    "nome": "Prof. Ana Lima",
    "pontos": 500,
    "totalSinais": 10,
    "badges": ["🌱 Iniciante", "📖 Colaborador", "⭐ Contribuidor"],
    "favoritos": ["termo-001", "termo-004"]
  }
}
```

---

## Checklist de Testes

### Fluxo Básico (sem Firebase)
- [ ] Tela inicial exibe animação e botão INICIAR
- [ ] Menu exibe 5 disciplinas com contador de sinais
- [ ] Clicar em disciplina lista os termos de `data/terms.json`
- [ ] Busca global filtra por nome e descrição
- [ ] Player abre com vídeo/placeholder, curtidas e rating
- [ ] ESC / botão X fecha o modal
- [ ] Alto contraste ativável pelo botão ♿

### Fluxo Firebase (após configurar)
- [ ] Login com Google funciona
- [ ] Botão admin aparece apenas para o ADMIN_UID
- [ ] Upload de vídeo aparece na coleção `pending`
- [ ] Admin pode aprovar/rejeitar pendentes
- [ ] Curtida incrementa atomicamente no Firestore
- [ ] Favorito persiste após reload
- [ ] Leaderboard exibe ranking de `users`
- [ ] Exportar ZIP baixa arquivo com todos os termos

### PWA
- [ ] Instalar app (botão na barra de endereço do Chrome)
- [ ] Modo avião: tela inicial carrega do cache
- [ ] DevTools → Application → Service Workers → Status: "activated and is running"

---

## Badges do Sistema de Gamificação

| Badge | Requisito |
|---|---|
| 🌱 Iniciante | 1 sinal aprovado |
| 📖 Colaborador | 5 sinais aprovados |
| ⭐ Contribuidor | 15 sinais aprovados |
| 🏆 Embaixador Libras | 30 sinais aprovados |

**Pontuação:** 50 pts por sinal aprovado + 1 pt por curtida recebida.

---

## Licença

MIT — Uso livre para fins educacionais e de pesquisa.  
Créditos apreciados: **LibrasEVA – Plataforma de Ciência em Libras**
