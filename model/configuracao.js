/* ============================================
   CONFIGURAÇÃO DO MODELO DO TEACHABLE MACHINE
   Simulação e Integração
   ============================================ */

/**
 * CONFIGURAÇÃO DO MODELO DE IA
 * 
 * Este arquivo simula a configuração de um modelo exportado do Teachable Machine.
 * Em produção, você substituiria isso pela integração real do modelo treinado.
 * 
 * Como usar o Teachable Machine:
 * 1. Acesse: https://teachablemachine.withgoogle.com/
 * 2. Crie um novo projeto de "Pose Model"
 * 3. Treine com imagens dos gestos em Libras
 * 4. Exporte como "Tensorflow.js"
 * 5. Copie os arquivos para a pasta /model
 * 6. Integre conforme abaixo
 */

// ========== CONFIGURAÇÃO DO MODELO ==========
const CONFIGURACAO_MODELO = {
    // URL do modelo exportado (substitua pela sua URL real)
    urlModelo: 'model/model.json',
    urlMetadados: 'model/metadata.json',
    
    // Configurações de reconhecimento
    reconhecimento: {
        intervaloFrames: 500,      // Analisar a cada 500ms
        confiancaMinima: 0.7,       // 70% de confiança necessária
        suavizacao: true,          // Suavizar resultados
        numFrames: 5               // Média móvel de 5 frames
    },
    
    // Mapeamento de gestos para nomes científicos
    mapeamentoGestos: {
        'celula': {
            nomeCientifico: 'Célula',
            indice: 0
        },
        'mitocondria': {
            nomeCientifico: 'Mitocôndria',
            indice: 1
        },
        'fotossintese': {
            nomeCientifico: 'Fotossíntese',
            indice: 2
        },
        'dna': {
            nomeCientifico: 'DNA',
            indice: 3
        },
        'proteina': {
            nomeCientifico: 'Proteína',
            indice: 4
        }
    },
    
    // Classes de gesto treinadas no modelo
    classesGesto: [
        'background',
        'celula',
        'mitocondria',
        'fotossintese',
        'dna',
        'proteina'
    ]
};

// ========== SIMULAÇÃO DO MODELO (PLACEHOLDER) ==========
/**
 * Classe que simula o modelo de reconhecimento do Teachable Machine
 * Será substituída pela integração real quando o modelo estiver disponível
 */
class ModeloReconhecimentoSimulado {
    constructor() {
        this.ultimoGesto = null;
        this.historico = [];
        this.ativo = true;
        
        console.log('🤖 Modelo de Reconhecimento Simulado Carregado');
        console.log('Nota: Esta é uma simulação. Integre o modelo real do Teachable Machine.');
    }
    
    /**
     * Simula a previsão do modelo
     * @param {ImageData} frameVideo - Frame capturado da câmera
     * @returns {object} Previsão com confiança
     */
    prever(frameVideo) {
        if (!this.ativo) {
            return null;
        }
        
        // Simular previsão aleatória
        const indexAleatorio = Math.floor(Math.random() * CONFIGURACAO_MODELO.classesGesto.length);
        const gestoDetectado = CONFIGURACAO_MODELO.classesGesto[indexAleatorio];
        const confianca = Math.random() * 100;
        
        const previsao = {
            gesto: gestoDetectado,
            confianca: Math.round(confianca),
            timestamp: new Date().getTime()
        };
        
        // Manter histórico
        this.historico.push(previsao);
        if (this.historico.length > 10) {
            this.historico.shift();
        }
        
        return previsao;
    }
    
    /**
     * Obtém a previsão mais consistente baseada no histórico
     * @returns {object} Previsão consolidada
     */
    obterPrevisaoConsolidada() {
        if (this.historico.length === 0) {
            return null;
        }
        
        // Contar ocorrências de cada gesto
        const contagem = {};
        this.historico.forEach(prev => {
            contagem[prev.gesto] = (contagem[prev.gesto] || 0) + 1;
        });
        
        // Encontrar gesto mais frequente
        const gestoMaisFrequente = Object.keys(contagem).reduce((a, b) =>
            contagem[a] > contagem[b] ? a : b
        );
        
        // Calcular confiança média
        const prevMaisFrequentes = this.historico.filter(p => p.gesto === gestoMaisFrequente);
        const confiancaMedia = Math.round(
            prevMaisFrequentes.reduce((soma, p) => soma + p.confianca, 0) / prevMaisFrequentes.length
        );
        
        return {
            gesto: gestoMaisFrequente,
            confianca: confiancaMedia,
            consistencia: Math.round((contagem[gestoMaisFrequente] / this.historico.length) * 100)
        };
    }
    
    /**
     * Limpa o histórico de previsões
     */
    limparHistorico() {
        this.historico = [];
    }
}

// ========== INTEGRAÇÃO COM TEACHABLE MACHINE (REAL) ==========
/**
 * Classe para integração real com o Teachable Machine
 * Descomente e use quando tiver o modelo exportado
 */
class ModeloTeachableMachine {
    /**
     * Carrega o modelo do Teachable Machine
     * Requer: https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest
     * Requer: https://cdn.jsdelivr.net/npm/@teachablemachine/pose@latest
     */
    static async carregar() {
        try {
            /*
            // Descomente para usar modelo real
            const URL = CONFIGURACAO_MODELO.urlModelo;
            this.modelo = await tm.Pose.load(URL, CONFIGURACAO_MODELO.urlMetadados);
            
            console.log('✅ Modelo Teachable Machine carregado com sucesso!');
            return true;
            */
            
            console.log('⚠️ Modelo Teachable Machine não está configurado');
            console.log('Para usar o modelo real:');
            console.log('1. Treine no https://teachablemachine.withgoogle.com/');
            console.log('2. Exporte como Tensorflow.js');
            console.log('3. Copie para /model/');
            console.log('4. Descomente o código em ModeloTeachableMachine.carregar()');
            return false;
        } catch (erro) {
            console.error('Erro ao carregar modelo:', erro);
            return false;
        }
    }
    
    /**
     * Realiza previsão em um frame de vídeo
     */
    static async prever(videoElement) {
        try {
            /*
            // Descomente para usar modelo real
            const prediction = await this.modelo.estimatePose(videoElement);
            
            return {
                pose: prediction.pose,
                confianca: prediction.score * 100
            };
            */
            return null;
        } catch (erro) {
            console.error('Erro na previsão:', erro);
            return null;
        }
    }
}

// ========== INSTÂNCIA GLOBAL DO MODELO ==========
// Usando a simulação por padrão
const modeloReconhecimento = new ModeloReconhecimentoSimulado();

// ========== EXPORTAR CONFIGURAÇÕES ==========
window.CONFIGURACAO_MODELO = CONFIGURACAO_MODELO;
window.modeloReconhecimento = modeloReconhecimento;
window.ModeloTeachableMachine = ModeloTeachableMachine;

console.log('✅ Configuração do modelo carregada');
console.log('📋 Gestos disponíveis:', CONFIGURACAO_MODELO.classesGesto);
