const { default: axios } = require("axios");

exports.contaCorrenteBySICOM = async function  (config,componente = null) {
    let url = ""
    if(!componente){
        url = `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${config.cloudConfig.planoContasId}/contas-correntes/configuracoes?filter=&limit=100&offset=0`
    }else{
        url = `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${config.cloudConfig.planoContasId}/contas-correntes/configuracoes?filter=(composicao+elike+%22%2525${componente}%2525%22)&limit=100&offset=0`
    }
    // console.log(url);
    let result = await axios({
        "url": url,
        "method": 'get',
        "headers": config.authorizationCloud
    })
    // console.log(JSON.stringify(result.data.content,null,2))
    return result.data.content
}





