# 🏋️ Gerenciador Balança

![GitHub release](https://img.shields.io/github/v/release/JZ-TECH-SYS/GerenciadorBalanca?style=flat-square)
![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/JZ-TECH-SYS/GerenciadorBalanca/release.yml?style=flat-square)
![License](https://img.shields.io/github/license/JZ-TECH-SYS/GerenciadorBalanca?style=flat-square)

Aplicação desktop em **Electron** para gerenciamento de balança **Urano UDC-CO 30/5** - Leitura de peso via porta serial e impressão de etiquetas térmicas.

## ✨ Funcionalidades

- 📊 **Leitura de Peso** - Comunicação serial em tempo real com a balança
- 🏷️ **Impressão de Etiquetas** - Suporte a impressoras térmicas
- 🔗 **Integração com API** - Sincronização de produtos
- 💾 **Persistência** - Armazenamento local de configurações
- 🔒 **Single Instance** - Apenas uma instância da aplicação por vez
- 📌 **System Tray** - Minimiza para bandeja do sistema

---

## 📋 Requisitos do Sistema

### Node.js
- **Node.js**: v20.x ou v22.x
- **npm**: v10.x ou superior

### Dependências Nativas (Windows)

Este projeto usa módulos nativos (`serialport`, `printer`) que precisam ser compilados:

#### 1. Python 3.11
```powershell
winget install Python.Python.3.11
```

#### 2. Visual Studio Build Tools 2022
```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
```

> ⚠️ **Importante**: Após instalar Python e Build Tools, **reinicie o terminal/VS Code** para que as variáveis de ambiente sejam atualizadas.

---

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone https://github.com/JZ-TECH-SYS/GerenciadorBalanca.git
cd GerenciadorBalanca
```

### 2. Instale as dependências
```bash
npm install --legacy-peer-deps
```

> **Nota**: O parâmetro `--legacy-peer-deps` é necessário devido a conflitos de versão em algumas dependências.

---

## 💻 Executando

### Modo Produção
```bash
npm start
```

### Modo Desenvolvimento (com hot-reload via nodemon)
```bash
npm run dev
```

---

## 📦 Build e Distribuição

### Windows (gera instalador .exe)
```bash
npm run build
# ou
npm run dist:windows
```

### Linux
```bash
npm run dist:linux
```

### macOS
```bash
npm run dist:mac
```

Os artefatos de build são gerados na pasta `dist/`.

---

## 🔄 Versionamento

### Incrementar versão (patch)
```bash
npm run bump
```
Isso incrementa automaticamente a versão patch (ex: 2.1.0 → 2.1.1)

### Release Automático
Ao fazer push na branch `main`, o GitHub Actions automaticamente:
1. Faz build do instalador Windows
2. Cria uma Release com a versão do `package.json`
3. Anexa o `.exe` e `latest.yml` à release

---

## 📁 Estrutura do Projeto

```
GerenciadorBalanca/
├── .github/
│   ├── copilot-instructions.md  # Instruções para GitHub Copilot
│   └── workflows/
│       └── release.yml          # CI/CD - Build e Release automático
├── assets/
│   ├── css/
│   │   ├── app.css              # Estilos customizados
│   │   └── bootstrap5.0.2.min.css
│   ├── html/
│   │   ├── main.html            # Tela principal (produtos + peso)
│   │   └── settings.html        # Configurações
│   ├── img/
│   │   └── balanca.png          # Ícone da aplicação
│   └── js/
│       └── bootstrap5.0.2.js
├── script/
│   └── bumpVersion.js           # Script para incrementar versão
├── src/
│   ├── preload/
│   │   └── preload.js           # Bridge seguro para IPC
│   └── services/
│       ├── ApiService.js        # Comunicação com API externa
│       ├── BalancaService.js    # Comunicação serial com balança
│       └── PrinterService.js    # Impressão de etiquetas
├── backup/                      # Arquivos de backup (legado)
├── main.js                      # Processo principal do Electron
├── nodemon.json                 # Configuração do hot-reload
├── package.json                 # Dependências e scripts
└── README.md
```

---

## ⚙️ Configurações

As configurações são armazenadas via `electron-store` e incluem:

| Configuração | Descrição |
|--------------|-----------|
| `porta_balanca` | Porta COM da balança (ex: COM3) |
| `impressora` | Nome da impressora padrão |
| `api_url` | URL da API de produtos |

---

## 🔧 Solução de Problemas

### ❌ Erro: "Python is not set" ou "Could not find any Python installation"
Instale o Python 3.11 conforme instruções acima e reinicie o terminal.

### ❌ Erro: "Could not find any Visual Studio installation"
Instale o Visual Studio Build Tools 2022 conforme instruções acima e reinicie o terminal.

### ❌ Erro: "EPERM: operation not permitted"
Feche todas as instâncias do Electron/Node.js e tente novamente:
```powershell
Get-Process electron -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Remove-Item -Path "node_modules" -Recurse -Force
npm install --legacy-peer-deps
```

### ❌ Erro: "'electron' não é reconhecido como comando"
Execute via npm que resolve o caminho automaticamente:
```bash
npm start
```

### ❌ Porta COM não aparece / Balança não conecta
1. Verifique se a balança está ligada e conectada via USB/Serial
2. No Gerenciador de Dispositivos, verifique qual porta COM foi atribuída
3. Configure a porta correta nas Configurações do app

---

## 🛠️ Tecnologias Utilizadas

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **Electron** | v26.x | Framework desktop multiplataforma |
| **SerialPort** | v9.x | Comunicação serial com a balança |
| **Printer** | v0.4.x | Acesso a impressoras do sistema |
| **electron-store** | v8.x | Persistência de configurações |
| **axios** | v1.x | Requisições HTTP |
| **node-thermal-printer** | v4.x | Formatação para impressoras térmicas |
| **Bootstrap** | v5.0.2 | Framework CSS |

---

## 📝 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| `start` | `npm start` | Executa a aplicação |
| `dev` | `npm run dev` | Executa com hot-reload (nodemon) |
| `build` | `npm run build` | Build Windows (NSIS installer) |
| `bump` | `npm run bump` | Incrementa versão patch |
| `dist:windows` | `npm run dist:windows` | Build para Windows |
| `dist:linux` | `npm run dist:linux` | Build para Linux |
| `dist:mac` | `npm run dist:mac` | Build para macOS |

---

## 📄 Licença

Este projeto está licenciado sob a licença **ISC**.

---

## 👨‍💻 Autor

Desenvolvido por **joaosn** - [JZ-TECH-SYS](https://github.com/JZ-TECH-SYS)
