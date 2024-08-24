const { contextBridge, ipcRenderer } = require('electron');
const Store = require('electron-store');
const store = new Store();
const fs = require('fs');
const path = require('path');
//const { printToLabelPrinter } = require('./printCodbarras.js');

const produtosFilePath = path.join(__dirname, 'produtos2.json');

if (!fs.existsSync(produtosFilePath)) {
    fs.writeFileSync(produtosFilePath, JSON.stringify([], null, 2));
}

function listaProdutos() {
    const data = fs.readFileSync(produtosFilePath);
    return JSON.parse(data);
}


contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, data) => {
            ipcRenderer.send(channel, data);
        },
        on: (channel, func) => {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
        },
        getStore: (key) => {
            return store.get(key);
        },
        listaProdutos: () => {
            return listaProdutos();  // chamando a função listaProdutos que você definiu
        }
    }
);