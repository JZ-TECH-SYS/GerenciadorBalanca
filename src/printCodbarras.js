const printer = require('printer');
const { Notification } = require('electron');
const { findProduto } = require('./help.js');

//"343232-2.500" codico de barras ZPL
async function generateZPLContent(weight, cod_barras) {
    const produto = await findProduto(cod_barras);
    if(!produto){
        new Notification({
            title: 'Atenção',
            body: `Produto não encontrado!!`
        }).show();
        return null;
    }
    const weightInKilos = +(weight / 1000).toFixed(3);
    const totalValue = weightInKilos * produto.preco;
    const lineSpacing = 35; // Espaçamento entre linhas. Altere esse valor para ajustar o espaçamento
    const barcodeText = `${produto.cod_barras}-${weightInKilos}`;
    const zpl = `
        ^XA
        ^PW540                  // Define a largura da impressão
        ^LL490                  // Define a altura da impressão
        ^CF0,30                 // Tamanho da fonte
        ^FO50,${1 * lineSpacing}^FD 'Terere' Station ^FS
        ^FO50,${2 * lineSpacing}^FD Nome: ${produto.nome}^FS
        ^FO50,${3 * lineSpacing}^FD Valor: ${totalValue.toFixed(2)} ^FS
        ^FO50,${4 * lineSpacing}^FD Obrigado pela escolha !^FS
        ^FO60,${5 * lineSpacing}^BCN,100,Y,N,N^FD${barcodeText}^FS  
        ^XZ
    `;
    return zpl;
}

async function printDireto(printerName, cod_barras) {
    const zplContent = await generateZPLContent(1000,cod_barras);
    
    if(!zplContent){
        return;
    }
    printer.printDirect({
        printer: printerName,
        data: zplContent, // Dados que você deseja imprimir
        success: function(jobID) {
          new Notification({
            title: 'Impressão enviada',
            body: 'imprimindo...'+jobID
          }).show();
        },
        error: function(err) {
            new Notification({
                title: 'erro ao imprimir',
                body: 'eror: '+err
            }).show();
        }
      });
}

module.exports = {
    printDireto
};
