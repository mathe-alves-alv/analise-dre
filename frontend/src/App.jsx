import React, { useState, useEffect } from 'react';
import './App.css'; // Certifique-se de que este arquivo existe e está correto

function App() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados para seleção de custos para o markup (inicialmente todos inclusos)
    const [includeExpenses, setIncludeExpenses] = useState({
        administrative: true,
        personnel: true,
        nonOperational: true,
        financial: true,
        taxes: true,
        marketing: true,
        thirdPartyServices: true,
        maintenance: true,
        basicBasket: true,
        // Gás e Gelo não precisam de checkbox aqui pois já estão no CMV final
    });

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setAnalysisResult(null); // Limpa resultados anteriores
        setError(null);         // Limpa erros anteriores
    };

    const handleSubmit = async () => {
        if (!selectedFile) {
            setError('Por favor, selecione um arquivo PDF da DRE.');
            return;
        }

        setLoading(true);
        setError(null);
        setAnalysisResult(null);

        const formData = new FormData();
        formData.append('drePdf', selectedFile);

        // Você precisará fornecer o estoque inicial e final de alguma forma,
        // pois eles não estão na DRE em PDF.
        // Por enquanto, vamos enviá-los fixos para a função.
        // Em uma versão futura, podemos adicionar inputs para eles.
        formData.append('estoqueInicial', '38000'); // Seu valor de estoque inicial
        formData.append('estoqueFinal', '37000');   // Seu valor de estoque final

        try {
            // Ajuste esta URL para o endpoint de sua Netlify Function
            const response = await fetch('/.netlify/functions/process-dre', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao processar a DRE. Verifique o console para mais detalhes.');
            }

            const data = await response.json();
            setAnalysisResult(data);

        } catch (err) {
            console.error('Erro na requisição da função:', err);
            setError('Erro ao processar a DRE: ' + err.message + '. Verifique o console do navegador para detalhes técnicos.');
        } finally {
            setLoading(false);
        }
    };

    // Função para calcular o markup com base nos custos selecionados
    const calculateMarkup = () => {
        if (!analysisResult || !analysisResult.cmvReal || !analysisResult.expenses) {
            return null;
        }

        const { cmvReal, totalSales } = analysisResult;

        let selectedExpenses = 0;

        // Soma apenas as despesas selecionadas
        if (includeExpenses.administrative) selectedExpenses += analysisResult.expenses.administrative;
        if (includeExpenses.personnel) selectedExpenses += analysisResult.expenses.personnel;
        if (includeExpenses.nonOperational) selectedExpenses += analysisResult.expenses.nonOperational;
        if (includeExpenses.financial) selectedExpenses += analysisResult.expenses.financial;
        if (includeExpenses.taxes) selectedExpenses += analysisResult.expenses.taxes;
        if (includeExpenses.marketing) selectedExpenses += analysisResult.expenses.marketing;
        if (includeExpenses.thirdPartyServices) selectedExpenses += analysisResult.expenses.thirdPartyServices;
        if (includeExpenses.maintenance) selectedExpenses += analysisResult.expenses.maintenance;
        if (includeExpenses.basicBasket) selectedExpenses += analysisResult.expenses.basicBasket;

        // Usar uma meta de lucro de 10% sobre o total de vendas
        const desiredProfit = totalSales * 0.10; // 10% de lucro

        const totalToCover = cmvReal + selectedExpenses + desiredProfit;

        if (cmvReal === 0) return 0; // Evitar divisão por zero

        return (totalToCover / cmvReal).toFixed(2);
    };

    // Recalcula o markup sempre que analysisResult ou includeExpenses muda
    const markupCalculated = calculateMarkup();

    return (
        <div className="App">
            <header className="App-header">
                <h1>Análise de DRE - Holy Salt Reserva</h1>
                <p>Período: 01/04/2025 a 30/04/2025</p>
            </header>

            <section className="upload-section">
                <h2>Importar DRE em PDF</h2>
                <input type="file" accept=".pdf" onChange={handleFileChange} />
                <button onClick={handleSubmit} disabled={loading || !selectedFile}>
                    {loading ? 'Processando DRE...' : 'Analisar DRE'}
                </button>
                {error && <p className="error-message">Erro: {error}</p>}
                {!selectedFile && <p>Por favor, selecione um arquivo PDF para analisar.</p>}
            </section>

            {analysisResult && (
                <section className="results-section">
                    <h2>Resultados da Análise</h2>

                    <h3>Dados Essenciais (Calculados):</h3>
                    <p><strong>Receita de Vendas:</strong> R$ {analysisResult.totalSales?.toFixed(2)}</p>
                    <p><strong>CMV Real (Insumos, Gás e Gelo Consumidos):</strong> R$ {analysisResult.cmvReal?.toFixed(2)}</p>
                    <p><strong>Total de Despesas Operacionais (Excluindo CMV Insumos, Gás e Gelo):</strong> R$ {analysisResult.totalExpensesExcludingCMV?.toFixed(2)}</p>
                    <p><strong>Lucro Líquido Real (da DRE):</strong> R$ {analysisResult.realProfit?.toFixed(2)}</p>

                    <h3>Configuração de Custos para Markup:</h3>
                    <p>Selecione quais categorias de despesas você quer incluir no cálculo do markup para cobrir seus custos fixos e variáveis, além do lucro desejado de 10% sobre a receita.</p>
                    <div className="checkbox-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.administrative}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, administrative: !prev.administrative }))}
                            />
                            Despesas Administrativas (R$ {analysisResult.expenses.administrative?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.personnel}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, personnel: !prev.personnel }))}
                            />
                            Despesas com Pessoal (R$ {analysisResult.expenses.personnel?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.nonOperational}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, nonOperational: !prev.nonOperational }))}
                            />
                            Despesas Não Operacionais (R$ {analysisResult.expenses.nonOperational?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.financial}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, financial: !prev.financial }))}
                            />
                            Despesas Financeiras (R$ {analysisResult.expenses.financial?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.taxes}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, taxes: !prev.taxes }))}
                            />
                            Despesas com Impostos (R$ {analysisResult.expenses.taxes?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.marketing}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, marketing: !prev.marketing }))}
                            />
                            Despesas com Marketing (R$ {analysisResult.expenses.marketing?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.thirdPartyServices}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, thirdPartyServices: !prev.thirdPartyServices }))}
                            />
                            Serviços de Terceiros (R$ {analysisResult.expenses.thirdPartyServices?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.maintenance}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, maintenance: !prev.maintenance }))}
                            />
                            Manutenções (R$ {analysisResult.expenses.maintenance?.toFixed(2)})
                        </label>
                        <label>
                            <input
                                type="checkbox"
                                checked={includeExpenses.basicBasket}
                                onChange={() => setIncludeExpenses(prev => ({ ...prev, basicBasket: !prev.basicBasket }))}
                            />
                            Cesta Básica (R$ {analysisResult.expenses.basicBasket?.toFixed(2)})
                        </label>
                    </div>

                    <h3>Cálculo do Markup:</h3>
                    {markupCalculated ? (
                        <>
                            <p>
                                <strong>Fator Markup Ideal (para 10% de Lucro Líquido e custos selecionados):</strong>{' '}
                                <span className="markup-value">{markupCalculated}</span>
                            </p>
                            <p className="example-text">
                                Exemplo: Se um prato tem <strong>CMV de Insumos (apenas ingredientes)</strong> de R$ 20,00, o preço de venda sugerido para cobrir os custos selecionados e dar 10% de lucro líquido seria R${' '}
                                {(20 * parseFloat(markupCalculated)).toFixed(2)}.
                            </p>
                        </>
                    ) : (
                        <p>Selecione um arquivo PDF e clique em "Analisar DRE" para calcular o markup.</p>
                    )}

                    <details>
                        <summary>Ver Detalhes Completos dos Dados (JSON)</summary>
                        <pre className="json-output">{JSON.stringify(analysisResult, null, 2)}</pre>
                    </details>
                </section>
            )}
        </div>
    );
}

export default App;