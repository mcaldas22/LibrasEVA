// LibrasEVA - importacao automatica por estrutura de pastas locais

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".wmv"];

let termosCache = [];
let currentDisciplina = null;
let currentTermoId = null;

function $(id) { return document.getElementById(id); }

function normalizar(str = "") {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function slug(str = "") {
  return normalizar(str).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function mostrarToast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 2800);
}

function mostrarTela(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  const tela = $(id);
  if (tela) tela.classList.add("active");
}

function extrairNomeArquivo(pathname = "") {
  const p = pathname.split("/").filter(Boolean);
  return decodeURIComponent(p[p.length - 1] || "");
}

function ext(pathname = "") {
  const n = extrairNomeArquivo(pathname).toLowerCase();
  const i = n.lastIndexOf(".");
  return i >= 0 ? n.slice(i) : "";
}

function ehVideo(pathname = "") {
  return VIDEO_EXTENSIONS.includes(ext(pathname));
}

function normalizarSrcVideo(src = "") {
  if (!src) return "";
  const limpo = src.replace(/\\/g, "/");
  // Preserve already-encoded URLs and encode spaces/acentos when needed.
  try {
    return encodeURI(decodeURI(limpo));
  } catch {
    return encodeURI(limpo);
  }
}

async function listarEntradasDiretorio(dirUrl) {
  const res = await fetch(dirUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao ler diretorio: ${dirUrl}`);
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  const anchors = [...doc.querySelectorAll("a")];
  const out = [];

  anchors.forEach((a) => {
    const href = a.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("?")) return;
    if (href.startsWith("../")) return;

    const abs = new URL(href, dirUrl);
    const isDir = href.endsWith("/");
    const name = decodeURIComponent((href.endsWith("/") ? href.slice(0, -1) : href).split("/").pop() || "");

    // ignora entradas tecnicas
    if (!name || name === "." || name === "..") return;

    out.push({
      name,
      isDir,
      url: abs.toString(),
      path: abs.pathname
    });
  });

  return out;
}

async function coletarVideosRecursivo(dirUrl) {
  const entries = await listarEntradasDiretorio(dirUrl);
  const videos = [];

  for (const e of entries) {
    if (e.isDir) {
      const nested = await coletarVideosRecursivo(e.url);
      videos.push(...nested);
    } else if (ehVideo(e.path)) {
      videos.push({
        fileName: e.name,
        url: e.path
      });
    }
  }

  videos.sort((a, b) => a.fileName.localeCompare(b.fileName, "pt-BR"));
  return videos;
}

function explicacaoCurta(termo, disciplina) {
  const key = normalizar(termo);
  const base = {
    "celula": "Unidade basica da vida. E a menor estrutura capaz de realizar as funcoes vitais dos seres vivos.",
    "mitocondria": "Organela celular responsavel pela producao de energia na celula por meio da respiracao celular.",
    "fotossintese": "Processo realizado por plantas e algas que transforma luz solar em energia quimica. Esse processo sustenta cadeias alimentares e libera oxigenio.",
    "proteina": "Molecula essencial formada por aminoacidos. Atua em funcoes estruturais, metabolicas e de defesa no organismo.",
    "energia": "Capacidade de realizar trabalho ou provocar transformacoes. Aparece em formas como mecanica, termica e eletrica.",
    "ligacao quimica": "Interacao entre atomos que forma substancias. Define propriedades e estabilidade dos compostos.",
    "ligacao ionica": "Ligacao formada pela transferencia de eletrons entre atomos. Gera ions positivos e negativos que se atraem.",
    "dna": "Molecula que armazena informacoes geneticas. Orienta o desenvolvimento e funcionamento dos seres vivos.",
    "mutacao": "Alteracao na sequencia do material genetico. Pode gerar variacoes hereditarias e, em alguns casos, doencas.",
    "reacao quimica": "Processo em que reagentes se transformam em novos produtos. Ocorre com reorganizacao de atomos e energia."
  };

  if (base[key]) return base[key];

  return `${termo} e um conceito importante em ${disciplina}. Esse termo ajuda a explicar processos cientificos de forma objetiva.`;
}

function explicacaoElaborada(termo, disciplina, descricaoBase = "") {
  const disc = canonizarDisciplina(disciplina).label;
  const focoPorDisciplina = {
    "Ciências da Natureza": "Esse tema se relaciona com processos biologicos, ambientais e de saude, ajudando a interpretar fenomenos do cotidiano com base cientifica.",
    "Ciências Humanas e suas Tecnologias": "A compreensao desse conceito fortalece a leitura critica de contextos historicos, sociais, politicos e culturais.",
    "Linguagens, Códigos e suas Tecnologias": "O estudo desse termo melhora a comunicacao, a interpretacao textual e o uso consciente das linguagens em diferentes midias.",
    "Matemática e suas Tecnologias": "Esse conteudo desenvolve raciocinio logico, modelagem de problemas e tomada de decisao com base em dados e medidas."
  };

  const foco = focoPorDisciplina[disc] || "Esse conceito e relevante para organizar conhecimento, resolver problemas e ampliar o pensamento critico.";
  const aplicacao = `Na pratica, ${termo} aparece em situacoes de estudo, comunicacao e analise, conectando teoria e aplicacao real.`;

  if (descricaoBase && descricaoBase.trim()) {
    return `${descricaoBase.trim()} ${foco} ${aplicacao}`;
  }

  return `${termo} e um conceito importante em ${disc}. Ele contribui para compreender estruturas, relacoes e processos da area. ${foco} ${aplicacao}`;
}

function limparNomeDisciplina(nome) {
  return nome.replace(/-\d{8}T\d+Z-\d+-\d+$/i, "").trim();
}

function canonizarDisciplina(nomeOuId = "") {
  const bruto = (nomeOuId || "").trim();
  const n = normalizar(bruto).replace(/[^a-z0-9]+/g, " ").trim();

  if (n.includes("ciencias da natureza")) {
    return { id: "ciencias-natureza", label: "Ciências da Natureza" };
  }
  if (n.includes("ciencias humanas")) {
    return { id: "ciencias-humanas", label: "Ciências Humanas e suas Tecnologias" };
  }
  if (n.includes("linguagens codigos")) {
    return { id: "linguagens-codigos", label: "Linguagens, Códigos e suas Tecnologias" };
  }
  if (n.includes("matematica")) {
    return { id: "matematica-tecnologias", label: "Matemática e suas Tecnologias" };
  }
  if (n.includes("biologia")) return { id: "biologia", label: "Biologia" };
  if (n.includes("quimica")) return { id: "quimica", label: "Química" };
  if (n.includes("fisica")) return { id: "fisica", label: "Física" };
  if (n.includes("genetica")) return { id: "genetica", label: "Genética" };
  if (n.includes("banco")) return { id: "banco", label: "Banco de Sinais" };

  if (!bruto) return { id: "outras", label: "Outras" };
  return { id: slug(bruto), label: bruto };
}

async function carregarMapaDescricoesAvancadas() {
  try {
    const res = await fetch("./data/advanced_catalog.json", { cache: "no-store" });
    if (!res.ok) return new Map();
    const catalog = await res.json();
    const mapa = new Map();

    (catalog.disciplinas || []).forEach((disc) => {
      const canon = canonizarDisciplina(disc.label || disc.id);
      (disc.termos || []).forEach((termo) => {
        const chave = `${canon.id}|${normalizar(termo.nome)}`;
        mapa.set(chave, termo.descricao || "");
      });
    });

    return mapa;
  } catch (e) {
    console.error("Falha ao carregar advanced_catalog.json:", e);
    return new Map();
  }
}

async function carregarCatalogoLocalJson() {
  try {
    const res = await fetch("./data/local_catalog.json", { cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json();
    const termos = (payload.termos || []).map((item) => {
      const canon = canonizarDisciplina(item.disciplinaNome || item.disciplinaId);
      const videoSrc = normalizarSrcVideo(item.videoPath || "");
      return {
        id: `${canon.id}-${slug(item.termo || item.id || "termo")}`,
        termo: item.termo,
        disciplinaId: canon.id,
        disciplinaNome: canon.label,
        descricao: item.explicacao || explicacaoCurta(item.termo || "Termo", canon.label),
        videos: videoSrc ? [{ fileName: extrairNomeArquivo(videoSrc), src: videoSrc }] : []
      };
    }).filter((t) => t.termo && t.videos.length);

    termos.sort((a, b) => {
      const d = a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR");
      if (d !== 0) return d;
      return a.termo.localeCompare(b.termo, "pt-BR");
    });

    return termos;
  } catch (e) {
    console.error("Falha ao carregar local_catalog.json:", e);
    return [];
  }
}

async function carregarCatalogoDasPastas() {
  const rootUrl = new URL("./videos para adicionar/", window.location.href).toString();
  let rootEntries = await listarEntradasDiretorio(rootUrl);

  // Suporte a pasta intermediaria de conversao, ex.: videos para adicionar/720p_mp4/...
  const pastaConversao = rootEntries.find((e) => e.isDir && normalizar(e.name) === "720p_mp4");
  if (pastaConversao) {
    rootEntries = await listarEntradasDiretorio(pastaConversao.url);
  }

  const disciplinas = rootEntries
    .filter((e) => e.isDir)
    .filter((e) => !e.name.startsWith("_"))
    .map((e) => ({
      nome: limparNomeDisciplina(e.name),
      id: slug(limparNomeDisciplina(e.name)),
      url: e.url
    }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const termos = [];

  const adicionarTermo = (disciplinaObj, termoNome, videos) => {
    if (!termoNome || !videos || !videos.length) return;
    const canon = canonizarDisciplina(disciplinaObj.nome || disciplinaObj.label || disciplinaObj.id || "Outras");
    termos.push({
      id: `${canon.id}-${slug(termoNome)}`,
      termo: termoNome,
      disciplinaId: canon.id,
      disciplinaNome: canon.label,
      descricao: explicacaoCurta(termoNome, canon.label),
      videos: videos
        .map((v) => ({ fileName: v.fileName, src: normalizarSrcVideo(v.url || v.src) }))
        .sort((a, b) => a.fileName.localeCompare(b.fileName, "pt-BR"))
    });
  };

  for (const disc of disciplinas) {
    const entries = await listarEntradasDiretorio(disc.url);

    // Estrutura de zip: <zip>/<disciplina>/<arquivos-de-termos>
    if (entries.length === 1 && entries[0].isDir) {
      const possivelPastaDisc = entries[0];
      const canonDisc = canonizarDisciplina(disc.nome);
      const canonPasta = canonizarDisciplina(possivelPastaDisc.name);

      if (canonDisc.id === canonPasta.id) {
        const videosDentro = await coletarVideosRecursivo(possivelPastaDisc.url);
        videosDentro.forEach((v) => {
          const termoNome = extrairNomeArquivo(v.path || v.url).replace(/\.[^.]+$/, "");
          adicionarTermo(disc, termoNome, [{ fileName: v.fileName, url: v.url }]);
        });
        continue;
      }
    }

    // cada subpasta da disciplina representa um termo
    const termFolders = entries.filter((e) => e.isDir);

    for (const tf of termFolders) {
      const termoNome = tf.name.trim();
      if (!termoNome) continue;

      const videos = await coletarVideosRecursivo(tf.url);
      if (!videos.length) continue;

      adicionarTermo(disc, termoNome, videos);
    }

    // suporte extra: video direto dentro da disciplina (termo = nome do arquivo)
    const directVideos = entries.filter((e) => !e.isDir && ehVideo(e.path));
    directVideos.forEach((v) => {
      const termoNome = extrairNomeArquivo(v.path).replace(/\.[^.]+$/, "");
      adicionarTermo(disc, termoNome, [{ fileName: extrairNomeArquivo(v.path), url: v.path }]);
    });
  }

  // Fallback para estrutura de zip extraido: _extraido/<zip>/<disciplina>/<videos|subpastas>
  if (!disciplinas.length) {
    const extraidoUrl = new URL("./videos para adicionar/_extraido/", window.location.href).toString();
    let zipPastas = [];
    try {
      zipPastas = (await listarEntradasDiretorio(extraidoUrl)).filter((e) => e.isDir);
    } catch {
      zipPastas = [];
    }

    const agrupado = new Map();

    for (const zipPasta of zipPastas) {
      let disciplinaPastas = [];
      try {
        disciplinaPastas = (await listarEntradasDiretorio(zipPasta.url)).filter((e) => e.isDir);
      } catch {
        disciplinaPastas = [];
      }

      for (const discPasta of disciplinaPastas) {
        const canon = canonizarDisciplina(discPasta.name);
        const videosDisciplina = await coletarVideosRecursivo(discPasta.url);

        videosDisciplina.forEach((v) => {
          let termo = v.fileName.replace(/\.[^.]+$/, "");

          // Se o arquivo se chama "video.*", usa o nome da pasta pai como termo.
          if (normalizar(termo) === "video") {
            const pathDecoded = decodeURI(v.url);
            const partes = pathDecoded.split("/").filter(Boolean);
            if (partes.length >= 2) termo = partes[partes.length - 2];
          }

          const key = `${canon.id}|${slug(termo)}`;
          if (!agrupado.has(key)) {
            agrupado.set(key, {
              disciplinaId: canon.id,
              disciplinaNome: canon.label,
              termo,
              videos: []
            });
          }
          agrupado.get(key).videos.push({ fileName: v.fileName, url: v.url });
        });
      }
    }

    [...agrupado.values()].forEach((g) => {
      adicionarTermo(
        { id: g.disciplinaId, nome: g.disciplinaNome },
        g.termo,
        g.videos
      );
    });
  }

  // ordenacao alfabetica por disciplina e termo
  termos.sort((a, b) => {
    const d = a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR");
    if (d !== 0) return d;
    return a.termo.localeCompare(b.termo, "pt-BR");
  });

  // sem duplicacao de termo por disciplina
  const seen = new Set();
  termosCache = termos.filter((t) => {
    const key = `${normalizar(t.disciplinaId)}|${normalizar(t.termo)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Enriquecer descricoes com base no advanced_catalog.json, sem alterar origem dos videos
  const mapaDescricoes = await carregarMapaDescricoesAvancadas();
  termosCache = termosCache.map((t) => {
    const chave = `${normalizar(t.disciplinaId)}|${normalizar(t.termo)}`;
    const baseDescricao = mapaDescricoes.get(chave) || "";
    return {
      ...t,
      descricao: explicacaoElaborada(t.termo, t.disciplinaNome, baseDescricao)
    };
  });

  // Ordenar novamente após mesclar
  termosCache.sort((a, b) => {
    const d = a.disciplinaNome.localeCompare(b.disciplinaNome, "pt-BR");
    if (d !== 0) return d;
    return a.termo.localeCompare(b.termo, "pt-BR");
  });

  // Fallback final: usa local_catalog.json apenas se a leitura por pastas nao trouxe termos.
  if (!termosCache.length) {
    const termosDoCatalogo = await carregarCatalogoLocalJson();
    if (termosDoCatalogo.length) {
      termosCache = termosDoCatalogo.map((t) => {
        const chave = `${normalizar(t.disciplinaId)}|${normalizar(t.termo)}`;
        const baseDescricao = mapaDescricoes.get(chave) || t.descricao || "";
        return { ...t, descricao: explicacaoElaborada(t.termo, t.disciplinaNome, baseDescricao) };
      });
    }
  }
}

function obterDisciplinas() {
  // Disciplinas padrão que sempre devem aparecer
  const disciplinasPadrao = [
    { id: "ciencias-natureza", label: "Ciências da Natureza", qtd: 0 },
    { id: "ciencias-humanas", label: "Ciências Humanas e suas Tecnologias", qtd: 0 },
    { id: "linguagens-codigos", label: "Linguagens, Códigos e suas Tecnologias", qtd: 0 },
    { id: "matematica-tecnologias", label: "Matemática e suas Tecnologias", qtd: 0 },
    { id: "biologia", label: "Biologia", qtd: 0 },
    { id: "quimica", label: "Química", qtd: 0 },
    { id: "fisica", label: "Física", qtd: 0 },
    { id: "genetica", label: "Genética", qtd: 0 },
    { id: "banco", label: "Banco de Sinais", qtd: 0 }
  ];
  
  const map = new Map(disciplinasPadrao.map(d => [d.id, { ...d }]));
  
  // Abrir contagem de termos dos arquivos lidos
  termosCache.forEach((t) => {
    if (map.has(t.disciplinaId)) {
      map.get(t.disciplinaId).qtd += 1;
    } else {
      map.set(t.disciplinaId, { id: t.disciplinaId, label: t.disciplinaNome, qtd: 1 });
    }
  });
  
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}

function renderGridDisciplinas() {
  const grid = document.querySelector(".disciplinas-grid");
  if (!grid) return;
  grid.innerHTML = "";

  const disciplinas = obterDisciplinas();
  if (!disciplinas.length) {
    grid.innerHTML = "<p class='empty-msg'>Nenhuma disciplina encontrada em 'videos para adicionar'.</p>";
    return;
  }

  // Mapa de cores por ID de disciplina
  const coresPorDisciplina = {
    "biologia": { cor: "#22c55e", emoji: "🧬" },
    "quimica": { cor: "#f59e0b", emoji: "⚗️" },
    "fisica": { cor: "#3b82f6", emoji: "⚡" },
    "genetica": { cor: "#a855f7", emoji: "🧪" },
    "banco": { cor: "#ef4444", emoji: "🖐️" },
    "ciencias-natureza": { cor: "#10b981", emoji: "🌿" },
    "ciencias-humanas": { cor: "#8b5cf6", emoji: "📚" },
    "linguagens-codigos": { cor: "#ec4899", emoji: "📖" },
    "matematica-tecnologias": { cor: "#06b6d4", emoji: "📐" }
  };

  const criarCardDisciplina = (d, emBreve = false) => {
    const config = coresPorDisciplina[d.id] || { cor: "#64748b", emoji: "📚" };
    const card = document.createElement("button");
    card.className = `disc-card${emBreve ? " disc-card-breve" : ""}`;
    card.setAttribute("aria-label", d.label);
    card.innerHTML = `
      <div class="disc-icone" style="--cor:${config.cor}">${config.emoji}</div>
      <span>${d.label}</span>
      <small>${emBreve ? "Em breve" : `${d.qtd} termo(s)`}</small>`;

    if (emBreve) {
      card.addEventListener("click", () => mostrarToast(`${d.label}: conteudo em breve.`));
    } else {
      card.addEventListener("click", () => irParaDisciplina(d.id));
    }

    return card;
  };

  const disponiveis = disciplinas.filter((d) => d.qtd > 0);
  const emBreve = disciplinas.filter((d) => d.qtd === 0);

  disponiveis.forEach((d) => grid.appendChild(criarCardDisciplina(d, false)));

  const cardContribuicoes = document.createElement("button");
  cardContribuicoes.className = "disc-card disc-card-breve";
  cardContribuicoes.setAttribute("aria-label", "Contribuições - em breve");
  cardContribuicoes.innerHTML = `
    <div class="disc-icone" style="--cor:#94a3b8">✍️</div>
    <span>Contribuições</span>
    <small>Em breve</small>`;
  cardContribuicoes.addEventListener("click", () => irParaContribuicoesEmBreve());

  if (disponiveis.length && (emBreve.length || cardContribuicoes)) {
    const separador = document.createElement("div");
    separador.className = "disciplinas-separador";
    separador.innerHTML = "<span>Em breve</span>";
    grid.appendChild(separador);
  }

  emBreve.forEach((d) => grid.appendChild(criarCardDisciplina(d, true)));
  grid.appendChild(cardContribuicoes);
}

function criarCardTermo(t) {
  const card = document.createElement("article");
  card.className = "termo-card";

  const firstVideo = t.videos[0]?.src || "";

  card.innerHTML = `
    <div class="termo-info">
      <h3 class="termo-nome">${t.termo}</h3>
      <p><strong>Disciplina:</strong> ${t.disciplinaNome}</p>
      <p class="termo-desc">${t.descricao}</p>
      <video class="termo-thumb" preload="metadata" muted src="${firstVideo}"></video>
      <button class="btn-assistir" aria-label="Assistir sinal de ${t.termo}">▶ Assistir (Libras)</button>
    </div>`;

  card.querySelector(".btn-assistir").addEventListener("click", () => abrirPlayer(t.id));
  return card;
}

function renderTermos(termos, containerId) {
  const c = $(containerId);
  if (!c) return;
  c.innerHTML = "";
  if (!termos.length) {
    c.innerHTML = "<p class='empty-msg'>Nenhum termo encontrado.</p>";
    return;
  }
  const frag = document.createDocumentFragment();
  termos.forEach((t) => frag.appendChild(criarCardTermo(t)));
  c.appendChild(frag);
}

function irParaStart() { mostrarTela("screen-start"); }

async function irParaMenu() {
  await carregarCatalogoDasPastas();
  renderGridDisciplinas();
  const totalTermos = termosCache.length;
  const totalVideos = termosCache.reduce((acc, t) => acc + (t.videos?.length || 0), 0);
  mostrarToast(`Importacao concluida: ${totalTermos} termos e ${totalVideos} videos.`);
  mostrarTela("screen-menu");
}

function irParaDisciplina(disciplinaId) {
  currentDisciplina = disciplinaId;

  const termoDaDisc = termosCache
    .filter((t) => t.disciplinaId === disciplinaId)
    .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));

  const titulo = $("disc-titulo");
  if (titulo && termoDaDisc[0]) titulo.textContent = termoDaDisc[0].disciplinaNome;

  const input = $("busca-disc-input");
  if (input) input.value = "";

  renderTermos(termoDaDisc, "termos-grid");
  mostrarTela("screen-discipline");
}

