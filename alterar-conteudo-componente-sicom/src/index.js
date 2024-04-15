const { default: axios } = require("axios");
const { log } = require("console");
const headers = {
    "App-Context": "eyJleGVyY2ljaW8iOjIwMjN9",
    "Authorization": "Bearer 9aff02ee-cd3d-41b1-941b-16dc68814fb9",
    "User-Access": "IhW6KADGBR-O5FxJlTyxFA==",
    "Content-Type": "application/json"
}
const qs = require('querystring')

const planoContasId = 8571
const keyGlobal = 'TEFOQ0FNRU5UT19DT05UQUJJTHwxOTU3Mzc4'

function flatten(arrays) {
    return [].concat.apply([], arrays);
}

async function run() {
    let API_LIST = `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-encerramento/${keyGlobal}`
    log(API_LIST)
    let result = await axios({
        "url": API_LIST,
        "method": "get",
        "headers": headers
    })

    for (let it of result.data.lancamentoEncerramentoItens){
        let conta = it.contaContabil.mascaraFormatada.toString()
        conta = conta.replaceAll(".",'')
        // if (!(/^5317/.exec(conta))) {
        if (!(/^6221303/.exec(conta))) {
            continue
        }
        log(`------------------------------`)
        log(`${conta}\t${it.tipoLancamento.value}\t${it.valor.toString().replace('.',',')}`)
        log(`------------------------------`)

        let result2 = await axios({
            "url": `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-encerramento/${keyGlobal}/itens/${it.id}/contas-correntes/lista-configuracoes`,
            "method": "post",
            "headers": headers
        })
        // // for (let el of result2.data.content.filter((pp) => ["4-Financeiro por fonte","2-Atributos do Superávit Financeiro","Indicador de superávit financeiro"].includes(pp.descricao))) {
        // for (let el of result2.data.content.filter((pp) => ["7-Empenho"].includes(pp.descricao))) {            
        // // for (let el of result2.data.content.filter((pp) => ["EMISSAO DE EMPENHO"].includes(pp.descricao) && pp.lote === "AUDESP Encerramento")) {
        for (let el of result2.data.content.filter((pp) => ["VENCIMENTO DE EMPENHO"].includes(pp.descricao) && pp.lote === "AUDESP Encerramento")) {
        //     // log(el)
            let key = (qs.stringify({ "a": el.id })).replace('a=', '')
            let llSA = []
            let condition = true
            let offset = 0
            let pagina = 0
            while (condition) {
                pagina++
                // log(`https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${keyGlobal}/subdocumentos/${it.idSubdocumentoCPC}/contas-correntes/${key}/itens?limit=20&offset=${offset}`)

                let dSaldoInicial = await axios({
                    "url": `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-encerramento/${keyGlobal}/itens/${it.id}/contas-correntes/${key}/itens?limit=20&offset=${offset}`,
                    "method": "get",
                    "headers": headers
                })
                // console.log(dSaldoInicial.data.content);
                for(let el of dSaldoInicial.data.content){
                    // log(`${el.componentes.map((pp) => pp.valor).join('\t')}\t${el.tipo.value}\t${el.valor.toString().replace('.',',')}\t${pagina}`)
                    log(`${el.id}\t${el.componentes.map((pp) => pp.valor).join('\t')}\t${el.tipo.value}\t${el.valor.toString().replace('.',',')}`)
                    // log(`${el.componentes.valor.join('\t')}`)
                    // break
                }
                llSA.push(dSaldoInicial.data.content)
                if (!dSaldoInicial.data.hasNext) { condition = false }
                offset += 20
                // condition = false
            }
            // llSA = flatten(llSA)
            // for (let deleteId of llSA) {
            //     log(deleteId)
            //     // log(`https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${keyGlobal}/subdocumentos/${deleteId.idSubdocumentoCPC}/contas-correntes/${key}/itens/${deleteId.id}`)
            //     // let queryCCCOMP = await axios({
            //     //     "url": `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${keyGlobal}/subdocumentos/${deleteId.idSubdocumentoCPC}/contas-correntes/${key}/itens/${deleteId.id}`,
            //     //     "method": "delete",
            //     //     "headers": headers
            //     // })
            //     // console.log(`[SUCESSO] - ${deleteId.id}`);
            // }
        }
        // break
    }

    return
    

}


run()

