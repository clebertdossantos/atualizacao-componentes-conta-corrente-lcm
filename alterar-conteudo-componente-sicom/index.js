const {contaCorrenteBySICOM} = require('../utils/utils-conta-corrente')
const {substituirConteudoContaCorrenteLancamentoAcumulado} = require('../utils/escrituracao')
const config_cloud = require('../utils/config')
const {log} = require('console')

async function run () {
    let estruturaContasCorrentes = await contaCorrenteBySICOM(config_cloud,'Organograma')
    await substituirConteudoContaCorrenteLancamentoAcumulado(config_cloud,estruturaContasCorrentes,6,10)
}

run()