function filtrarTermosDisc(query) {
  const q = normalizar(query);
  const termos = termosCache
    .filter((t) => t.disciplinaId === currentDisciplina)
    .filter((t) => normalizar(t.termo).includes(q) || normalizar(t.descricao).includes(q))
    .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
  renderTermos(termos, "termos-grid");
}

function irParaBusca() {
  mostrarTela("screen-search");
  const i = $("busca-global-input");
  if (i) i.focus();
}

function irParaContribuicoesEmBreve() {
  mostrarTela("screen-contribuicoes-breve");
}

function buscarGlobal(query) {
  const q = normalizar(query || "");
  if (q.length < 2) {
    const c = $("busca-resultados");
    if (c) c.innerHTML = "<p class='empty-msg'>Digite pelo menos 2 letras.</p>";
    return;
  }
  const termos = termosCache
    .filter((t) => normalizar(t.termo).includes(q) || normalizar(t.descricao).includes(q))
    .sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
  renderTermos(termos, "busca-resultados");
}

function selecionarVideoTermo(src, btn) {
  const video = $("term-page-video");
  if (video) {
    video.src = src;
    video.load();
  }
  const list = $("term-page-videos-list");
  if (list) list.querySelectorAll(".auto-termo-tab").forEach((b) => b.classList.remove("ativo"));
  if (btn) btn.classList.add("ativo");
}

