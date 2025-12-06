/**
 * preload.js
 * Preload unificado para todas as janelas do GerenciadorBalanca
 * Expõe API segura via contextBridge
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * API exposta para o renderer process
 * Todas as comunicações com o main process passam por aqui
 */
contextBridge.exposeInMainWorld('electronAPI', {
    
    // ==========================================
    // BALANÇA - Comunicação com a balança
    // ==========================================
    
    /**
     * Escuta atualizações de peso em tempo real
     * @param {Function} callback - Função chamada quando peso é atualizado
     */
    onPesoUpdate: (callback) => {
        ipcRenderer.on('peso-update', (event, data) => callback(data));
    },

    /**
     * Remove listener de peso
     */
    removePesoListener: () => {
        ipcRenderer.removeAllListeners('peso-update');
    },

    /**
     * Escuta status de conexão da balança
     * @param {Function} callback - Função chamada quando status muda
     */
    onBalancaStatus: (callback) => {
        ipcRenderer.on('balanca-status', (event, data) => callback(data));
    },

    /**
     * Escuta status de suporte a polling
     * @param {Function} callback - Função chamada quando polling é testado
     */
    onPollingStatus: (callback) => {
        ipcRenderer.on('polling-status', (event, data) => callback(data));
    },

    /**
     * Solicita status atual da balança
     * @returns {Promise<Object>}
     */
    getBalancaStatus: () => {
        return ipcRenderer.invoke('get-balanca-status');
    },

    /**
     * Solicita atualização de status da balança
     */
    requestBalancaStatus: () => {
        ipcRenderer.send('request-balanca-status');
    },

    // ==========================================
    // PRODUTOS - Gerenciamento de produtos
    // ==========================================

    /**
     * Busca todos os produtos da API
     * @returns {Promise<Array>}
     */
    getProdutos: () => {
        return ipcRenderer.invoke('get-produtos');
    },

    /**
     * Seleciona um produto para monitorar peso
     * @param {Object} produto - Dados do produto
     */
    selectProduto: (produto) => {
        ipcRenderer.send('select-produto', produto);
    },

    /**
     * Obtém produto selecionado atualmente
     * @returns {Promise<Object|null>}
     */
    getProdutoSelecionado: () => {
        return ipcRenderer.invoke('get-produto-selecionado');
    },

    // ==========================================
    // IMPRESSÃO - Impressão de etiquetas
    // ==========================================

    /**
     * Imprime etiqueta com peso atual e produto selecionado
     * @param {Object} data - { peso, produto }
     * @returns {Promise<boolean>}
     */
    printEtiqueta: (data) => {
        return ipcRenderer.invoke('print-etiqueta', data);
    },

    /**
     * Imprime etiqueta direta (sem peso)
     * @param {Object} produto - Dados do produto
     * @param {number} quantidade - Quantidade de etiquetas
     * @returns {Promise<boolean>}
     */
    printEtiquetaDireta: (produto, quantidade) => {
        return ipcRenderer.invoke('print-etiqueta-direta', { produto, quantidade });
    },

    /**
     * Lista impressoras disponíveis
     * @returns {Promise<Array>}
     */
    getPrinters: () => {
        return ipcRenderer.invoke('get-printers');
    },

    // ==========================================
    // CONFIGURAÇÕES - Settings da aplicação
    // ==========================================

    /**
     * Salva configurações gerais
     * @param {Object} settings - { comPort, zebra, prefixoAPI, idEmpresa, token }
     */
    saveSettings: (settings) => {
        ipcRenderer.send('save-settings', settings);
    },

    /**
     * Obtém configurações atuais
     * @returns {Promise<Object>}
     */
    getSettings: () => {
        return ipcRenderer.invoke('get-settings');
    },

    /**
     * Lista portas COM disponíveis
     * @returns {Promise<Array>}
     */
    getPortas: () => {
        return ipcRenderer.invoke('get-portas');
    },

    // ==========================================
    // COMANDAS / MESAS
    // ==========================================

    /**
     * Busca comandas/mesas abertas da API
     * @returns {Promise<Array>}
     */
    getComandas: () => {
        return ipcRenderer.invoke('get-comandas');
    },

    /**
     * Adiciona produto à comanda/mesa
     * @param {Object} payload - Dados do produto/comanda
     * @returns {Promise<Object>}
     */
    addProdutoComanda: (payload) => {
        return ipcRenderer.invoke('add-produto-comanda', payload);
    },

    // ==========================================
    // JANELAS - Controle de janelas
    // ==========================================

    /**
     * Abre janela de configurações
     */
    openSettings: () => {
        ipcRenderer.send('open-settings');
    },

    /**
     * Fecha janela atual
     */
    closeWindow: () => {
        ipcRenderer.send('close-window');
    },

    // ==========================================
    // NOTIFICAÇÕES
    // ==========================================

    /**
     * Escuta notificações do main process
     * @param {Function} callback - Função chamada quando há notificação
     */
    onNotification: (callback) => {
        ipcRenderer.on('notification', (event, data) => callback(data));
    },

    /**
     * Envia notificação
     * @param {Object} data - { title, body }
     */
    showNotification: (data) => {
        ipcRenderer.send('show-notification', data);
    }
});

console.log('Preload carregado - electronAPI disponível');
