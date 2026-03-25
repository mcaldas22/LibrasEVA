const fs = require("fs");
const path = require("path");

const PLAYLIST_URL_DEFAULT = "https://gumlet.tv/playlist/69c33f71bf49c9eb69bd34e1/";
const VIDEOS_JSON_PATH = path.join(__dirname, "videos.json");

function normalizarTexto(str = "") {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchTexto(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "accept-encoding": "identity",
      "user-agent": "Mozilla/5.0 (Node.js) LibrasEVA Sync"
    }
  });

  if (!res.ok) {
    throw new Error(`Falha HTTP ${res.status} ao buscar playlist`);
  }

  return await res.text();
}

function extrairCanal(html) {
  const padroes = [
    /"channel_id":"([a-zA-Z0-9]+)"/,
    /\\"channel_id\\":\\"([a-zA-Z0-9]+)\\"/,
    /channel_id[^a-zA-Z0-9]+([a-zA-Z0-9]{24})/
  ];

  for (const p of padroes) {
    const m = html.match(p);
    if (m && m[1]) return m[1];
  }

  return null;
}

function unescapeJsonString(s) {
  try {
    return JSON.parse(`"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`);
  } catch {
    return s;
  }
}

function extrairVideosPlaylist(html) {
  const videos = [];
  const vistos = new Set();

  const padroes = [
    /"asset_id":"([a-zA-Z0-9]+)","title":"([^"]+)"/g,
    /\\"asset_id\\":\\"([a-zA-Z0-9]+)\\",\\"title\\":\\"([^\\"]+)\\"/g
  ];

  for (const regex of padroes) {
    let match;
    while ((match = regex.exec(html)) !== null) {
      const assetId = match[1];
      const tituloBruto = match[2];
      const titulo = unescapeJsonString(tituloBruto);
      const chave = `${assetId}|${titulo}`;

      if (!vistos.has(chave)) {
        vistos.add(chave);
        videos.push({ assetId, titulo });
      }
    }
  }

  return videos;
}

function preencherVideosJson(videosJson, channelId, playlistVideos) {
  const mapaPorTitulo = new Map();

  for (const v of playlistVideos) {
    const k = normalizarTexto(v.titulo);
    if (!mapaPorTitulo.has(k)) {
      mapaPorTitulo.set(k, v);
    }
  }

  let totalAtualizados = 0;
  const naoEncontrados = [];

  for (const [disciplina, itens] of Object.entries(videosJson)) {
    if (!Array.isArray(itens)) continue;

    for (const item of itens) {
      const termo = item?.termo || "";
      const chave = normalizarTexto(termo);
      const videoPlaylist = mapaPorTitulo.get(chave);

      if (!videoPlaylist) {
        naoEncontrados.push(`${disciplina} :: ${termo}`);
        continue;
      }

      item.video = `https://video.gumlet.io/${channelId}/${videoPlaylist.assetId}/main.m3u8`;
      totalAtualizados += 1;
    }
  }

  return { totalAtualizados, naoEncontrados };
}

async function main() {
  const playlistUrl = process.argv[2] || PLAYLIST_URL_DEFAULT;

  if (!fs.existsSync(VIDEOS_JSON_PATH)) {
    throw new Error(`Arquivo nao encontrado: ${VIDEOS_JSON_PATH}`);
  }

  const html = await fetchTexto(playlistUrl);
  const channelId = extrairCanal(html);
  if (!channelId) {
    throw new Error("Nao foi possivel extrair o channel_id da playlist Gumlet.");
  }

  const playlistVideos = extrairVideosPlaylist(html);
  if (!playlistVideos.length) {
    throw new Error("Nenhum video encontrado na playlist Gumlet.");
  }

  const videosJson = JSON.parse(fs.readFileSync(VIDEOS_JSON_PATH, "utf8"));

  const { totalAtualizados, naoEncontrados } = preencherVideosJson(
    videosJson,
    channelId,
    playlistVideos
  );

  fs.writeFileSync(VIDEOS_JSON_PATH, JSON.stringify(videosJson, null, 2), "utf8");

  console.log(`Playlist analisada: ${playlistUrl}`);
  console.log(`channel_id: ${channelId}`);
  console.log(`Videos na playlist: ${playlistVideos.length}`);
  console.log(`Termos atualizados no videos.json: ${totalAtualizados}`);
  console.log(`Termos sem correspondencia: ${naoEncontrados.length}`);

  if (naoEncontrados.length) {
    console.log("--- Exemplos de termos sem correspondencia (max 20) ---");
    naoEncontrados.slice(0, 20).forEach((x) => console.log(x));
  }
}

main().catch((err) => {
  console.error("Erro ao preencher videos.json com Gumlet:", err.message);
  process.exit(1);
});