function abrirPlayer(termoId) {
  currentTermoId = termoId;
  const termo = termosCache.find((t) => t.id === termoId);
  if (!termo) return;

  const titulo = $("term-page-title");
  if (titulo) titulo.textContent = termo.termo;

  const disc = $("term-page-disc");
  if (disc) disc.textContent = `Disciplina: ${termo.disciplinaNome}`;

  const desc = $("term-page-desc");
  if (desc) desc.textContent = termo.descricao;

  const list = $("term-page-videos-list");
  if (list) {
    list.innerHTML = "";
    termo.videos.forEach((v, idx) => {
      const b = document.createElement("button");
      b.className = "auto-termo-tab";
      b.textContent = `Video ${idx + 1}`;
      b.addEventListener("click", () => selecionarVideoTermo(v.src, b));
      list.appendChild(b);
      if (idx === 0) selecionarVideoTermo(v.src, b);
    });
  }

  mostrarTela("screen-term");
}

function fecharPlayer() {
  const video = $("term-page-video");
  if (video) video.pause();
  currentTermoId = null;
}

function fecharModalFora() { }

function irParaDisciplinaAtual() {
  if (currentDisciplina) return irParaDisciplina(currentDisciplina);
  return irParaMenu();
}

// Recursos fora do escopo local
function irParaLeaderboard() { mostrarToast("Ranking desativado neste modo local."); }
function irParaUpload() { mostrarToast("Upload desativado neste modo local."); }
function irParaAdmin() { mostrarToast("Admin desativado neste modo local."); }
function toggleLogin() { mostrarToast("Login desativado neste modo local."); }
function curtirTermo() { }
function toggleFavorito() { }
function avaliar() { }
function adminMostrarAba() { }
function aprovarTermo() { }
function rejeitarTermo() { }
function exportarPacote() { }

