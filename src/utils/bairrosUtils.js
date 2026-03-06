// ============================================
// VALIDAÇÃO E NORMALIZAÇÃO DE BAIRROS - CACOAL/RO
// Baseado na lista oficial dos Correios (QualoCEP)
// ============================================

// Lista oficial de bairros de Cacoal-RO (fonte: Correios)
export const BAIRROS_OFICIAIS_CACOAL = [
    'ALPHA PARQUE',
    'ALPHAVILLE',
    'ÁREA RURAL DE CACOAL',
    'BALNEÁRIO ARCO-ÍRIS',
    'CENTRO',
    'CHÁCARAS BRIZON',
    'COLINA VERDE',
    'CONJUNTO HALLEY',
    'DISTRITO RIOZINHO',
    'ELDORADO',
    'EMBRATEL',
    'FLORESTA',
    'HABITAR BRASIL',
    'HABITAR BRASIL II',
    'INCRA',
    'INDUSTRIAL',
    'JARDIM BANDEIRANTES',
    'JARDIM CLODOALDO',
    'JARDIM EUROPA',
    'JARDIM ITÁLIA',
    'JARDIM ITÁLIA I',
    'JARDIM LIMOEIRO',
    'JARDIM PAULISTA',
    'JARDIM SÃO PEDRO I',
    'JARDIM SÃO PEDRO II',
    'JARDIM SAÚDE',
    'JOSINO BRITO',
    'LIBERDADE',
    'MORADA DO BOSQUE',
    'MORADA DO SOL',
    'NOVA ESPERANÇA',
    'NOVO CACOAL',
    'NOVO HORIZONTE',
    'PARQUE DOS LAGOS',
    'PARQUE FORTALEZA',
    'PARQUE INDUSTRIAL GOVERNADOR JERONIMO SANTANA',
    'PRINCESA ISABEL',
    'PROSPERIDADE',
    'RESIDENCIAL CIDADE VERDE',
    'RESIDENCIAL PAINEIRAS',
    'RESIDENCIAL PARQUE ALVORADA',
    'RESIDENCIAL PARQUE BRIZON',
    'SANTO ANTÔNIO',
    'SETE DE SETEMBRO',
    'SOCIEDADE BELA VISTA',
    'TEIXEIRÃO',
    'VILA ROMANA',
    'VILA VERDE',
    'VILLAGE DO SOL',
    'VILLAGE DO SOL II',
    'VISTA ALEGRE'
];

// ... (código intermediário inalterado)



