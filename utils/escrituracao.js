const { default: axios } = require("axios");
const { log } = require("console");
const {stringify} = require('querystring')


// Helper function to format date to 'YYYY-MM-DD' format
function formatDate(date) {
    let year = date.getFullYear();
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // Adding 1 to month because it's zero-based
    let day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getFirstAndLastDayOfMonth(month, year) {
    // log(`${month}-${year}`)
    // Create a Date object with the given month and year
    let firstDay = new Date(year, month - 1, 1); // Month is 0-based in JavaScript, so subtract 1
    let lastDay = new Date(year, month, 0); // Setting day to 0 gets the last day of the previous month

    // Format the dates to return as strings
    let formattedFirstDay = formatDate(firstDay);
    let formattedLastDay = formatDate(lastDay);

    return {
        firstDay: formattedFirstDay,
        lastDay: formattedLastDay
    };
}

async function buscaLancamentosAcumulativos(mesIni,mesFim,authorizationCloud,exercicio){
    let lLancamentos = []
    for(let mm=mesIni; mm<= mesFim;mm++){
        let {firstDay , lastDay } = getFirstAndLastDayOfMonth(mm,exercicio)
        let qFilter = `(documento.data+%3E%3D${firstDay}+and+documento.data+%3C%3D${lastDay})+and+documento.status+in+(%22ESCRITURADO%22,%22NAO_ESCRITURADO%22)+&limit=100&offset=0`
        // log(`https://esc-api-rest.betha.cloud/escrituracao/api/documentos?filter=${qFilter}`)
        let result = await axios({
            "url": `https://esc-api-rest.betha.cloud/escrituracao/api/documentos?filter=${qFilter}`,
            "method": 'get',
            "headers": authorizationCloud
        })
        // let lancamentosId = result.data.content.map((pp) => pp.id)
        // log(lancamentosId);
        for(let ii of result.data.content){ lLancamentos.push(ii) }
        // break
    }
    return lLancamentos

}

async function rastreiaLancamentoAcumulativoContaCorrente(exContaCorrente,lancamento,authorizationCloud,planoContasId,compContasCorrentes,relacOrganograma){
    let result = await axios({
        "url": `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}`,
        "method" : "get",
        "headers": authorizationCloud
    })
    let lContaCorrenteVerificacao = exContaCorrente.map((el) => `${el.lote.descricao}|${el.descricao}`)
    // log(lContaCorrenteVerificacao)
    for(let el of result.data.itens){
        // log(el)
        // log(`https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}/subdocumentos/${el.idSubdocumentoCPC}/contas-correntes/lista-configuracoes`)
        let lancamentoCC = await axios({
            "url": `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}/subdocumentos/${el.idSubdocumentoCPC}/contas-correntes/lista-configuracoes`,               
            "method": "post",
            "headers": authorizationCloud,
            "data": {}
        })
        // log(lancamentoCC.data.content)
        for(let cc of lancamentoCC.data.content){
            let key = `${cc.lote}|${cc.descricao}`
            if(lContaCorrenteVerificacao.includes(key)){
                let qContaCorrente = exContaCorrente.filter((pp) => pp.lote.descricao === cc.lote && pp.descricao === cc.descricao)
                if(qContaCorrente.length === 0){
                    log(`[AVISO] - O conta corrente ${cc.descricao}(${cc.lote}) não existe na entidade!`)
                    continue
                }else{
                    qContaCorrente = qContaCorrente[0]
                }
                log(`${lancamento.data} >> ${el.contaContabil.mascara} >> ${key}`)
                // log(JSON.stringify(qContaCorrente,null,2))
                let controleEnquanto =  {
                    "limit" : 20,
                    "offset": 0,
                    "condition" : true
                }
                let keyCC = (stringify({ "a": cc.id })).replace('a=', '')
                // log(`https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}/subdocumentos/${el.idSubdocumentoCPC}/contas-correntes/${keyCC}/itens?limit=20&offset=0`)
                let conteudoCC = []
                while(controleEnquanto.condition){
                    // https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}/subdocumentos/${el.idSubdocumentoCPC}/contas-correntes/SU5GT1JNQURPfDc5NzQ2OTF8MTE5NTM0MQ%3D%3D/itens?limit=20&offset=0
                    let result = await axios({
                        "url": `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}/subdocumentos/${el.idSubdocumentoCPC}/contas-correntes/${keyCC}/itens?limit=${controleEnquanto.limit}&offset=${controleEnquanto.offset}`,
                        "headers": authorizationCloud,
                        "method": "get"
                    })
                    for(let lanctoCC of result.data.content){ conteudoCC.push(lanctoCC) }
                    if(!result.data.hasNext){
                        controleEnquanto.condition = false
                    }else{
                        controleEnquanto.offset+= controleEnquanto.limit
                    }
                }
                let ccOrganogramaId = qContaCorrente.composicao.filter((pp) => pp.componente.descricao === 'Organograma')[0].id
                log(`${qContaCorrente.lote.descricao}|${qContaCorrente.descricao} >> ccOrganogramaId >> ${ccOrganogramaId}`)
                //! validação conta corrente
                let lAtualizaContaCorrente = [] // somente os contas correntes que precisam ser atualizados depois de validado e alterada sua estrutura
                for(let ii=0;ii<=conteudoCC.length-1;ii++){
                    for(let yy=0;yy<=conteudoCC[ii].componentes.length-1;yy++){
                        if(conteudoCC[ii].componentes[yy].configuracao.id.toString() === ccOrganogramaId.toString()){
                            if(conteudoCC[ii].componentes[yy].valor.length === 8){ // TODO : CRIAR UMA VALIDAÇÀO PARA QUANDO O NÚMERO DO ORGÃO ESTÁ OK.. PARA NÃO PRECISAR DAR UPDATE....
                                log(`[INFO] - Organograma ${conteudoCC[ii].componentes[yy].valor} já está correto!`)
                                continue
                            }else{
                                // FAZER A ATUALIZAÇÀO DO CONTA CORRENTE E ADICIONAR NA LISTA NOVA
                                if(relacOrganograma[conteudoCC[ii].componentes[yy].valor]){
                                    log(`[SUCESO] - de x para ${conteudoCC[ii].componentes[yy].valor} >> ${relacOrganograma[conteudoCC[ii].componentes[yy].valor]}`)
                                    conteudoCC[ii].componentes[yy].valor = relacOrganograma[conteudoCC[ii].componentes[yy].valor]
                                    
                                    for(let ww=0;ww<=conteudoCC[ii].componentes.length-1;ww++){
                                        // log(qContaCorrente)
                                        // log(conteudoCC[ii].componentes[ww])
                                        let compAt = qContaCorrente.composicao.filter((cc) => cc.id.toString() === conteudoCC[ii].componentes[ww].configuracao.id.toString()).at()
                                        let cfgCompAt = compContasCorrentes.filter((cmp) => cmp.id === compAt.componente.id).at()
                                        // log(compAt)
                                        conteudoCC[ii].componentes[ww].configuracao['titulo'] =  compAt.componente.descricao
                                        conteudoCC[ii].componentes[ww].configuracao['formato'] = cfgCompAt.tipo
                                        conteudoCC[ii].componentes[ww].configuracao['posicao'] =  compAt.posicao
                                        conteudoCC[ii].componentes[ww].configuracao['configuracao'] = {}
                                        conteudoCC[ii].componentes[ww].configuracao['fonteAtivoId'] = null
                                        conteudoCC[ii].componentes[ww].configuracao['metadado'] = null
                                        conteudoCC[ii].componentes[ww].configuracao['campoFiltro'] = null
                                        conteudoCC[ii].componentes[ww].configuracao['principal'] = false
                                        // log(JSON.stringify(conteudoCC[ii],null,2))
                                        // console.error('EROOORRR!!!!')
                                        // log('===================')
                                    }

                                    let urlPUT = `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${lancamento.id}/subdocumentos/${el.idSubdocumentoCPC}/contas-correntes/${keyCC}/itens/${conteudoCC[ii].id}`
                                    delete conteudoCC[ii].id
                                    let putContaCorrente = await axios({
                                        "url": urlPUT,
                                        "headers": authorizationCloud,
                                        "method": "put",
                                        "data": conteudoCC[ii]
                                    })
                                    break
                                }else{
                                    log(`[ERRO] - Organograma ${conteudoCC[ii].componentes[yy].valor} precisade de x para!`)
                                }
                            }
                        }else{
                            continue // quando não for aquele componente pula a linha
                        }
                    }
                    // log(JSON.stringify(conteudoCC[ii],null,2))
                    // log('=============================')
                    // break
                }
                // break
            }else{
                continue
            }
        }
        // break
    }
}

async function buscaCampoAdicional(keyCaOrganograma,registroId,agrupador,variavel,authorizationCloud){
    let queryCA = await axios({
        "url" : `https://plataforma-cpa.betha.cloud/campos-adicionais/api/campos/load/${keyCaOrganograma}/${registroId}`,
        "method": "get",
        "headers": authorizationCloud
    })
    let vlrCA = null
    for(let ii of queryCA.data.agrupadores.filter((pp) => pp.titulo === agrupador)){
        for(cpa of ii.campos){
            if(cpa.variavel === variavel){
                vlrCA = cpa.valor
                break
            }else{
                continue
            }
        }
    }
    return vlrCA
}

async function buscaRelacionamentoOrganograma(configuracaoOrganogramaId,authorizationCloud,keyCaOrganograma) {
    let objRelac = {}
    let controleEnquanto =  {
        "limit" : 100,
        "offset": 0,
        "condition" : true
    }
    while(controleEnquanto.condition){
        let result = await axios({
            "url": `https://con-api-rest.betha.cloud/contabilidade/api/configuracoes-organogramas/${configuracaoOrganogramaId}/organogramas?filter=&limit=${controleEnquanto.limit}&offset=${controleEnquanto.offset}`,
            "headers": authorizationCloud,
            "method": "get"
        })
        for(let org of result.data.content){
            let vlrCA = await buscaCampoAdicional(keyCaOrganograma,org.id,'SICOM','sicomCodUnidadeSub',authorizationCloud)
            // log(`${org.numero} >> ${vlrCA}`)
            if(vlrCA){
                objRelac[`${vlrCA}`] = org.numero
            }
        }
        if(!result.data.hasNext){
            controleEnquanto.condition = false
        }else{
            controleEnquanto.offset+= controleEnquanto.limit
        }
    }
    return objRelac
}

async function buscaContasCorrentes(authorizationCloud,planoContasId){
    let result = await axios({
        "url" : `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/contas-correntes/componentes?filter=&limit=100&offset=0`,
        "method": "get",
        "headers": authorizationCloud
    })
    return result.data.content
}

async function escrituraLancamentoAcumulativo(lancamentosItems,authorizationCloud,planoContasId) {
    for(let it of lancamentosItems){
        let API = `https://esc-api-rest.betha.cloud/escrituracao/api/configuracoes-planos-contas/${planoContasId}/lancamentos-contabeis/${it.id}/inicia-escrituracao`
        let esc = await axios({
            "url": API,
            "method": "put",
            "headers": authorizationCloud,
            "data": []
        })  
        log(`[ESCRITURADO] - ${it.id}`)
    }
}


exports.substituirConteudoContaCorrenteLancamentoAcumulado = async function  (config,contasCorrentes,mesIni,mesFim) {
    let relacOrganograma = await buscaRelacionamentoOrganograma(config.cloudConfig.configuracaoOrganogramaId,config.authorizationCloud,config.cloudConfig.chaveCampoAdicionalOrganograma)
    let componentesContasCorrentes = await buscaContasCorrentes(config.authorizationCloud,config.cloudConfig.planoContasId)
    let listaLancamentosAcumulativos = await buscaLancamentosAcumulativos(mesIni,mesFim,config.authorizationCloud,config.cloudConfig.exercicio)
    for(llItem of listaLancamentosAcumulativos){
        await rastreiaLancamentoAcumulativoContaCorrente(contasCorrentes,llItem,config.authorizationCloud,config.cloudConfig.planoContasId,componentesContasCorrentes,relacOrganograma)
        // break
    }
    await escrituraLancamentoAcumulativo(listaLancamentosAcumulativos,config.authorizationCloud,config.cloudConfig.planoContasId)
}





