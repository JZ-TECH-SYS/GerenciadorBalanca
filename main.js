/**
 * main.js
 * Processo principal do Electron - GerenciadorBalanca v2.1.0
 * 
 * Funcionalidades:
 * - Single instance lock (impede múltiplas instâncias)
 * - Comunicação com balança via BalancaService (polling ativo)
 * - Impressão de etiquetas via PrinterService
 * - Janela principal unificada (produtos + peso)
 * - System tray com menu de contexto
 */

const { app, BrowserWindow, Menu, Tray, Notification, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Serviços
const balancaService = require('./src/services/BalancaService');
const printerService = require('./src/services/PrinterService');
const ApiService = require('./src/services/ApiService');

// Store para persistência de configurações
const store = new Store();

// ==========================================
// VARIÁVEIS GLOBAIS
// ==========================================
let mainWindow = null;
let settingsWindow = null;
let mainTray = null;
let produtoSelecionado = null;

// ==========================================
// SINGLE INSTANCE LOCK
// ==========================================
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    // Outra instância já está rodando, fecha esta
    app.quit();
} else {
    // Esta é a instância principal
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Se tentarem abrir outra instância, foca na janela existente
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

// ==========================================
// CRIAÇÃO DE JANELAS
// ==========================================

/**
 * Cria a janela principal (produtos + peso)
 */
function createMainWindow() {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        return;
    }

    mainWindow = new BrowserWindow({
        width: 1000,
        height: 700,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'src', 'preload', 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'img', 'balanca.png'),
        show: false // Mostra apenas quando estiver pronto
    });

    mainWindow.loadFile(path.join(__dirname, 'assets', 'html', 'main.html'));

    // Mostra janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Previne fechamento - minimiza para tray
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

/**
 * Cria a janela de configurações
 */
function createSettingsWindow() {
    if (settingsWindow && !settingsWindow.isDestroyed()) {
        settingsWindow.focus();
        return;
    }

    settingsWindow = new BrowserWindow({
        width: 500,
        height: 450,
        resizable: false,
        parent: mainWindow,
        modal: true,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'src', 'preload', 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'img', 'balanca.png')
    });

    settingsWindow.loadFile(path.join(__dirname, 'assets', 'html', 'settings.html'));
    settingsWindow.setMenuBarVisibility(false);

    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

// ==========================================
// SYSTEM TRAY
// ==========================================

/**
 * Cria o ícone na bandeja do sistema
 */
function createTray() {
    mainTray = new Tray(path.join(__dirname, 'assets', 'img', 'balanca.png'));
    
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Abrir Gerenciador',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                } else {
                    createMainWindow();
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Configurações',
            click: createSettingsWindow
        },
        { type: 'separator' },
        {
            label: 'Sair',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    mainTray.setToolTip('Gerenciador de Balança - Terere Station');
    mainTray.setContextMenu(contextMenu);

    // Clique duplo abre a janela principal
    mainTray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

// ==========================================
// BALANÇA - CONEXÃO E EVENTOS
// ==========================================

/**
 * Conecta à balança e configura eventos
 */
function connectBalanca() {
    const portaBalanca = store.get('porta_balanca', '');
    
    if (!portaBalanca) {
        showNotification('Atenção', 'Porta da balança não configurada');
        sendBalancaStatus({ connected: false, port: '' });
        return;
    }

    balancaService.connect(portaBalanca)
        .then(() => {
            console.log('Balança conectada com sucesso');
            sendBalancaStatus({ connected: true, port: portaBalanca });
        })
        .catch((error) => {
            console.error('Erro ao conectar balança:', error.message);
            showNotification('Erro', `Falha ao conectar na porta ${portaBalanca}`);
            sendBalancaStatus({ connected: false, port: '' });
        });
}

/**
 * Configura listeners de eventos da balança
 */
function setupBalancaListeners() {
    // Evento de peso recebido
    balancaService.on('peso', (data) => {
        console.log('Peso recebido:', data.peso, 'g');
        
        // Envia para a janela principal
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('peso-update', { peso: data.peso });
        }
    });

    // Evento de conexão
    balancaService.on('connected', (data) => {
        console.log('Balança conectada:', data.port);
        sendBalancaStatus({ connected: true, port: data.port });
        showNotification('Balança', `Conectado na porta ${data.port}`);
    });

    // Evento de desconexão
    balancaService.on('disconnected', () => {
        console.log('Balança desconectada');
        sendBalancaStatus({ connected: false, port: '' });
    });

    // Evento de erro
    balancaService.on('error', (data) => {
        console.error('Erro na balança:', data.message);
    });

    // Evento de status do polling
    balancaService.on('polling-status', (data) => {
        console.log('Polling status:', data.supported ? 'SUPORTADO' : 'NÃO SUPORTADO');
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('polling-status', data);
        }
        if (data.supported) {
            showNotification('Balança', '✅ Modo automático ativado! Peso atualiza sozinho.');
        } else {
            showNotification('Balança', '⚠️ Modo manual. Aperte ENVIAR na balança para pesar.');
        }
    });
}

/**
 * Envia status da balança para as janelas
 */
