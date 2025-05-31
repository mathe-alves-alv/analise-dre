// netlify/functions/process-dre.js

const pdf = require('pdf-parse'); // Importa a biblioteca pdf-parse
const multiparty = require('multiparty'); // Para lidar com o upload de arquivos FormData

// Função auxiliar para extrair um valor numérico de uma linha
// Ignora o "R$", remove espaços e substitui vírgulas por pontos.
const extractValue = (line) => {
    const match = line.match(/R\$\s*([\d\.,]+)/); // Procura por R$ seguido de número
    if (match && match[1]) {
        return parseFloat(match[1].replace(/\./g, '').replace(',', '.')); // Remove pontos de milhar, troca vírgula por ponto
    }
    // Caso o valor seja 0,00 e venha sem R$ mas com vírgula (ex: "TOTAL: 0,00")
    const zeroMatch = line.match(/[\d\.,]+/)
    if (zeroMatch && parseFloat(zeroMatch[0].replace(/\./g, '').replace(',', '.')) === 0) {
        return 0;
    }
    return 0; // Retorna 0 se não encontrar valor
};

// Mapeamento exato das linhas da sua DRE para facilitar a extração
// Adicionei algumas chaves para o total das seções, que também podem ser úteis
const DRE_LINES = {
    // RECEITAS
    'RECEITAS': 'RECEITAS',
    'Receitas com Vendas': 'Receitas com Vendas',
    'Eventos': 'Eventos',
    'Investimento Atos.': 'Investimento Atos.',
    'Coleta de Oleo': 'Coleta de Oleo',
    'Ganhos Manufatura': 'Ganhos Manufatura', // Adicionado pois estava na DRE
    'Compra Ativo Imobilizado': 'Compra Ativo Imobilizado',

    // DESPESAS
    'DESPESAS': 'DESPESAS',
    'DESPESAS ADMINISTRATIVAS': 'DESPESAS ADMINISTRATIVAS',
    'IPTU': 'IPTU',
    'Energia': 'Energia',
    'Internet': 'Internet',
    'Ração (Iraque, Peixes, Patos e Coelhos)': 'Ração (Iraque, Peixes, Patos e Coelhos)',
    'Material de Escritório': 'Material de Escritório',
    'Material de Limpeza': 'Material de Limpeza',
    'Outras Despesas Administrativas': 'Outras Despesas Administrativas',
    'Aluguel Predial': 'Aluguel Predial',
    'Aluguel de Máquinario e Equipamentos': 'Aluguel de Máquinario e Equipamentos',
    'Aluguel de Impressoras': 'Aluguel de Impressoras',
    'Aluguel Carros': 'Aluguel Carros',
    'Consumo ADM (banda, mkt, perdas, adm, cortesia, etc)': 'Consumo ADM (banda, mkt, perdas, adm, cortesia, etc)',
    'Atos': 'Atos', // Aparece logo abaixo de Consumo ADM

    'DESPESAS COM PESSOAL': 'DESPESAS COM PESSOAL',
    'Salários e Ordenados': 'Salários e Ordenados',
    'Férias': 'Férias',
    '13°. Salário': '13°. Salário',
    'INSS': 'INSS',
    'FGTS': 'FGTS',
    'Pró-Labore': 'Pró-Labore',
    'Vale Transporte': 'Vale Transporte',
    'Outras Despesas com Pessoal': 'Outras Despesas com Pessoal',
    'Diaria': 'Diaria',
    'Gratificação': 'Gratificação',
    'Sindicato': 'Sindicato',
    'Almoço Funcionários': 'Almoço Funcionários',
    'Sistema de Ponto': 'Sistema de Ponto',
    'Gratificação ADM': 'Gratificação ADM',
    'Fardamento': 'Fardamento',
    'Rescisões': 'Rescisões',
    'Feriados': 'Feriados',
    'Uber': 'Uber',
    'fgts rescisório': 'fgts rescisório',
    'Banco de Horas': 'Banco de Horas',
    'Gratificação Gestores': 'Gratificação Gestores',

    'DESPESAS NÃO OPERACIONAIS': 'DESPESAS NÃO OPERACIONAIS',
    'Estacionamentos': 'Estacionamentos',
    'Construções e Reformas': 'Construções e Reformas',
    'Recolhimento de Lixo': 'Recolhimento de Lixo',
    'Dedetização': 'Dedetização',
    'Associações': 'Associações',
    'Garrafões de Água': 'Garrafões de Água',
    'Utensílios': 'Utensílios',
    'Processo Trabalhistas': 'Processo Trabalhistas',
    'Perdas Beneficiamento': 'Perdas Beneficiamento',
    'Despesa Pescaria': 'Despesa Pescaria',
    'Copia Chave': 'Copia Chave',
    'Limpeza Fossa': 'Limpeza Fossa',
    'Material Kids': 'Material Kids',
    'Outras Despesas Não Operacionais': 'Outras Despesas Não Operacionais',
    'Locação de Itens para o Salão': 'Locação de Itens para o Salão',
    'Material Para Reformas e Reparos': 'Material Para Reformas e Reparos',
    'Material Descartavel': 'Material Descartavel',
    'Cameras': 'Cameras',
    'Sistema - IzzyWay - Anotai': 'Sistema - IzzyWay - Anotai',
    'Equipamentos de Informática': 'Equipamentos de Informática',

    'DESPESAS FINANCEIRAS': 'DESPESAS FINANCEIRAS',
    'Tarifas Bancárias': 'Tarifas Bancárias',
    'IOF': 'IOF',
    'Outras Despesas Financeiras': 'Outras Despesas Financeiras',
    'Juros Bancarios': 'Juros Bancarios',

    'DESPESAS COM IMPOSTOS': 'DESPESAS COM IMPOSTOS',
    'ISS': 'ISS',
    'INSS Imposto': 'INSS', // Renomeado para evitar conflito com INSS de Pessoal
    'CSLL': 'CSLL',
    'COFINS': 'COFINS',
    'IRRF': 'IRRF',
    'ICMS': 'ICMS',
    'IPI': 'IPI',
    'Outras Despesas com Impostos': 'Outras Despesas com Impostos',
    'Simples Nacional': 'Simples Nacional',
    'Ecad': 'Ecad',
    'Simples Nacional Parcela': 'Simples Nacional Parcela',
    'TAXA PARA SERVIÇOS CONTABEIS': 'TAXA PARA SERVIÇOS CONTABEIS',
    'Amortizaçãode Empréstimo': 'Amortizaçãode Empréstimo',
    'PIS': 'PIS',

    'CUSTOS COM VENDAS': 'CUSTOS COM VENDAS',
    'Custos com Insumos': 'Custos com Insumos',
    'Gratificações Garçons': 'Gratificações Garçons',
    'Outros Custos com Vendas': 'Outros Custos com Vendas',
    'Gás': 'Gás',
    'Gelo': 'Gelo',
    'Carvão': 'Carvão',

    'DESPESAS COM EVENTOS': 'DESPESAS COM EVENTOS',
    'Aluguel de itens para eventos': 'Aluguel de itens para eventos',
    'Impressão de material gráfico EVENTO': 'Impressão de material gráfico EVENTO',
    'Insumos evento': 'Insumos evento',

    'DESPESAS COM MARKETING': 'DESPESAS COM MARKETING',
    'Propaganda e Publicidade': 'Propaganda e Publicidade',
    'Impressão de material gráfico MARKETING': 'Impressão de material gráfico MARKETING',
    'Musicos': 'Musicos',
    'Tráfego Pago': 'Tráfego Pago',

    'SERVIÇOS DE TERCEIROS': 'SERVIÇOS DE TERCEIROS',
    'Assessoria Contábil': 'Assessoria Contábil',
    'Consultoria': 'Consultoria',
    'Consultoria Nutricional': 'Consultoria Nutricional',
    'Consultoria Sistemica': 'Consultoria Sistemica',
    'Consultoria Marketing': 'Consultoria Marketing',
    'Consultoria E-SOCIAL': 'Consultoria E-SOCIAL',

    'MANUTENÇÕES': 'MANUTENÇÕES',
    'Combustíveis e Lubrificantes': 'Combustíveis e Lubrificantes',
    'Manutenção Elétrica': 'Manutenção Elétrica',
    'Manutenção Forno/Fogao': 'Manutenção Forno/Fogao',
    'Peças para Reparo e Conserto de Equipamentos': 'Peças para Reparo e Conserto de Equipamentos',
    'Manutenção Microondas/Balanças': 'Manutenção Microondas/Balanças',
    'Manutenção e zeladoria de veículos': 'Manutenção e zeladoria de veículos',
    'Manutenção do Jardim': 'Manutenção do Jardim',

    'Cesta Basica': 'Cesta Basica',
    'Despesas com datas comemorativas': 'Despesas com datas comemorativas',

    // Totais e Saldo Final
    'Receitas (+)': 'Receitas (+)',
    'Despesas (-)': 'Despesas (-)',
    'Saldo (=)': 'Saldo (=)'
};


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Usar multiparty para parsear o FormData (upload de arquivo)
    const form = new multiparty.Form();

    return new Promise((resolve) => { // Removido reject para simplificar o tratamento de erro dentro do resolve
        form.parse(event.body, async (error, fields, files) => {
            if (error) {
                console.error('Error parsing form:', error);
                return resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Erro ao analisar os dados do formulário de upload.', error: error.message }),
                });
            }

            const drePdfFile = files.drePdf && files.drePdf[0];
            const estoqueInicialStr = fields.estoqueInicial && fields.estoqueInicial[0];
            const estoqueFinalStr = fields.estoqueFinal && fields.estoqueFinal[0];

            if (!drePdfFile) {
                return resolve({
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Nenhum arquivo PDF foi enviado.' }),
                });
            }
            if (!estoqueInicialStr || !estoqueFinalStr) {
                return resolve({
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Estoque inicial e final são obrigatórios.' }),
                });
            }


            try {
                const estoqueInicial = parseFloat(estoqueInicialStr);
                const estoqueFinal = parseFloat(estoqueFinalStr);


                const dataBuffer = require('fs').readFileSync(drePdfFile.path);
                const pdfData = await pdf(dataBuffer);
                const text = pdfData.text;
                const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                // Variáveis para armazenar os dados extraídos
                let totalSales = 0;
                let costsInsumos = 0; // Compras de insumos da DRE
                let gas = 0;
                let ice = 0;
                let realProfit = 0;
                let totalExpensesFromDRE = 0; // O total de despesas que aparece na DRE

                let expenses = {
                    administrative: 0,
                    personnel: 0,
                    nonOperational: 0,
                    financial: 0,
                    taxes: 0,
                    marketing: 0,
                    thirdPartyServices: 0,
                    maintenance: 0,
                    basicBasket: 0,
                    gasAndIce: 0 // Suma de Gás e Gelo para exibição no frontend
                };

                // Lógica de parsing linha a linha (adaptada do seu PDF)
                // Usamos `includes` para ser um pouco mais flexível
                for (const line of lines) {
                    // Receitas
                    if (line.includes(DRE_LINES['Receitas com Vendas'])) {
                        totalSales = extractValue(line);
                    } else if (line.includes(DRE_LINES['Eventos'])) {
                        // Poderíamos somar a totalSales se Eventos fosse venda de produtos,
                        // mas para o markup de produtos de restaurante, geralmente é separado
                        // totalSales += extractValue(line);
                    }
                    // Custos com Vendas
                    else if (line.includes(DRE_LINES['Custos com Insumos'])) {
                        costsInsumos = extractValue(line);
                    } else if (line.includes(DRE_LINES['Gás'])) {
                        gas = extractValue(line);
                    } else if (line.includes(DRE_LINES['Gelo'])) {
                        ice = extractValue(line);
                    }
                    // Despesas Administrativas - Soma de itens específicos
                    else if (line.includes(DRE_LINES['Energia'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Internet'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Ração (Iraque, Peixes, Patos e Coelhos)'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Material de Escritório'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Material de Limpeza'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Outras Despesas Administrativas'])) {
                        // A linha "Outras Despesas Administrativas" na DRE do Matheus era 562.00,
                        // mas a linha "Consumo ADM (banda, mkt, perdas, adm, cortesia, etc)" e "Atos"
                        // estão logo abaixo dela na DRE e são outras despesas adm.
                        // Optou-se por somá-las em 'administrative' no front-end anterior, então mantemos.
                        // A extração linear do PDF pode não capturar as totalizações de grupos,
                        // então somamos os itens individuais para construir o total.
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Aluguel Predial'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Aluguel de Máquinario e Equipamentos'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Aluguel de Impressoras'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Aluguel Carros'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Consumo ADM (banda, mkt, perdas, adm, cortesia, etc)'])) {
                        expenses.administrative += extractValue(line);
                    } else if (line.includes(DRE_LINES['Atos']) && line.includes('R$')) { // "Atos" pode aparecer em outros contextos, mas só com R$ é o valor
                        expenses.administrative += extractValue(line);
                    }
                    // Despesas com Pessoal - Soma de itens específicos
                    else if (line.includes(DRE_LINES['Salários e Ordenados'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Férias'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['FGTS'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Pró-Labore'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Vale Transporte'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Outras Despesas com Pessoal'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Diaria'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Sindicato'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Almoço Funcionários'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Sistema de Ponto'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Rescisões'])) {
                        expenses.personnel += extractValue(line);
                    } else if (line.includes(DRE_LINES['Uber'])) {
                        expenses.personnel += extractValue(line);
                    }
                    // Despesas Não Operacionais - Soma de itens específicos
                    else if (line.includes(DRE_LINES['Construções e Reformas'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Recolhimento de Lixo'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Dedetização'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Associações'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Garrafões de Água'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Utensílios'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Copia Chave'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Material Kids'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Material Para Reformas e Reparos'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Material Descartavel'])) {
                        expenses.nonOperational += extractValue(line);
                    } else if (line.includes(DRE_LINES['Cameras'])) {
                        expenses.nonOperational += extractValue(line);
                    }
                    // Despesas Financeiras - Apenas o total (se != 0) ou soma de sub-itens se houver
                    else if (line.includes(DRE_LINES['DESPESAS FINANCEIRAS']) && extractValue(line) > 0) { // Na sua DRE era 0
                        expenses.financial += extractValue(line);
                    }
                    // Despesas com Impostos - Soma de itens específicos
                    else if (line.includes(DRE_LINES['ISS'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['ICMS'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['Outras Despesas com Impostos'])) { // Atenção ao nome exato
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['Simples Nacional'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['Ecad'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['Simples Nacional Parcela'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['TAXA PARA SERVIÇOS CONTABEIS'])) {
                        expenses.taxes += extractValue(line);
                    }
                    // Despesas com Marketing - Soma de itens específicos
                    else if (line.includes(DRE_LINES['Musicos'])) {
                        expenses.marketing += extractValue(line);
                    } else if (line.includes(DRE_LINES['Tráfego Pago'])) {
                        expenses.marketing += extractValue(line);
                    }
                    // Serviços de Terceiros - Soma de itens específicos
                    else if (line.includes(DRE_LINES['Consultoria']) && !line.includes('Nutricional') && !line.includes('Sistemica') && !line.includes('Marketing') && !line.includes('E-SOCIAL')) {
                        expenses.thirdPartyServices += extractValue(line); // Pegar a linha "Consultoria" geral
                    } else if (line.includes(DRE_LINES['Consultoria Marketing'])) {
                        expenses.thirdPartyServices += extractValue(line);
                    } else if (line.includes(DRE_LINES['Consultoria E-SOCIAL'])) {
                        expenses.thirdPartyServices += extractValue(line);
                    } else if (line.includes(DRE_LINES['Assessoria Contábil'])) { // Adicionado
                        expenses.thirdPartyServices += extractValue(line);
                    }
                    // Manutenções - Soma de itens específicos
                    else if (line.includes(DRE_LINES['Combustíveis e Lubrificantes'])) {
                        expenses.maintenance += extractValue(line);
                    } else if (line.includes(DRE_LINES['Manutenção Forno/Fogao'])) {
                        expenses.maintenance += extractValue(line);
                    } else if (line.includes(DRE_LINES['Peças para Reparo e Conserto de Equipamentos'])) {
                        expenses.maintenance += extractValue(line);
                    } else if (line.includes(DRE_LINES['Manutenção e zeladoria de veículos'])) {
                        expenses.maintenance += extractValue(line);
                    }
                    // Cesta Básica
                    else if (line.includes(DRE_LINES['Cesta Basica'])) {
                        expenses.basicBasket += extractValue(line);
                    }
                    // Totais da DRE - Para validação e lucro real
                    else if (line.includes(DRE_LINES['Despesas (-)'])) {
                        totalExpensesFromDRE = extractValue(line);
                    } else if (line.includes(DRE_LINES['Saldo (=)'])) {
                        realProfit = extractValue(line);
                    }
                }

                // Cálculo do CMV Real (com base nos seus dados fornecidos)
                // A 'costsInsumos' aqui representa as COMPRAS de insumos do mês
                const cmvRealCalculated = estoqueInicial + costsInsumos - estoqueFinal;

                // Sumarizar Gás e Gelo para o total de gastos diretos no CMV (para o denominador do markup)
                expenses.gasAndIce = gas + ice;


                // O total de despesas a serem cobertas (excluindo CMV e Gás/Gelo)
                // A maneira mais robusta é pegar o "Despesas (-)" da DRE e subtrair o que já classificamos como CMV (insumos, gás, gelo)
                // Isso evita ter que somar todas as despesas manualmente na função e errar se alguma for omitida.
                const totalExpensesExcludingCMV = totalExpensesFromDRE - (costsInsumos + gas + ice);


                resolve({
                    statusCode: 200,
                    body: JSON.stringify({
                        totalSales: totalSales,
                        cmvReal: cmvRealCalculated + expenses.gasAndIce, // Inclui Gás e Gelo no CMV para o cálculo do Markup
                        totalExpensesExcludingCMV: totalExpensesExcludingCMV,
                        realProfit: realProfit,
                        expenses: { // Enviamos as despesas detalhadas para o frontend poder filtrar
                            administrative: expenses.administrative,
                            personnel: expenses.personnel,
                            nonOperational: expenses.nonOperational,
                            financial: expenses.financial,
                            taxes: expenses.taxes,
                            marketing: expenses.marketing,
                            thirdPartyServices: expenses.thirdPartyServices,
                            maintenance: expenses.maintenance,
                            basicBasket: expenses.basicBasket,
                            // gasAndIce não é enviado aqui pois já foi somado ao cmvReal acima
                        }
                    }),
                });

            } catch (parseError) {
                console.error('Error parsing PDF:', parseError);
                resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Erro ao analisar o PDF ou extrair dados. Verifique o formato do arquivo e o console.', error: parseError.message }),
                });
            }
        });
    });
};