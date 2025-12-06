# Instruções para GitHub Copilot - GerenciadorBalanca

## 📋 Visão Geral do Projeto

Este é um projeto **Electron** para gerenciamento de balança industrial **Urano UDC-CO 30/5**. A aplicação realiza leitura de peso via comunicação serial e permite impressão de etiquetas térmicas.

## 🏗️ Arquitetura

### Processo Principal (main.js)
- Gerencia janelas do Electron (main window, settings)
- Implementa single instance lock
- Configura system tray
- Coordena comunicação IPC entre renderer e serviços

### Serviços (src/services/)
- **BalancaService.js**: Comunicação serial com a balança (polling ativo)
- **PrinterService.js**: Impressão de etiquetas térmicas
- **ApiService.js**: Integração com API externa de produtos

### Preload (src/preload/)
- **preload.js**: Bridge seguro usando contextBridge para expor APIs ao renderer

### Frontend (assets/)
- HTML/CSS/JS simples com Bootstrap 5
- Páginas: main.html (principal), settings.html (configurações)

## 🔧 Padrões e Convenções

### Código JavaScript
- Use ES6+ (const/let, arrow functions, template literals)
- Funções assíncronas com async/await
- Comente funções importantes com JSDoc
- Mantenha serviços desacoplados e reutilizáveis

### Comunicação IPC
- Use ipcMain.handle() para operações async (request/response)
- Use ipcMain.on() apenas para eventos one-way
- Exponha APIs via contextBridge no preload.js
- Nunca habilite nodeIntegration no renderer

### Electron Best Practices
- contextIsolation: true
- nodeIntegration: false
- Valide todas as entradas do renderer no main process

## 📁 Estrutura de Pastas

```
├── main.js              # Processo principal
├── src/
│   ├── preload/         # Scripts de preload
│   └── services/        # Serviços do Node.js
├── assets/
│   ├── html/            # Páginas da aplicação
│   ├── css/             # Estilos
│   ├── js/              # Scripts do frontend
│   └── img/             # Imagens e ícones
└── script/              # Scripts de build/automação
```

## 🎯 Ao Implementar Novas Features

1. **Novo serviço**: Crie em `src/services/` seguindo o padrão existente
2. **Nova página**: Crie HTML em `assets/html/`, adicione rota no main.js
3. **Nova API IPC**: Registre handler no main.js, exponha no preload.js
4. **Novos estilos**: Adicione em `assets/css/app.css`

## ⚙️ Configurações (electron-store)

O app usa `electron-store` para persistência. Chaves principais:
- `porta_balanca` - Porta COM (string)
- `impressora` - Nome da impressora (string)
- `api_url` - URL da API (string)

## 🔌 Comunicação com Balança

A balança Urano UDC-CO comunica via serial (RS-232/USB):
- Baud rate: geralmente 9600
- Protocolo: solicita peso e recebe resposta formatada
- Polling ativo a cada X ms quando conectado

## 🖨️ Impressão

Usa `node-thermal-printer` para formatar comandos e `printer` para enviar:
- Suporte a impressoras térmicas ESC/POS
- Etiquetas de peso com produto, valor, data

## 🚀 CI/CD

O workflow `.github/workflows/release.yml`:
1. Dispara em push na main ou manual
2. Instala deps, lê versão do package.json
3. Faz build com electron-builder
4. Cria GitHub Release com .exe anexado

### Para nova release:
```bash
npm run bump          # Incrementa versão
git add -A
git commit -m "chore: bump version to X.Y.Z"
git push origin main  # Dispara workflow
```

## ⚠️ Pontos de Atenção

- **Módulos nativos**: serialport e printer precisam de rebuild para cada versão do Electron
- **Single instance**: Não permite múltiplas instâncias simultâneas
- **Tray**: App minimiza para tray ao fechar, use menu para sair completamente
- **Windows only**: Build principal é para Windows (NSIS installer)

## 📝 Comandos Úteis

```bash
npm start             # Executar app
npm run dev           # Executar com hot-reload
npm run build         # Build Windows
npm run bump          # Incrementar versão patch
```

## 🐛 Debug

- DevTools: Ctrl+Shift+I na janela do app
- Logs do main process: console do terminal
- Logs do renderer: DevTools Console
