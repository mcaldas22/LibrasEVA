<!-- ============================================
     INSTRUÇÕES: INTEGRAÇÃO DO TEACHABLE MACHINE
     ============================================ -->

<!--

PASSO A PASSO: Como Treinar e Integrar o Modelo
================================================

ETAPA 1: PREPARAR DADOS PARA TREINAMENTO
========================================

Você precisará de vídeos/imagens dos gestos em Libras para:
- background (nenhum gesto)
- celula (gesto de célula)
- mitocondria (gesto de mitocôndria)
- fotossintese (gesto de fotossíntese)
- dna (gesto de DNA)
- proteina (gesto de proteína)

Recomendações:
- 50-100 imagens por classe
- Diferentes ângulos e iluminações
- Diferentes pessoas fazendo os gestos
- Boa qualidade de câmera
- Fundo variado (melhor generalização)


ETAPA 2: ACESSAR TEACHABLE MACHINE
===================================

1. Abra: https://teachablemachine.withgoogle.com/
2. Clique em "Get Started"
3. Escolha: "Pose Model"
4. Nome do projeto: "Libras Cientifica"


ETAPA 3: COLETAR DADOS DE TREINAMENTO
======================================

Para cada classe (gesto):

1. Selecione a classe
2. Clique em "Hold to Record" ou "Upload Images"
3. Colete 50-100 exemplos
4. Varie: ângulos, distâncias, iluminação
5. Capture de uma câmera em tempo real se possível

Classes necessárias:
- Classe 0: "Background" (vazio, sem gesto)
  * Mão não visível
  * Apenas fundo
  * 30-50 imagens

- Classe 1: "Celula" (gesto de célula em Libras)
  * Pessoa fazendo o sinal
  * 50-100 imagens
  * Diferentes pessoas

- Classe 2: "Mitocondria"
  * 50-100 imagens

- Classe 3: "Fotossintese"
  * 50-100 imagens

- Classe 4: "DNA"
  * 50-100 imagens

- Classe 5: "Proteina"
  * 50-100 imagens


ETAPA 4: TREINAR O MODELO
==========================

1. No Teachable Machine, clique em "Train Model"
2. Aguarde o treinamento (pode demorar 5-10 minutos)
3. Veja a acurácia no gráfico
4. Teste em tempo real:
   - Clique em "Preview"
   - Faça os gestos na câmera
   - Verifique se reconhece corretamente
5. Se acurácia < 80%, colete mais dados e retreine


ETAPA 5: EXPORTAR MODELO
=========================

1. Clique em "Export Model"
2. Selecione "Tensorflow.js"
3. Escolha: "Download" (ou URL se preferir)
4. Descompacte o arquivo
5. Você terá:
   - model.json
   - metadata.json
   - weights.bin (ou weights01.bin, weights02.bin, etc)


ETAPA 6: INTEGRAR NO PROJETO
=============================

1. Copie os arquivos para: /model/
   Estrutura final:
   /model/
   ├── configuracao.js
   ├── model.json
   ├── metadata.json
   ├── weights.bin
   └── (opcionalmente) weights01.bin, weights02.bin, ...

2. Adicione bibliotecas ao index.html:
   
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest"></script>
   <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/pose@latest"></script>

   OU versões específicas para estabilidade:
   
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.11.0"></script>
   <script src="https://cdn.jsdelivr.net/npm/@teachablemachine/pose@0.8.5"></script>


ETAPA 7: ATIVAR MODELO EM CONFIGURACAO.JS
==========================================

No arquivo model/configuracao.js:

1. Atualize a URL do modelo:
   const CONFIGURACAO_MODELO = {
       urlModelo: 'model/model.json',  // Seu modelo
       // ... resto
   }