// Mapeamento de variações comuns para nomes oficiais
const MAPEAMENTO_BAIRROS = {
    // Centro
    'centro': 'CENTRO',
    'cenreo': 'CENTRO',

    // Teixeirão
    'teixeirao': 'TEIXEIRÃO',
    'texeirao': 'TEIXEIRÃO',
    'teixerao': 'TEIXEIRÃO',
    'barrio teixeirao': 'TEIXEIRÃO',
    'bairro teixeirao': 'TEIXEIRÃO',
    'tx': 'TEIXEIRÃO',

    // Greenville (não é oficial - mapear para mais próximo ou manter)
    'greenville': 'GREENVILLE',
    'green ville': 'GREENVILLE',
    'greenvile': 'GREENVILLE',
    'greville': 'GREENVILLE',
    'greenvili': 'GREENVILLE',
    'grenvile': 'GREENVILLE',
    'grevile': 'GREENVILLE',
    'green vile': 'GREENVILLE',

    // Brizon
    'brizon': 'CHÁCARAS BRIZON',
    'brizom': 'CHÁCARAS BRIZON',
    'chacaras brizon': 'CHÁCARAS BRIZON',
    'parque brizon': 'RESIDENCIAL PARQUE BRIZON',
    'residencial parque brizon': 'RESIDENCIAL PARQUE BRIZON',

    // Paineiras
    'paineiras': 'RESIDENCIAL PAINEIRAS',
    'paineira': 'RESIDENCIAL PAINEIRAS',
    'paineras': 'RESIDENCIAL PAINEIRAS',
    'paneira': 'RESIDENCIAL PAINEIRAS',
    'residencial paineiras': 'RESIDENCIAL PAINEIRAS',
    'residencial paineras': 'RESIDENCIAL PAINEIRAS',

    // Novo Horizonte
    'novo horizonte': 'NOVO HORIZONTE',

    // Vista Alegre
    'vista alegre': 'VISTA ALEGRE',

    // Jardim Clodoaldo
    'jardim clodoaldo': 'JARDIM CLODOALDO',
    'jd clodoaldo': 'JARDIM CLODOALDO',
    'clodualdo': 'JARDIM CLODOALDO',

    // Josino Brito
    'josino brito': 'JOSINO BRITO',

    // Novo Cacoal
    'novo cacoal': 'NOVO CACOAL',

    // Village do Sol
    'village do sol': 'VILLAGE DO SOL',
    'village': 'VILLAGE DO SOL',
    'vilage do sol': 'VILLAGE DO SOL',
    'vilage': 'VILLAGE DO SOL',
    'village do sol 1': 'VILLAGE DO SOL',
    'village do sol i': 'VILLAGE DO SOL',
    'vilage do sol 1': 'VILLAGE DO SOL',
    'village do sol 2': 'VILLAGE DO SOL II',
    'village do sol ii': 'VILLAGE DO SOL II',
    'vilage do sol 2': 'VILLAGE DO SOL II',
    'vilage do sol dois': 'VILLAGE DO SOL II',
    'vilage do sol ll': 'VILLAGE DO SOL II',
    'vilage do sol 3': 'VILLAGE DO SOL II',
    'village do sol 3': 'VILLAGE DO SOL II',

    // Jardim Bandeirantes
    'jardim bandeirantes': 'JARDIM BANDEIRANTES',
    'jardim bandeirante': 'JARDIM BANDEIRANTES',
    'bandeirantes': 'JARDIM BANDEIRANTES',

    // Floresta
    'floresta': 'FLORESTA',
    'bairro floresta': 'FLORESTA',

    // Parque dos Lagos
    'parque dos lagos': 'PARQUE DOS LAGOS',

    // Jardim Europa
    'jardim europa': 'JARDIM EUROPA',

    // Jardim Paulista
    'jardim paulista': 'JARDIM PAULISTA',

    // Jardim Saúde
    'jardim saude': 'JARDIM SAÚDE',

    // Jardim Itália
    'jardim italia': 'JARDIM ITÁLIA',
    'jardim italia 1': 'JARDIM ITÁLIA I',
    'jardim italia i': 'JARDIM ITÁLIA I',
    'jardim italia1': 'JARDIM ITÁLIA I',
    'jardim italia 2': 'JARDIM ITÁLIA',
    'jardim italia ii': 'JARDIM ITÁLIA',
    'jardim italia 3': 'JARDIM ITÁLIA',

    // Residencial Cidade Verde
    'residencial cidade verde': 'RESIDENCIAL CIDADE VERDE',
    'residencia cidade verde': 'RESIDENCIAL CIDADE VERDE',
    'cidade verde': 'RESIDENCIAL CIDADE VERDE',

    // Arco-Íris
    'arco-iris': 'BALNEÁRIO ARCO-ÍRIS',
    'arco iris': 'BALNEÁRIO ARCO-ÍRIS',
    'balneario arco-iris': 'BALNEÁRIO ARCO-ÍRIS',

    // Santo Antônio
    'santo antonio': 'SANTO ANTÔNIO',
    'santos antonio': 'SANTO ANTÔNIO',

    // Vila Verde
    'vila verde': 'VILA VERDE',
    'villa verde': 'VILA VERDE',

    // Parque Fortaleza
    'parque fortaleza': 'PARQUE FORTALEZA',
    'fortaleza': 'PARQUE FORTALEZA',

    // Industrial
    'industrial': 'INDUSTRIAL',
    'industria': 'INDUSTRIAL',
    'parque industrial': 'PARQUE INDUSTRIAL GOVERNADOR JERONIMO SANTANA',

    // Liberdade
    'liberdade': 'LIBERDADE',
    'liberadade': 'LIBERDADE',
    'bnh': 'LIBERDADE',

    // Habitar Brasil
    'habitar brasil': 'HABITAR BRASIL',
    'habita brasil': 'HABITAR BRASIL',
    'habitar brasil ii': 'HABITAR BRASIL II',
    'habitar brasil 2': 'HABITAR BRASIL II',

    // Sete de Setembro
    'sete setembro': 'SETE DE SETEMBRO',
    'sete de setembro': 'SETE DE SETEMBRO',
    '7 de setembro': 'SETE DE SETEMBRO',

    // Bela Vista
    'bela vista': 'SOCIEDADE BELA VISTA',
    'sociedade bela vista': 'SOCIEDADE BELA VISTA',

    // Conjunto Halley
    'conjunto halley': 'CONJUNTO HALLEY',
    'conj halley': 'CONJUNTO HALLEY',

    // Alpha Parque
    'alpha parque': 'ALPHA PARQUE',
    'alfa park': 'ALPHA PARQUE',
    'alfa parque': 'ALPHA PARQUE',
    'alfha parque': 'ALPHA PARQUE',

    // Zona Rural
    'zona rural': 'ÁREA RURAL DE CACOAL',
    'rural': 'ÁREA RURAL DE CACOAL',
    'area rural': 'ÁREA RURAL DE CACOAL',
    'area rural de cacoal': 'ÁREA RURAL DE CACOAL',
    'linha 07': 'ÁREA RURAL DE CACOAL',
    'linha 7': 'ÁREA RURAL DE CACOAL',

    // Riozinho
    'riozinho': 'DISTRITO RIOZINHO',
    'distrito riozinho': 'DISTRITO RIOZINHO',

    // Greenville (loteamento não oficial)
    'greenville 2': 'GREENVILLE',
    'greenville 1': 'GREENVILLE',
    'greenville ii': 'GREENVILLE',
    'greenville i': 'GREENVILLE',

    // Parque dos Buritis (loteamento não oficial)
    'parque dos buritis': 'PARQUE DOS BURITIS',
    'buritis': 'PARQUE DOS BURITIS',

    // Outros
    'embratel': 'EMBRATEL',
    'incra': 'INCRA',
    'alphaville': 'ALPHAVILLE',
    'eldorado': 'ELDORADO',
    'colina verde': 'COLINA VERDE',
    'parque alvorada': 'RESIDENCIAL PARQUE ALVORADA',
    'residencial parque alvorada': 'RESIDENCIAL PARQUE ALVORADA',
    'princesa isabel': 'PRINCESA ISABEL',
    'nova esperanca': 'NOVA ESPERANÇA',
    'jardim limoeiro': 'JARDIM LIMOEIRO',
    'morada do bosque': 'MORADA DO BOSQUE',
    'morada do sol': 'MORADA DO SOL',
    'prosperidade': 'PROSPERIDADE',
    'vila romana': 'VILA ROMANA',
    'jardim sao pedro i': 'JARDIM SÃO PEDRO I',
    'jardim sao pedro ii': 'JARDIM SÃO PEDRO II',
    'jardim sao pedro 1': 'JARDIM SÃO PEDRO I',
    'jardim sao pedro 2': 'JARDIM SÃO PEDRO II',
};