function sendBalancaStatus(status) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('balanca-status', status);
    }
}

// ==========================================
// IPC HANDLERS
// ==========================================

function setupIpcHandlers() {
    // ==========================================
    // BALANÇA
    // ==========================================
    
    ipcMain.handle('get-balanca-status', () => {
        return balancaService.getStatus();
    });

    ipcMain.on('request-balanca-status', (event) => {
        const status = balancaService.getStatus();
        mainWindow?.webContents.send('balanca-status', status);
    });

    // ==========================================
    // PRODUTOS
    // ==========================================

    ipcMain.handle('get-produtos', async () => {
        try {
            return await printerService.getAllProdutos();
        } catch (error) {
            console.error('Erro ao buscar produtos:', error.message);
            return [];
        }
    });

    ipcMain.on('select-produto', (event, produto) => {
        produtoSelecionado = produto;
        store.set('codbarra', produto?.cod_barras || '');
        console.log('Produto selecionado:', produto?.nome);
    });

    ipcMain.handle('get-produto-selecionado', () => {
        return produtoSelecionado;
    });

    // ==========================================
    // IMPRESSÃO
    // ==========================================

    ipcMain.handle('print-etiqueta', async (event, data) => {
        const { peso, produto } = data;
        return await printerService.printEtiquetaComProduto(peso, produto);
    });

    ipcMain.handle('print-etiqueta-direta', async (event, data) => {
        const { produto, quantidade } = data;
        const qtd = parseInt(quantidade) || 1;
        
        // Imprimir a quantidade solicitada
        for (let i = 0; i < qtd; i++) {
            await printerService.printEtiquetaDireta(produto.cod_barras);
        }
        return true;
    });

    ipcMain.handle('get-printers', () => {
        return printerService.constructor.listPrinters();
    });

    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================

    ipcMain.on('save-settings', (event, settings) => {
        console.log('Salvando configurações:', settings);
        
        // Salva no store
        if (settings.comPort) store.set('porta_balanca', settings.comPort);
        if (settings.zebra) store.set('zebra', settings.zebra);
        if (settings.prefixoAPI !== undefined) store.set('prefixoAPI', settings.prefixoAPI);
        if (settings.idEmpresa !== undefined) store.set('idEmpresa', settings.idEmpresa);
        if (settings.token !== undefined) store.set('token', settings.token);

        // Reconecta balança se porta mudou
        balancaService.disconnect();
        setTimeout(() => connectBalanca(), 500);

        // Atualiza impressora
        printerService.setPrinter(settings.zebra || '');

        showNotification('Sucesso', 'Configurações salvas com sucesso');
    });

    ipcMain.handle('get-settings', () => {
        return {
            comPort: store.get('porta_balanca', ''),
            zebra: store.get('zebra', ''),
            prefixoAPI: store.get('prefixoAPI', ''),
            idEmpresa: store.get('idEmpresa', ''),
            token: store.get('token', '')
        };
    });

    // ==========================================
    // COMANDAS / MESAS
    // ==========================================

    ipcMain.handle('get-comandas', async () => {
        try {
            return await ApiService.getComandas();
        } catch (error) {
            console.error('Erro ao buscar comandas:', error.message);
            throw error;
        }
    });

    ipcMain.handle('add-produto-comanda', async (event, payload) => {
        try {
            return await ApiService.addProdutoComanda(payload);
        } catch (error) {
            console.error('Erro ao adicionar produto à comanda:', error.message);
            throw error;
        }
    });

    ipcMain.handle('get-portas', async () => {
        const BalancaServiceClass = require('./src/services/BalancaService').constructor;
        return await BalancaServiceClass.listPorts();
    });

    // ==========================================
    // JANELAS
    // ==========================================

    ipcMain.on('open-settings', () => {
        createSettingsWindow();
    });

    ipcMain.on('close-window', (event) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win) win.close();
    });

    // ==========================================
    // NOTIFICAÇÕES
    // ==========================================

    ipcMain.on('show-notification', (event, data) => {
        showNotification(data.title, data.body);
    });
}

// ==========================================
// UTILIDADES
// ==========================================

/**
 * Exibe notificação do sistema
 */
function showNotification(title, body) {
    new Notification({ title, body }).show();
}

// ==========================================
// APP LIFECYCLE
// ==========================================

app.on('ready', () => {
    // Configura handlers IPC
    setupIpcHandlers();
    
    // Configura listeners da balança
    setupBalancaListeners();
    
    // Cria tray
    createTray();
    
    // Cria janela principal
    createMainWindow();
    
    // Conecta à balança
    connectBalanca();
    
    // Configura impressora
    printerService.setPrinter(store.get('zebra', ''));
});

app.on('window-all-closed', (e) => {
    // Previne fechamento do app quando todas janelas são fechadas
    e.preventDefault();
});

app.on('before-quit', () => {
    app.isQuitting = true;
    balancaService.disconnect();
});

app.on('activate', () => {
    // macOS: recria janela quando clica no dock
    if (mainWindow === null) {
        createMainWindow();
    }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('Erro não tratado:', error.message);
    showNotification('Erro', error.message);
});
