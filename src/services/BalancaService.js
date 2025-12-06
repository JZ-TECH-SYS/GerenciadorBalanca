/**
 * BalancaService.js
 * Serviço de comunicação com a balança Urano UDC-CO via porta serial
 * Suporta polling ativo e recepção de dados via botão físico
 */

const SerialPort = require("serialport");
const { EventEmitter } = require("events");

class BalancaService extends EventEmitter {
  constructor() {
    super();
    this.port = null;
    this.portName = "";
    this.isConnected = false;
    this.pollingInterval = null;
    this.accumulatedData = "";
    this.pollingSupported = false; // Flag para indicar se polling funciona
    this.pollingTestTimeout = null;
    this.pollingTestResponses = 0;

    // Configuração da porta serial para Urano UDC-CO
    this.serialConfig = {
      baudRate: 9600,
      dataBits: 8,
      parity: "none",
      stopBits: 2,
    };

    // Intervalo de polling em milissegundos
    this.POLLING_INTERVAL_MS = 500;
    
    // Tempo para testar se polling funciona (3 segundos)
    this.POLLING_TEST_DURATION_MS = 3000;

    // Comandos para solicitar peso (tentar diferentes protocolos)
    this.POLL_COMMANDS = ["$", "P", "\x05"]; // ENQ, P, $
    this.currentCommandIndex = 0;
  }

  /**
   * Conecta à porta serial da balança
   * @param {string} portName - Nome da porta (ex: 'COM3')
   * @returns {Promise<boolean>}
   */
  connect(portName) {
    return new Promise((resolve, reject) => {
      if (this.isConnected) {
        this.disconnect();
      }

      if (!portName) {
        this.emit("error", { message: "Porta COM não configurada" });
        return reject(new Error("Porta COM não configurada"));
      }

      this.portName = portName;

      try {
        this.port = new SerialPort(portName, this.serialConfig, (err) => {
          if (err) {
            this.emit("error", {
              message: `Erro ao abrir porta ${portName}: ${err.message}`,
            });
            this.isConnected = false;
            return reject(err);
          }

          this.isConnected = true;
          this.emit("connected", { port: portName });
          this._setupDataListener();
          
          // Testar se polling é suportado
          this._testPollingSupport();
          
          resolve(true);
        });

        this.port.on("error", (err) => {
          console.error("Erro na porta serial:", err.message);
          this.emit("error", { message: err.message });
          this.isConnected = false;
        });

        this.port.on("close", () => {
          console.log("Porta serial fechada");
          this.isConnected = false;
          this._stopPolling();
          this.emit("disconnected");
        });
      } catch (error) {
        this.emit("error", { message: error.message });
        reject(error);
      }
    });
  }

  /**
   * Desconecta da porta serial
   */
  disconnect() {
    this._stopPolling();

    if (this.port && this.port.isOpen) {
      this.port.close((err) => {
        if (err) {
          console.error("Erro ao fechar porta:", err.message);
        } else {
          console.log("Porta serial fechada com sucesso");
        }
      });
    }

    this.isConnected = false;
    this.port = null;
  }

  /**
   * Configura o listener de dados da porta serial
   * @private
   */
  _setupDataListener() {
    if (!this.port) return;

    this.port.on("data", (data) => {
      const strData = data.toString().trim();
      this.accumulatedData += strData;

      // Processa quando recebe indicador de fim (g para gramas)
      if (this.accumulatedData.includes("g")) {
        const peso = this._parseWeight(this.accumulatedData);
        if (peso !== null) {
          this.emit("peso", { peso, raw: this.accumulatedData });
        }
        this.accumulatedData = "";
      }
    });
  }