/**
 * Remove acentos de uma string
 */
function removerAcentos(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza o nome do bairro para busca
 */
function normalizarParaBusca(bairro) {
    if (!bairro || typeof bairro !== 'string') return '';
    return removerAcentos(bairro.trim().toLowerCase()).replace(/\s+/g, ' ');
}

/**
 * Normaliza e valida o bairro
 * @param {string} bairro - Nome do bairro informado
 * @returns {object} - { valido: boolean, bairro: string, oficial: boolean, sugestao: string|null, foiNormalizado: boolean }
 */
export function validarBairro(bairro) {
    if (!bairro || typeof bairro !== 'string') {
        return { valido: false, bairro: '', oficial: false, sugestao: null, foiNormalizado: false };
    }

    const bairroTrimmed = bairro.trim();
    const bairroNormalizado = normalizarParaBusca(bairroTrimmed);

    // 1. Busca no mapeamento de variações (comparação normalizada)
    const chaveEncontrada = Object.keys(MAPEAMENTO_BAIRROS).find(
        chave => normalizarParaBusca(chave) === bairroNormalizado
    );

    if (chaveEncontrada) {
        const bairroOficial = MAPEAMENTO_BAIRROS[chaveEncontrada];
        return {
            valido: true,
            bairro: bairroOficial,
            oficial: BAIRROS_OFICIAIS_CACOAL.includes(bairroOficial),
            sugestao: null,
            foiNormalizado: bairroOficial !== bairroTrimmed
        };
    }

    // 2. Busca direta na lista oficial (sem acento, case-insensitive)
    const bairroEncontrado = BAIRROS_OFICIAIS_CACOAL.find(
        b => normalizarParaBusca(b) === bairroNormalizado
    );

    if (bairroEncontrado) {
        return {
            valido: true,
            bairro: bairroEncontrado,
            oficial: true,
            sugestao: null,
            foiNormalizado: bairroEncontrado !== bairroTrimmed
        };
    }

    // 3. Busca parcial - encontra sugestão
    const sugestao = BAIRROS_OFICIAIS_CACOAL.find(
        b => normalizarParaBusca(b).includes(bairroNormalizado) ||
            bairroNormalizado.includes(normalizarParaBusca(b))
    );

    // 4. Se encontrou sugestão exata ou parcial muito boa, usa ela
    if (sugestao && normalizarParaBusca(sugestao).includes(bairroNormalizado)) {
        return {
            valido: true,
            bairro: sugestao,
            oficial: true,
            sugestao: null,
            foiNormalizado: sugestao !== bairroTrimmed
        };
    }

    // 5. Retorna formatado em UPPERCASE se não encontrar correspondência
    const bairroFormatado = bairroTrimmed.toUpperCase();

    return {
        valido: true,
        bairro: bairroFormatado,
        oficial: false,
        sugestao: sugestao || null,
        foiNormalizado: bairroFormatado !== bairroTrimmed
    };
}

/**
 * Função simples para normalizar bairro (para uso direto no cadastro)
 * @param {string} bairro - Nome do bairro
 * @returns {string} - Nome normalizado
 */
export function normalizarBairro(bairro) {
    const resultado = validarBairro(bairro);
    return resultado.bairro;
}

/**
 * Retorna lista de bairros oficiais para autocomplete/select
 */
export function listarBairrosOficiais() {
    return [...BAIRROS_OFICIAIS_CACOAL].sort();
}

/**
 * Filtra bairros para autocomplete baseado no texto digitado
 * @param {string} texto - Texto digitado pelo usuário
 * @param {number} limite - Número máximo de sugestões (padrão: 5)
 * @returns {string[]} - Lista de bairros que correspondem
 */
export function filtrarBairrosAutocomplete(texto, limite = 5) {
    if (!texto || texto.length < 2) return [];

    const textoNormalizado = normalizarParaBusca(texto);

    // Primeiro, busca os que começam com o texto
    const comecaCom = BAIRROS_OFICIAIS_CACOAL.filter(b =>
        normalizarParaBusca(b).startsWith(textoNormalizado)
    );

    // Depois, busca os que contém o texto
    const contem = BAIRROS_OFICIAIS_CACOAL.filter(b =>
        normalizarParaBusca(b).includes(textoNormalizado) &&
        !comecaCom.includes(b)
    );

    return [...comecaCom, ...contem].slice(0, limite);
}
