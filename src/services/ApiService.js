/**
 * ApiService.js
 * Serviço centralizado para comunicação com a API
 * Todas as requisições incluem Authorization Bearer token
 */

const axios = require('axios');
const Store = require('electron-store');
const store = new Store();

class ApiService {
    /**
     * Retorna as configurações da API
     * @returns {Object} - { prefixoAPI, idEmpresa, token }
     */
    static getConfig() {
        return {
            prefixoAPI: store.get('prefixoAPI', ''),
            idEmpresa: store.get('idEmpresa', ''),
            token: store.get('token', '')
        };
    }

    /**
     * Cria headers com Authorization Bearer
     * @returns {Object}
     */
    static getHeaders() {
        const { token } = this.getConfig();
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Busca produtos (balance) da empresa
     * GET {prefixo}{idEmpresa}/getBalance
     * @returns {Promise<Array>}
     */
    static async getBalance() {
        const { prefixoAPI, idEmpresa } = this.getConfig();
        
        if (!prefixoAPI || !idEmpresa) {
            console.warn('ApiService: prefixoAPI ou idEmpresa não configurados');
            return [];
        }

        const url = `${prefixoAPI}${idEmpresa}/getBalance`;
        
        try {
            console.log('ApiService.getBalance:', url);
            const response = await axios.get(url, { headers: this.getHeaders() });
            return response.data.result || response.data || [];
        } catch (error) {
            console.error('Erro ao buscar produtos (getBalance):', error.message);
            if (error.response?.status === 401) {
                throw new Error('Token inválido ou expirado');
            }
            throw error;
        }
    }

    /**
     * Busca comandas/mesas abertas
     * GET {prefixo}list/{idEmpresa}/comandabalance
     * @returns {Promise<Array>}
     */
    static async getComandas() {
        const { prefixoAPI, idEmpresa } = this.getConfig();
        
        if (!prefixoAPI || !idEmpresa) {
            console.warn('ApiService: prefixoAPI ou idEmpresa não configurados');
            return [];
        }

        const url = `${prefixoAPI}list/${idEmpresa}/comandabalance`;
        
        try {
            console.log('ApiService.getComandas:', url);
            const response = await axios.get(url, { headers: this.getHeaders() });
            return response.data.result || response.data || [];
        } catch (error) {
            console.error('Erro ao buscar comandas:', error.message);
            if (error.response?.status === 401) {
                throw new Error('Token inválido ou expirado');
            }
            throw error;
        }
    }

    /**
     * Adiciona produto à comanda
     * POST {prefixo}add/comandabalance
     * @param {Object} payload - Dados do produto/comanda
     * @returns {Promise<Object>}
     */
    static async addProdutoComanda(payload) {
        const { prefixoAPI } = this.getConfig();
        
        if (!prefixoAPI) {
            throw new Error('Prefixo da API não configurado');
        }

        const url = `${prefixoAPI}add/comandabalance`;
        
        try {
            console.log('ApiService.addProdutoComanda:', url, payload);
            const response = await axios.post(url, payload, { headers: this.getHeaders() });
            return response.data;
        } catch (error) {
            console.error('Erro ao adicionar produto à comanda:', error.message);
            if (error.response?.status === 401) {
                throw new Error('Token inválido ou expirado');
            }
            throw error;
        }
    }
}

module.exports = ApiService;
