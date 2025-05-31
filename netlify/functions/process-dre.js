// netlify/functions/process-dre.js

const pdf = require('pdf-parse'); // Importa a biblioteca pdf-parse
const multiparty = require('multiparty'); // Para lidar com o upload de arquivos FormData

// Função auxiliar para extrair um valor numérico de uma linha
// Ignora o "R$", remove espaços e substitui vírgulas por pontos.
const extractValue = (line) => {
    const match = line.match(/R\$\s*([\d\.,]+)/);
    if (match && match[1]) {
        return parseFloat(match[1].replace(/\./g, '').replace(',', '.'));
    }
    return 0;
};

// Mapeamento exato das linhas da sua DRE para facilitar a extração
const DRE_LINES = {
    'Receitas com Vendas': 'Receitas com Vendas',
    'Eventos': 'Eventos',
    'Investimento Atos.': 'Investimento Atos.',
    'Coleta de Oleo': 'Coleta de Oleo',
    'Compra Ativo Imobilizado': 'Compra Ativo Imobilizado',
    'DESPESAS': 'DESPESAS',
    'DESPESAS ADMINISTRATIVAS': 'DESPESAS ADMINISTRATIVAS',
    'Energia': 'Energia',
    'Internet': 'Internet',
    'Material de Escritório': 'Material de Escritório',
    'Material de Limpeza': 'Material de Limpeza',
    'Outras Despesas Administrativas': 'Outras Despesas Administrativas',
    'Aluguel Predial': 'Aluguel Predial',
    'Aluguel de Máquinario e Equipamentos': 'Aluguel de Máquinario e Equipamentos',
    'Aluguel de Impressoras': 'Aluguel de Impressoras',
    'Aluguel Carros': 'Aluguel Carros',
    'Consumo ADM (banda, mkt, perdas, adm, cortesia, etc)': 'Consumo ADM (banda, mkt, perdas, adm, cortesia, etc)',
    'Atos': 'Atos',
    'Ração (Iraque, Peixes, Patos e Coelhos)': 'Ração (Iraque, Peixes, Patos e Coelhos)',
    'DESPESAS COM PESSOAL': 'DESPESAS COM PESSOAL',
    'Salários e Ordenados': 'Salários e Ordenados',
    'Férias': 'Férias',
    'FGTS': 'FGTS',
    'Pró-Labore': 'Pró-Labore',
    'Vale Transporte': 'Vale Transporte',
    'Outras Despesas com Pessoal': 'Outras Despesas com Pessoal',
    'Diaria': 'Diaria',
    'Sindicato': 'Sindicato',
    'Almoço Funcionários': 'Almoço Funcionários',
    'Sistema de Ponto': 'Sistema de Ponto',
    'Rescisões': 'Rescisões',
    'Uber': 'Uber',
    'DESPESAS NÃO OPERACIONAIS': 'DESPESAS NÃO OPERACIONAIS',
    'Construções e Reformas': 'Construções e Reformas',
    'Recolhimento de Lixo': 'Recolhimento de Lixo',
    'Dedetização': 'Dedetização',
    'Associações': 'Associações',
    'Garrafões de Água': 'Garrafões de Água',
    'Utensílios': 'Utensílios',
    'Copia Chave': 'Copia Chave',
    'Material Kids': 'Material Kids',
    'Material Para Reformas e Reparos': 'Material Para Reformas e Reparos',
    'Material Descartavel': 'Material Descartavel',
    'Cameras': 'Cameras',
    'DESPESAS FINANCEIRAS': 'DESPESAS FINANCEIRAS',
    'DESPESAS COM IMPOSTOS': 'DESPESAS COM IMPOSTOS',
    'ISS': 'ISS',
    'ICMS': 'ICMS',
    'Outras Despesas com Impostos (Imposto geral)': 'Outras Despesas com Impostos',
    'Simples Nacional': 'Simples Nacional',
    'Ecad': 'Ecad',
    'Simples Nacional Parcela': 'Simples Nacional Parcela',
    'TAXA PARA SERVIÇOS CONTABEIS': 'TAXA PARA SERVIÇOS CONTABEIS',
    'CUSTOS COM VENDAS': 'CUSTOS COM VENDAS',
    'Custos com Insumos': 'Custos com Insumos',
    'Gratificações Garçons': 'Gratificações Garçons',
    'Gás': 'Gás',
    'Gelo': 'Gelo',
    'DESPESAS COM EVENTOS': 'DESPESAS COM EVENTOS',
    'Insumos evento': 'Insumos evento',
    'Impressão de material gráfico EVENTO': 'Impressão de material gráfico EVENTO',
    'DESPESAS COM MARKETING': 'DESPESAS COM MARKETING',
    'Musicos': 'Musicos',
    'Tráfego Pago': 'Tráfego Pago',
    'SERVIÇOS DE TERCEIROS': 'SERVIÇOS DE TERCEIROS',
    'Consultoria': 'Consultoria',
    'Consultoria Marketing': 'Consultoria Marketing',
    'Consultoria E-SOCIAL': 'Consultoria E-SOCIAL',
    'MANUTENÇÕES': 'MANUTENÇÕES',
    'Combustíveis e Lubrificantes': 'Combustíveis e Lubrificantes',
    'Manutenção Forno/Fogao': 'Manutenção Forno/Fogao',
    'Peças para Reparo e Conserto de Equipamentos': 'Peças para Reparo e Conserto de Equipamentos',
    'Manutenção e zeladoria de veículos': 'Manutenção e zeladoria de veículos',
    'Cesta Basica': 'Cesta Basica',
    'Saldo (=)': 'Saldo (=)',
    'Receitas (+)': 'Receitas (+)',
    'Despesas (-)': 'Despesas (-)'
};


exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Usar multiparty para parsear o FormData (upload de arquivo)
    const form = new multiparty.Form();

    return new Promise((resolve, reject) => {
        form.parse(event.body, async (error, fields, files) => {
            if (error) {
                console.error('Error parsing form:', error);
                return resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Error parsing form data.', error: error.message }),
                });
            }

            const drePdfFile = files.drePdf && files.drePdf[0];

            if (!drePdfFile) {
                return resolve({
                    statusCode: 400,
                    body: JSON.stringify({ message: 'Nenhum arquivo PDF foi enviado.' }),
                });
            }

            try {
                // `path` é o caminho temporário do arquivo no ambiente Netlify Function
                const dataBuffer = require('fs').readFileSync(drePdfFile.path);
                const pdfData = await pdf(dataBuffer);
                const text = pdfData.text;
                const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                // Variáveis para armazenar os dados extraídos
                let totalSales = 0;
                let costsInsumos = 0;
                let gas = 0;
                let ice = 0;
                let realProfit = 0;
                let totalExpensesFromDRE = 0;

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
                    gasAndIce: 0
                };

                // Lógica de parsing linha a linha (adaptada do seu PDF)
                // Isso requer que o formato do PDF seja consistente.
                for (const line of lines) {
                    if (line.includes(DRE_LINES['Receitas com Vendas'])) {
                        totalSales = extractValue(line);
                    } else if (line.includes(DRE_LINES['Custos com Insumos'])) {
                        costsInsumos = extractValue(line);
                    } else if (line.includes(DRE_LINES['Gás'])) {
                        gas = extractValue(line);
                    } else if (line.includes(DRE_LINES['Gelo'])) {
                        ice = extractValue(line);
                    } else if (line.includes(DRE_LINES['Energia'])) {
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
                    } else if (line.includes(DRE_LINES['Atos'])) {
                        expenses.administrative += extractValue(line);
                    }
                    // Despesas com Pessoal
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
                    // Despesas Não Operacionais
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
                    // Despesas Financeiras
                    else if (line.includes(DRE_LINES['DESPESAS FINANCEIRAS']) && extractValue(line) > 0) {
                        expenses.financial += extractValue(line);
                    }
                    // Despesas com Impostos
                    else if (line.includes(DRE_LINES['ISS'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['ICMS'])) {
                        expenses.taxes += extractValue(line);
                    } else if (line.includes(DRE_LINES['Outras Despesas com Impostos (Imposto geral)'])) {
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
                    // Despesas com Marketing
                    else if (line.includes(DRE_LINES['Musicos'])) {
                        expenses.marketing += extractValue(line);
                    } else if (line.includes(DRE_LINES['Tráfego Pago'])) {
                        expenses.marketing += extractValue(line);
                    }
                    // Serviços de Terceiros
                    else if (line.includes(DRE_LINES['Consultoria'])) {
                        expenses.thirdPartyServices += extractValue(line);
                    } else if (line.includes(DRE_LINES['Consultoria Marketing'])) {
                        expenses.thirdPartyServices += extractValue(line);
                    } else if (line.includes(DRE_LINES['Consultoria E-SOCIAL'])) {
                        expenses.thirdPartyServices += extractValue(line);
                    }
                    // Manutenções
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
                    // Lucro Real (Saldo)
                    else if (line.includes(DRE_LINES['Saldo (=)'])) {
                        realProfit = extractValue(line);
                    }
                    // Total de Despesas da DRE (para validação)
                    else if (line.includes(DRE_LINES['Despesas (-)'])) {
                        totalExpensesFromDRE = extractValue(line);
                    }
                }

                // Cálculo do CMV Real (com base nos seus dados fornecidos)
                // Importante: No ambiente real, você buscaria esses valores do Supabase ou de um input adicional.
                // Para este exemplo, vamos fixá-los como um placeholder para demonstração.
                // Você precisará de um input para estes valores na interface OU buscá-los de um DB.
                const estoqueInicial = 38000; // Valor fixo para o exemplo [cite: 9]
                const estoqueFinal = 37000;   // Valor fixo para o exemplo [cite: 9]

                // Ajuste: O valor 'Custos com Insumos' da DRE é tratado como 'Compras' para o CMV real
                const cmvReal = estoqueInicial + costsInsumos - estoqueFinal;

                // Sumarizar todas as outras despesas
                expenses.gasAndIce = gas + ice; // [cite: 6]

                const totalExpensesExcludingCMV = totalExpensesFromDRE - (costsInsumos + gas + ice);


                resolve({
                    statusCode: 200,
                    body: JSON.stringify({
                        totalSales: totalSales,
                        cmvReal: cmvReal + expenses.gasAndIce,
                        totalExpensesExcludingCMV: totalExpensesExcludingCMV,
                        realProfit: realProfit,
                        expenses: {
                            administrative: expenses.administrative,
                            personnel: expenses.personnel,
                            nonOperational: expenses.nonOperational,
                            financial: expenses.financial,
                            taxes: expenses.taxes,
                            marketing: expenses.marketing,
                            thirdPartyServices: expenses.thirdPartyServices,
                            maintenance: expenses.maintenance,
                            basicBasket: expenses.basicBasket,
                            gasAndIce: expenses.gasAndIce
                        }
                    }),
                });

            } catch (parseError) {
                console.error('Error parsing PDF:', parseError);
                resolve({
                    statusCode: 500,
                    body: JSON.stringify({ message: 'Erro ao analisar o PDF. Verifique o formato do arquivo.', error: parseError.message }),
                });
            }
        });
    });
};