2. Descomente e adapte a classe ModeloTeachableMachine:

   // Em configuracao.js, descomente:
   
   static async carregar() {
       try {
           const URL = CONFIGURACAO_MODELO.urlModelo;
           const metadataURL = CONFIGURACAO_MODELO.urlMetadados;
           
           // Carregar modelo
           this.modelo = await tmPose.Pose.load(URL, metadataURL);
           console.log('✅ Modelo carregado com sucesso!');
           return true;
       } catch (erro) {
           console.error('Erro ao carregar:', erro);
           return false;
       }
   }

   static async prever(videoElement) {
       const prediction = await this.modelo.estimatePose(videoElement);
       
       // Retornar gesto com maior confiança
       let maxScore = 0;
       let maxIndex = 0;
       
       prediction.forEach((class, index) => {
           if (class.probability > maxScore) {
               maxScore = class.probability;
               maxIndex = index;
           }
       });
       
       return {
           classe: maxIndex,
           confianca: Math.round(maxScore * 100),
           scores: prediction
       };
   }


ETAPA 8: ADAPTAR script.js
===========================

Em script.js, altere iniciarReconhecimentoEmTempoReal():

async function iniciarReconhecimentoEmTempoReal() {
    const videoElement = document.getElementById('videoCamara');
    
    // Carregar modelo uma vez
    if (!window.modeloCarregado) {
        const sucesso = await ModeloTeachableMachine.carregar();
        if (!sucesso) {
            alert('Erro ao carregar modelo');
            return;
        }
        window.modeloCarregado = true;
    }
    
    // Loop de reconhecimento
    const intervalo = setInterval(async () => {
        if (!videoCamaraAtiva) {
            clearInterval(intervalo);
            return;
        }
        
        const previsao = await ModeloTeachableMachine.prever(videoElement);
        if (previsao && previsao.confianca > 30) {
            atualizarBarraConfianca(previsao.confianca);
        }
    }, CONFIGURACAO_MODELO.reconhecimento.intervaloFrames);
}


ETAPA 9: TESTAR A INTEGRAÇÃO
=============================

1. Abra index.html no navegador
2. Clique em "Começar Aprendizado"
3. Ative a câmera
4. Veja a barra de confiança atualizar
5. Clique em "Verificar Gesto"
6. Deveria reconhecer o gesto


TROUBLESHOOTING
===============

Problema: "Cannot read property 'load' of undefined"
Solução: Verifique se as bibliotecas TensorFlow e Teachable Machine
         foram carregadas corretamente no index.html

Problema: Modelo carrega mas não reconhece gestos
Solução: - Treinou com dados suficientes?
         - Iluminação é similar à do treinamento?
         - Retreine o modelo

Problema: Muito lento
Solução: - Reduza tamanho das imagens (640x480)
         - Aumente intervaloFrames em configuracao.js
         - Use versão lite do TensorFlow


OTIMIZAÇÕES DE PRODUÇÃO
=======================

1. Cache do Modelo:
   // Após carregamento bem-sucedido
   localStorage.setItem('modeloCache', JSON.stringify(modelo));

2. Web Workers (para não travar UI):
   // Mover reconhecimento para web worker

3. Quantização:
   // Usar modelo quantizado (menor, mais rápido)
   const urlModeloQuantizado = 'model/quantized.json';

4. TensorFlow Lite (mobile):
   // Para aplicações mobile nativas
   // Use tf-lite-support


RECURSOS ÚTEIS
==============

- Documentação Teachable Machine:
  https://teachablemachine.withgoogle.com/faq

- Documentação TensorFlow.js:
  https://www.tensorflow.org/js/guide

- GitHub Teachable Machine:
  https://github.com/googlecreativelab/teachable-machine-community

- Exemplos de Pose Model:
  https://github.com/googlecreativelab/teachable-machine-community/tree/master/examples/pose


DÚVIDAS FREQUENTES
==================

P: Posso usar câmera frontal E traseira?
R: Sim, modifique navigator.mediaDevices.getUserMedia()

P: Funciona offline?
R: Sim, se o modelo estiver em cache (IndexedDB)

P: Qual é a latência?
R: 50-200ms em hardware moderno, depende do dispositivo

P: Posso fazer reconhecimento contínuo?
R: Sim, ajuste intervaloFrames em configuracao.js

P: Funciona em smartphones?
R: Sim, com Chrome/Firefox/Safari

-->

<!-- Este é um arquivo de documentação.
     O projeto já contém exemplos de integração prontos em configuracao.js
     que você pode descomentar e adaptar. -->
