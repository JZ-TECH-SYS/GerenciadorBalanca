const { app, screen ,Menu, Tray, BrowserWindow, Notification } = require('electron');
const { ipcMain } = require('electron');
const { printToLabelPrinter } = require('./src/print.js');
const { printDireto } = require('./src/printCodbarras.js');
const { findProduto } = require('./src/help.js');

const path = require('path');
const fs = require('fs');
const SerialPort = require('serialport');
const Store = require('electron-store');
const store = new Store();

let settingsWindow;
let productsWindow;
let pesoWindow;
let mainTray;
let porta_balanca = store.get('porta_balanca') ?? '';
let api = store.get('api') ?? '';

function createSettingsWindow() {
    settingsWindow = new BrowserWindow({
        width: 500,
        height: 300,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'src', 'preload.js')
        }
    });
    settingsWindow.loadFile(path.resolve(__dirname, 'assets', 'html', 'settings.html'));

    settingsWindow.on('close', (event) => {
        console.log('Evento de fechamento acionado para settingsWindow');
    });
    settingsWindow.on('closed', () => {
        console.log('Evento de janela fechada acionado para settingsWindow');
    });
}

function createProductsWindow() {
    productsWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'src', 'preloadProdutos.js')
        }
    });
    productsWindow.loadFile(path.resolve(__dirname, 'assets', 'html', 'products.html'));

    productsWindow.on('close', (event) => {
        console.log('Evento de fechamento acionado para productsWindow');
    });
    productsWindow.on('closed', () => {
        console.log('Evento de janela fechada acionado para productsWindow');
    });
}

function createShowPesoWindow() {
    // Cria a nova janela sem definir as dimensões ainda
    pesoWindow = new BrowserWindow({
        width: 300,
        height: 250,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'src', 'preloadPeso.js')
        },
        frame: true,  // Remova a borda da janela (opcional)
        resizable: false  // Impede o redimensionamento da janela (opcional)
    });

    // Carrega o arquivo HTML
    pesoWindow.loadFile(path.resolve(__dirname, 'assets', 'html', 'peso.html'));

    // Quando o conteúdo da janela estiver carregado, obtemos as dimensões da janela
    pesoWindow.webContents.on('did-finish-load', () => {
        // Obtem as dimensões da tela
        let { width, height } = screen.getPrimaryDisplay().workAreaSize;

        // Calcula a posição para a janela aparecer na parte inferior direita da tela
        let x = width - 300;  // 80 é a largura da janela
        let y = height - 700;  // 90 é a altura da janela

        // Define a posição da janela
        pesoWindow.setPosition(x, y);
    });
}

function createCodbarrasWindow() {
    productsWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'src', 'preloadcod.js')
        }
    });
    productsWindow.loadFile(path.resolve(__dirname, 'assets', 'html', 'codbarras.html'));

    productsWindow.on('close', (event) => {
        console.log('Evento de fechamento acionado para productsWindow');
    });
    productsWindow.on('closed', () => {
        console.log('Evento de janela fechada acionado para productsWindow');
    });
}

function relaodMonitoramentoBalaca() {
    const porta_balanca = store.get('porta_balanca', '');
    if(!porta_balanca){
        new Notification({
            title: 'Atenção',
            body: 'Porta da balança não configurada!'
        }).show();
        return;
    }
    monitorporta_balanca(porta_balanca);
}


