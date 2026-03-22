<!-- ============================================
     INSTRUÇÕES PARA OS VÍDEOS
     ============================================ -->

<!--
ESTRUTURA DE VÍDEOS NECESSÁRIOS

Este diretório deve conter vídeos em formato MP4 demonstrando os sinais
corretos em Libras para cada termo científico.

VÍDEOS NECESSÁRIOS:
==================

1. celula-libras.mp4
   - Duração: 10-15 segundos
   - Mostra o sinal de "Célula" em Libras
   - Repetição clara do gesto
   - Fundo neutro
   - Resolução: 640x480 ou superior

2. mitocondria-libras.mp4
   - Sinal de "Mitocôndria"
   - Mesmo padrão de qualidade

3. fotossintese-libras.mp4
   - Sinal de "Fotossíntese"

4. dna-libras.mp4
   - Sinal de "DNA"

5. proteina-libras.mp4
   - Sinal de "Proteína"


COMO CRIAR OS VÍDEOS:
====================

Opção 1: Recurso Profissional
- Contrate um intérprete de Libras qualificado
- Grave em estúdio com boa iluminação e câmera de qualidade
- Respeite as convenções da Libras

Opção 2: Recurso Online
- Use plataformas como:
  * RYBENA (repositório de sinais)
  * Dicionário Virtual de Libras
  * YouTube - canais de educadores surdos

Opção 3: Simulação Temporária
- Use animações 3D de sinais
- Crie vídeos sintetizados
- Ideal para prototipagem


ESPECIFICAÇÕES TÉCNICAS:
=======================

Formato: MP4 (H.264 codec)
Codificação: H.264 video, AAC audio
Resolução: 640x480 até 1920x1080
Taxa de quadros: 30fps
Bitrate: 500-2000 kbps
Tamanho máximo: 50MB por vídeo

Nota: O navegador carrega os vídeos do lado do cliente.
Vídeos grandes afetarão o tempo de carregamento.


ALTERNATIVA: PLACEHOLDER PARA TESTES
====================================

Se você não tem os vídeos ainda, pode:

1. Criar vídeos placeholder em branco
2. Usar ferramenta como FFmpeg:

   ffmpeg -f lavfi -i color=c=white:s=640x480:d=5 \
           -f lavfi -i anullsrc=r=44100:cl=mono:d=5 \
           -pix_fmt yuv420p -c:v libx264 -c:a aac \
           celula-libras.mp4

3. Ou colocar um card HTML em vez de vídeo no código


ESTRUTURA DE MARCAÇÃO EM HTML:
=============================

<video id="videoLibras" class="video-libras" controls>
    <source src="videos/celula-libras.mp4" type="video/mp4">
    <source src="videos/celula-libras.webm" type="video/webm">
    Seu navegador não suporta vídeos HTML5
</video>


DIREITOS AUTORAIS:
==================

⚠️ IMPORTANTE: 
- Respeite os direitos de uso dos vídeos
- Obtenha permissão do criador
- Cite os intérpretes/criadores
- Não distribua sem autorização

Para vídeos licenciados livremente:
- Procure por conteúdo Creative Commons
- Use bancos de vídeos educacionais
- Consulte plataformas de Libras abertas


OTIMIZAÇÃO PARA WEB:
===================

Comprima os vídeos para web usando:

ffmpeg -i video.mp4 -b:v 1000k -vf scale=640:-1 \
       -c:v libx264 -preset slow -c:a aac \
       video-otimizado.mp4

Conversão para WebM (melhor compressão):

ffmpeg -i video.mp4 -c:v libvpx-vp9 -b:v 500k \
       -c:a libopus video.webm

-->

<!-- Nota: Este arquivo é apenas documentação. 
     O projeto carrega os vídeos via <video> tag no HTML. -->
