const fs = require('fs');
const path = require('path');
const axios = require('axios');
const Store = require('electron-store');
const store = new Store();

async function getProdutosApi() {
      let url = store.get('api','');
      if(url == ''){
        return [];
      }
     const response = await axios.get(url);
     return response.data.result;   
}

async function findProduto(produtoId) {
    console.log("Buscando produto com código de barras:", produtoId);
    const produtos = await getProdutosApi();
    let produtoEncontrado = null;

    for(let i = 0; i < produtos.length; i++) {
        if(produtos[i].cod_barras == produtoId) {
            produtoEncontrado = produtos[i];
            break;  // Sai do loop assim que encontrar o produto
        }
    }

    return produtoEncontrado;
}

async function findProdutoTodos(produtoId) {
    const produtos = await getProdutosApi();
    const produto = produtos.filter(p => +p.codbarras == +produtoId);
    return produto[0] ?? null;
}

module.exports = {
    findProduto
   ,findProdutoTodos
};