function monitorporta_balanca(portName) {
   
    if (portName === '') {
        new Notification({
            title: 'Atenção',
            body: `Nenhuma porta COM configurada.!!`
        }).show();
        return;
    }

    let currentPort = new SerialPort(portName, {
        baudRate: 9600,
        dataBits: 8,
        parity: 'none',
        stopBits: 2
    });
    
    let accumulatedData = "";
    currentPort.on('data', (data) => {
        const strData = data.toString().trim();
        accumulatedData += strData;
        if (accumulatedData.includes("g")) {
            const weightMatch = accumulatedData.match(/PESO:\s*(\d+g)/);
            if (weightMatch) {
                const weight = weightMatch[1];
                const peso = +weight.replace('g', '');
                let zebra = store.get('zebra', '');    // Obtendo o valor de 'zebra' diretamente do store
                let codbarra = store.get('codbarra', '');  // Obtendo o valor de 'codbarra' diretamente do store
                let print = store.get('print', true);  // Obtendo o valor de 'print' diretamente do store
               
                if(print){
                    printToLabelPrinter(peso, zebra, codbarra)
                }else{
                    findProduto(codbarra).then(produto => {
                        let nomeProduto = produto.nome ?? 'sem produto';
                        let valorProduto = produto.preco ?? 0.0;
                        if (pesoWindow && !pesoWindow.isDestroyed()) {
                            console.log( { nome: nomeProduto , peso , valor:valorProduto });
                            pesoWindow.webContents.send('update-peso', { nome: nomeProduto , peso , valor:valorProduto });
                        } else {
                            console.error('pesoWindow is not available');
                        }
                    });  
                }  
            }
            accumulatedData = "";
        }
    });

    currentPort.close((err) => {
        if (err) {
            console.error('Erro ao fechar a porta serial:', err.message);
        } else {
            console.log('Porta serial fechada com sucesso.');
        }
    });
}

ipcMain.on('settings-saved', (event, settings) => {
    console.log('settings-saved', settings);
    try {
        store.set('porta_balanca', settings.comPort);
        store.set('zebra', settings.zebra);
        store.set('api', settings.api); 
        relaodMonitoramentoBalaca();
    } catch (error) {
        console.error('Erro ao salvar no store:', error.message);
    }
});

ipcMain.on('settings-saved-produto', (event, settings) => {
    try {
        const codbarra = store.get('codbarra', '');
        if (codbarra !== settings.codbarras) {
            store.set('codbarra', settings.codbarras);
            relaodMonitoramentoBalaca();
        }
    } catch (error) {
        new Notification({
            title: 'Erro',
            body: 'Erro ao salvar no store codbarras:'+ error.message
        }).show();
    }
});

ipcMain.on('settings-saved-Print-or-tosee', (event, settings) => {
    try {
        const print = store.get('print', true);
        if (print !== settings.print) {
            store.set('print', settings.print);
            relaodMonitoramentoBalaca();
        }
    } catch (error) {
        console.error('Erro ao salvar no store Print-or-tosee:', error.message);
        new Notification({
            title: 'Erro',
            body: 'Erro ao salvar no store Print-or-tosee:'+ error.message
        }).show();
    }
});

ipcMain.on('print-direto', (event, settings) => {
    try {
        let zebra = store.get('zebra', '');    // Obtendo o valor de 'zebra' diretamente do store
        printDireto(zebra, settings.cod_barras);
    } catch (error) {
        console.error('Erro direto:', error.message);
    }
});


process.on('uncaughtException', (error) => {
    new Notification({
        title: 'Erro',
        body: 'Erro não tratado:'+ error.message
    }).show();

    console.error('Erro não tratado:', error.message);
});


app.on('ready', () => {
    mainTray = new Tray(path.resolve(__dirname, 'assets', 'img', 'balanca.png'));
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Configurações',
            click: createSettingsWindow
        },
        {
            label: 'Produtos',
            click: createProductsWindow
        },
        {
            label: 'Ver Peso',
            click: createShowPesoWindow
        },
        {
            label: 'gerar cod barras',
            click: createCodbarrasWindow
        },
    ]);
    
    mainTray.setContextMenu(contextMenu);
    createShowPesoWindow();
    createProductsWindow();
    //createCodbarrasWindow();
    monitorporta_balanca(porta_balanca);
});

app.on('window-all-closed', (e) => {
    e.preventDefault();
});



