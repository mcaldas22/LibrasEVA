const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "videos para adicionar");
const OUTPUT_FILE = path.join(__dirname, "videos.json");
const VIDEO_PLACEHOLDER = "INSIRA_LINK_GUMLET_AQUI";
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm", ".mov", ".mkv", ".avi", ".wmv"]);

function removeAcentos(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function limparNomeArquivo(nomeBase) {
  const semAcento = removeAcentos(nomeBase);
  const apenasSeguro = semAcento
    .replace(/[^a-zA-Z0-9._\-\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const semEspacoExtremos = apenasSeguro.replace(/^\.+|\.+$/g, "");
  return semEspacoExtremos || "arquivo";
}

function normalizarParaChave(texto) {
  return removeAcentos(texto).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function carregarMapaTermosAcentuados() {
  const mapa = new Map();
  const advancedPath = path.join(__dirname, "data", "advanced_catalog.json");
  if (!fs.existsSync(advancedPath)) return mapa;

  try {
    const raw = fs.readFileSync(advancedPath, "utf8");
    const json = JSON.parse(raw);
    const disciplinas = Array.isArray(json.disciplinas) ? json.disciplinas : [];

    for (const disc of disciplinas) {
      const discNome = disc.label || disc.nome || "";
      const termos = Array.isArray(disc.termos) ? disc.termos : [];
      for (const termo of termos) {
        const nome = termo.nome || termo.termo || "";
        if (!discNome || !nome) continue;
        const key = `${normalizarParaChave(discNome)}|${normalizarParaChave(nome)}`;
        mapa.set(key, nome);
      }
    }
  } catch {
    // Se falhar, segue sem mapa extra.
  }

  return mapa;
}

function listarArquivosDeVideoRecursivo(dirPath) {
  const videos = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      videos.push(...listarArquivosDeVideoRecursivo(fullPath));
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (VIDEO_EXTENSIONS.has(ext)) {
      videos.push(fullPath);
    }
  }

  return videos;
}

function listarArquivosDeVideoDireto(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => ({ name: entry.name, fullPath: path.join(dirPath, entry.name) }))
    .filter((entry) => VIDEO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()));
}

function possuiVideoRecursivo(dirPath) {
  return listarArquivosDeVideoRecursivo(dirPath).length > 0;
}

function resolverRaizConteudo(rootPath) {
  let atual = rootPath;

  // Desce automaticamente por camadas técnicas que só encapsulam o conteúdo.
  // Ex.: videos para adicionar/720p_mp4/
  while (true) {
    const entries = fs.readdirSync(atual, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());
    const files = entries.filter((e) => e.isFile());

    if (dirs.length === 1 && files.length === 0) {
      atual = path.join(atual, dirs[0].name);
      continue;
    }
    break;
  }

  return atual;
}

function resolverPastaDisciplina(candidatoDir) {
  const entries = fs.readdirSync(candidatoDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory());
  const videosDiretos = listarArquivosDeVideoDireto(candidatoDir);

  // Estrutura comum de zip extraído: <zip>/<disciplina>/<arquivos>
  if (videosDiretos.length === 0 && dirs.length === 1) {
    const inner = path.join(candidatoDir, dirs[0].name);
    if (possuiVideoRecursivo(inner)) return inner;
  }

  return candidatoDir;
}

function gerarDescricao(termo) {
  const termoNormalizado = removeAcentos(termo).toLowerCase();
  const conceitos = {
    celula: "estrutura fundamental dos seres vivos",
    fotossintese: "processo biologico de conversao de energia luminosa",
    mitocondria: "organela responsavel pela producao de energia celular",
    fracao: "representacao numerica de partes de um todo",
    geometria: "ramo da matematica que estuda formas e espaco",
    algoritmo: "sequencia logica de passos para resolver um problema",
  };

  const conceito = conceitos[termoNormalizado] || "conceito cientifico relevante para o estudo da disciplina";
  return `${termo} e um ${conceito}. Esse termo ajuda a compreender fenomenos, processos e aplicacoes praticas de forma objetiva.`;
}

function gerarVideosJson() {
  if (!fs.existsSync(ROOT_DIR)) {
    throw new Error(`Pasta nao encontrada: ${ROOT_DIR}`);
  }

  // Regra 9: os nomes de arquivo podem ser normalizados internamente para matching,
  // sem perder acentos no campo de exibicao "termo".
  const mapaAcentuado = carregarMapaTermosAcentuados();

  const raizConteudo = resolverRaizConteudo(ROOT_DIR);

  const disciplinasEntries = fs
    .readdirSync(raizConteudo, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());

  const resultado = {};
  let totalTermosProcessados = 0;

  for (const disciplinaEntry of disciplinasEntries) {
    const disciplinaContainerPath = path.join(raizConteudo, disciplinaEntry.name);
    const disciplinaPath = resolverPastaDisciplina(disciplinaContainerPath);
    const disciplinaNome = path.basename(disciplinaPath);

    const termoEntries = fs
      .readdirSync(disciplinaPath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory());

    const itensDisciplina = [];

    const termosJaIncluidos = new Set();

    for (const termoEntry of termoEntries) {
      const termoNomeBase = termoEntry.name; // Mantem acentos no campo termo.
      const keyAcento = `${normalizarParaChave(disciplinaNome)}|${normalizarParaChave(termoNomeBase)}`;
      const termoNome = mapaAcentuado.get(keyAcento) || termoNomeBase;
      const termoPath = path.join(disciplinaPath, termoNomeBase);
      const videos = listarArquivosDeVideoRecursivo(termoPath);

      // Nao ignora pastas: contabiliza o termo mesmo sem video.
      totalTermosProcessados += 1;

      if (!videos.length) {
        termosJaIncluidos.add(termoNome);
        itensDisciplina.push({
          termo: termoNome,
          video: VIDEO_PLACEHOLDER,
          descricao: gerarDescricao(termoNome),
        });
        continue;
      }

      // Nao ignora nenhum arquivo de video: gera um item para cada video encontrado.
      for (const _videoFile of videos) {
        termosJaIncluidos.add(termoNome);
        itensDisciplina.push({
          termo: termoNome,
          video: VIDEO_PLACEHOLDER,
          descricao: gerarDescricao(termoNome),
        });
      }
    }

    // Suporte para disciplina com vídeos diretos (sem pasta de termo):
    // cada arquivo vira um termo.
    const videosDiretos = listarArquivosDeVideoDireto(disciplinaPath);
    for (const videoEntry of videosDiretos) {
      const termoNomeArquivo = path.basename(videoEntry.name, path.extname(videoEntry.name));
      const keyAcento = `${normalizarParaChave(disciplinaNome)}|${normalizarParaChave(termoNomeArquivo)}`;
      const termoNome = mapaAcentuado.get(keyAcento) || termoNomeArquivo;
      if (!termosJaIncluidos.has(termoNome)) {
        totalTermosProcessados += 1;
        termosJaIncluidos.add(termoNome);
      }
      itensDisciplina.push({
        termo: termoNome,
        video: VIDEO_PLACEHOLDER,
        descricao: gerarDescricao(termoNome),
      });
    }

    itensDisciplina.sort((a, b) => a.termo.localeCompare(b.termo, "pt-BR"));
    resultado[disciplinaNome] = itensDisciplina;
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(resultado, null, 2), "utf8");

  console.log(`Disciplinas encontradas: ${disciplinasEntries.length}`);
  console.log(`Termos processados: ${totalTermosProcessados}`);
  console.log(`Arquivo gerado em: ${OUTPUT_FILE}`);
}

try {
  gerarVideosJson();
} catch (error) {
  console.error("Erro ao gerar videos.json:", error.message);
  process.exit(1);
}
