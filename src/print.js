const printer = require('printer');
const { Notification } = require('electron');
const { findProduto } = require('./help.js');

//"343232-2.500" codico de barras ZPL
async function generateZPLContent(weight, codbarra) {
    const produto = await findProduto(codbarra);
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
        ^FO50,${1 * lineSpacing}^FD 'Teras' Stations - A granel ^FS
        ^FO50,${2 * lineSpacing}^FD Peso: ${weightInKilos.toFixed(3)} Kg ^FS
        ^FO50,${3 * lineSpacing}^FD valor/Kg: R$ ${produto.preco} ^FS  // Ajustei essa linha
        ^FO50,${4 * lineSpacing}^FD Total: ${totalValue.toFixed(2)} ^FS
        ^FO50,${5 * lineSpacing}^FD Sabor: ${produto.nome}^FS
        ^FO50,${6 * lineSpacing}^BCN,100,Y,N,N^FD${barcodeText}^FS  
        ^XZ
    `;
    return zpl;
}


async function printToLabelPrinter(peso, printerName, codbarra) {
    const zplContent = await generateZPLContent(peso,codbarra);
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
    printToLabelPrinter
};