function prepararInterfaceModoLocal() {
  const leaderboardScreen = $("screen-leaderboard");
  if (leaderboardScreen) leaderboardScreen.style.display = "none";

  const modalLegacy = $("modal-player");
  if (modalLegacy) modalLegacy.style.display = "none";

  const btnAdmin = $("btn-admin-nav");
  if (btnAdmin) btnAdmin.style.display = "none";
}

async function init() {
  // Limpar Service Workers antigos para forçar recarregar
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((reg) => reg.unregister());
    }).catch(() => {});
  }
  
  prepararInterfaceModoLocal();
  try {
    await irParaMenu();
  } catch (e) {
    console.error(e);
    mostrarToast("Falha ao importar videos automaticamente. Verifique a estrutura de pastas.");
  }
  mostrarTela("screen-start");

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fecharPlayer();
  });
}

document.addEventListener("DOMContentLoaded", init);

Object.assign(window, {
  irParaMenu,
  irParaStart,
  irParaDisciplina,
  irParaBusca,
  irParaContribuicoesEmBreve,
  buscarGlobal,
  filtrarTermosDisc,
  abrirPlayer,
  fecharPlayer,
  fecharModalFora,
  irParaDisciplinaAtual,
  irParaLeaderboard,
  irParaUpload,
  irParaAdmin,
  toggleLogin,
  curtirTermo,
  toggleFavorito,
  avaliar,
  adminMostrarAba,
  aprovarTermo,
  rejeitarTermo,
  exportarPacote
});