  /**
   * Extrai o peso dos dados recebidos
   * @param {string} data - Dados brutos da balança
   * @returns {number|null} - Peso em gramas ou null se inválido
   * @private
   */
  _parseWeight(data) {
    // Formato esperado: "PESO: 1500g" ou variações
    const patterns = [
      /PESO:\s*(\d+)g/i, // PESO: 1500g
      /(\d+)\s*g/i, // 1500g ou 1500 g
      /(\d+\.?\d*)\s*kg/i, // 1.5kg (converter para g)
    ];

    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match) {
        let peso = parseFloat(match[1]);
        // Se for kg, converter para g
        if (pattern.source.includes("kg")) {
          peso = peso * 1000;
        }
        return Math.round(peso);
      }
    }

    return null;
  }

  /**
   * Inicia o polling para solicitar peso periodicamente
   * @private
   */
  _startPolling() {
    if (this.pollingInterval) {
      this._stopPolling();
    }

    this.pollingInterval = setInterval(() => {
      this._requestWeight();
    }, this.POLLING_INTERVAL_MS);

    console.log(`Polling iniciado a cada ${this.POLLING_INTERVAL_MS}ms`);
  }

  /**
   * Testa se a balança suporta polling
   * Envia comandos e espera resposta por alguns segundos
   * @private
   */
  _testPollingSupport() {
    console.log("Testando suporte a polling...");
    this.pollingTestResponses = 0;
    this.pollingSupported = false;
    
    // Listener temporário para contar respostas durante o teste
    const testListener = (data) => {
      this.pollingTestResponses++;
      console.log(`Polling teste: recebeu resposta ${this.pollingTestResponses}`);
    };
    
    this.on('peso', testListener);
    
    // Inicia polling para teste
    this._startPolling();
    
    // Após o tempo de teste, verifica se recebeu respostas
    this.pollingTestTimeout = setTimeout(() => {
      this.removeListener('peso', testListener);
      
      // Se recebeu pelo menos 2 respostas, polling funciona
      if (this.pollingTestResponses >= 2) {
        this.pollingSupported = true;
        console.log("✅ Polling SUPORTADO! Balança responde a comandos.");
        this.emit("polling-status", { supported: true });
        // Continua com polling
      } else {
        this.pollingSupported = false;
        console.log("⚠️ Polling NÃO suportado. Modo manual ativado.");
        this._stopPolling();
        this.emit("polling-status", { supported: false });
        // Para o polling, vai funcionar só com botão ENVIAR da balança
      }
    }, this.POLLING_TEST_DURATION_MS);
  }

  /**
   * Para o polling
   * @private
   */
  _stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log("Polling parado");
    }
  }

  /**
   * Envia comando para solicitar peso da balança
   * @private
   */
  _requestWeight() {
    if (!this.port || !this.port.isOpen) return;

    // Tenta diferentes comandos de polling
    const command = this.POLL_COMMANDS[this.currentCommandIndex];

    this.port.write(command + "\r\n", (err) => {
      if (err) {
        console.error("Erro ao enviar comando de polling:", err.message);
        // Tenta próximo comando na próxima tentativa
        this.currentCommandIndex =
          (this.currentCommandIndex + 1) % this.POLL_COMMANDS.length;
      }
    });
  }

  /**
   * Solicita peso manualmente (para teste)
   * @returns {Promise<void>}
   */
  requestPeso() {
    return new Promise((resolve, reject) => {
      if (!this.port || !this.port.isOpen) {
        return reject(new Error("Porta não conectada"));
      }

      this.port.write("$\r\n", (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Lista as portas seriais disponíveis
   * @returns {Promise<Array>}
   */
  static async listPorts() {
    try {
      const ports = await SerialPort.list();
      return ports.map((port) => ({
        path: port.path,
        manufacturer: port.manufacturer || "Desconhecido",
        vendorId: port.vendorId,
        productId: port.productId,
      }));
    } catch (error) {
      console.error("Erro ao listar portas:", error.message);
      return [];
    }
  }

  /**
   * Verifica se está conectado
   * @returns {boolean}
   */
  getStatus() {
    return {
      connected: this.isConnected,
      port: this.portName,
      polling: this.pollingInterval !== null,
      pollingSupported: this.pollingSupported,
    };
  }
}

// Exporta instância singleton
module.exports = new BalancaService();
