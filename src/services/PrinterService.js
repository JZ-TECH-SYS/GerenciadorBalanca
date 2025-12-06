/**
 * PrinterService.js
 * Serviço unificado de impressão de etiquetas ZPL para impressoras Zebra
 */

const printer = require("printer");
const { Notification } = require("electron");
const Store = require("electron-store");
const ApiService = require("./ApiService");

const store = new Store();

class PrinterService {
  constructor() {
    this.printerName = "";
    this.lineSpacing = 35;
    this.labelWidth = 540;
    this.labelHeight = 490;
  }

  /**
   * Define o nome da impressora
   * @param {string} name - Nome da impressora Zebra
   */
  setPrinter(name) {
    this.printerName = name;
  }

  /**
   * Busca produtos da API (via ApiService)
   * @returns {Promise<Array>}
   */
  async getProdutosApi() {
    try {
      return await ApiService.getBalance();
    } catch (error) {
      console.error("Erro ao buscar produtos da API:", error.message);
      return [];
    }
  }

  /**
   * Busca um produto pelo código de barras
   * @param {string} codBarras - Código de barras do produto
   * @returns {Promise<Object|null>}
   */
  async findProduto(codBarras) {
    console.log("Buscando produto com código de barras:", codBarras);
    const produtos = await this.getProdutosApi();
    return produtos.find((p) => p.cod_barras == codBarras) || null;
  }

  /**
   * Busca todos os produtos da API
   * @returns {Promise<Array>}
   */
  async getAllProdutos() {
    return await this.getProdutosApi();
  }

  /**
   * Gera conteúdo ZPL para etiqueta com peso
   * @param {Object} options - Opções de impressão
   * @param {number} options.peso - Peso em gramas
   * @param {Object} options.produto - Dados do produto
   * @returns {string} - Conteúdo ZPL
   */
  generateZPL(options) {
    const { peso, produto } = options;

    if (!produto) {
      return null;
    }

    const pesoKg = (peso / 1000).toFixed(3);
    const valorTotal = (parseFloat(pesoKg) * produto.preco).toFixed(2);
    const barcodeText = `${produto.cod_barras}-${pesoKg}`;
    const ls = this.lineSpacing;

    const zpl = `
^XA
^PW${this.labelWidth}
^LL${this.labelHeight}
^CF0,30
^FO50,${1 * ls}^FD Terere Station - A granel ^FS
^FO50,${2 * ls}^FD Produto: ${produto.nome}^FS
^FO50,${3 * ls}^FD Peso: ${pesoKg} Kg ^FS
^FO50,${4 * ls}^FD Valor/Kg: R$ ${produto.preco.toFixed(2)} ^FS
^FO50,${5 * ls}^FD Total: R$ ${valorTotal} ^FS
^FO50,${6 * ls}^BCN,100,Y,N,N^FD${barcodeText}^FS
^XZ
        `.trim();

    return zpl;
  }

  /**
   * Gera ZPL simplificado (sem peso, para códigos de barras diretos)
   * @param {Object} produto - Dados do produto
   * @returns {string} - Conteúdo ZPL
   */
  generateZPLSimples(produto) {
    if (!produto) {
      return null;
    }

    const ls = this.lineSpacing;
    const barcodeText = `${produto.cod_barras}-1.000`;

    const zpl = `
^XA
^PW${this.labelWidth}
^LL${this.labelHeight}
^CF0,30
^FO50,${1 * ls}^FD Terere Station ^FS
^FO50,${2 * ls}^FD Produto: ${produto.nome}^FS
^FO50,${3 * ls}^FD Valor: R$ ${produto.preco.toFixed(2)} ^FS
^FO50,${4 * ls}^FD Obrigado pela escolha!^FS
^FO60,${5 * ls}^BCN,100,Y,N,N^FD${barcodeText}^FS
^XZ
        `.trim();

    return zpl;
  }

  /**
   * Imprime etiqueta com peso
   * @param {number} peso - Peso em gramas
   * @param {string} codBarras - Código de barras do produto
   * @returns {Promise<boolean>}
   */
  async printEtiqueta(peso, codBarras) {
    const printerName = this.printerName || store.get("zebra", "");

    if (!printerName) {
      this._showNotification("Erro", "Impressora não configurada");
      return false;
    }

    const produto = await this.findProduto(codBarras);
    if (!produto) {
      this._showNotification("Atenção", "Produto não encontrado!");
      return false;
    }

    const zplContent = this.generateZPL({ peso, produto });
    if (!zplContent) {
      return false;
    }

    return this._sendToPrinter(printerName, zplContent);
  }

  /**
   * Imprime etiqueta direta (sem peso, usa 1kg padrão)
   * @param {string} codBarras - Código de barras do produto
   * @returns {Promise<boolean>}
   */
  async printEtiquetaDireta(codBarras) {
    const printerName = this.printerName || store.get("zebra", "");

    if (!printerName) {
      this._showNotification("Erro", "Impressora não configurada");
      return false;
    }

    const produto = await this.findProduto(codBarras);
    if (!produto) {
      this._showNotification("Atenção", "Produto não encontrado!");
      return false;
    }

    const zplContent = this.generateZPLSimples(produto);
    if (!zplContent) {
      return false;
    }

    return this._sendToPrinter(printerName, zplContent);
  }

  /**
   * Imprime etiqueta com produto já carregado
   * @param {number} peso - Peso em gramas
   * @param {Object} produto - Dados do produto
   * @returns {Promise<boolean>}
   */
  async printEtiquetaComProduto(peso, produto) {
    const printerName = this.printerName || store.get("zebra", "");

    if (!printerName) {
      this._showNotification("Erro", "Impressora não configurada");
      return false;
    }

    if (!produto) {
      this._showNotification("Atenção", "Nenhum produto selecionado!");
      return false;
    }

    const zplContent = this.generateZPL({ peso, produto });
    if (!zplContent) {
      return false;
    }

    return this._sendToPrinter(printerName, zplContent);
  }

  /**
   * Envia dados para a impressora
   * @param {string} printerName - Nome da impressora
   * @param {string} data - Dados ZPL
   * @returns {Promise<boolean>}
   * @private
   */
  _sendToPrinter(printerName, data) {
    return new Promise((resolve) => {
      printer.printDirect({
        printer: printerName,
        data: data,
        success: (jobID) => {
          this._showNotification(
            "Impressão enviada",
            `Imprimindo... Job: ${jobID}`
          );
          resolve(true);
        },
        error: (err) => {
          this._showNotification("Erro ao imprimir", `Erro: ${err}`);
          resolve(false);
        },
      });
    });
  }

  /**
   * Exibe notificação do sistema
   * @param {string} title - Título
   * @param {string} body - Mensagem
   * @private
   */
  _showNotification(title, body) {
    new Notification({ title, body }).show();
  }

  /**
   * Lista impressoras disponíveis no sistema
   * @returns {Array}
   */
  static listPrinters() {
    try {
      return printer.getPrinters();
    } catch (error) {
      console.error("Erro ao listar impressoras:", error.message);
      return [];
    }
  }
}

// Exporta instância singleton
module.exports = new PrinterService();
