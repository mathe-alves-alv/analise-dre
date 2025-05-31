import React, { useState, useEffect } from 'react';
import './App.css'; // Certifique-se de que este arquivo existe e está correto

function App() {
  // Estado para os valores de entrada manual (não haverá upload de PDF aqui)
  const [totalSalesInput, setTotalSalesInput] = useState('217387.81');
  const [costsInsumosInput, setCostsInsumosInput] = useState('98580.90'); // Compras da DRE
  const [gasInput, setGasInput] = useState('3210.38');
  const [iceInput, setIceInput] = useState('1218.00');
  const [administrativeInput, setAdministrativeInput] = useState('28731.60');
  const [personnelInput, setPersonnelInput] = useState('71063.38');
  const [nonOperationalInput, setNonOperationalInput] = useState('11034.24');
  const [financialInput, setFinancialInput] = useState('0.00');
  const [taxesInput, setTaxesInput] = useState('15030.07');
  const [marketingInput, setMarketingInput] = useState('13016.00');
  const [thirdPartyServicesInput, setThirdPartyServicesInput] = useState('6730.00');
  const [maintenanceInput, setMaintenanceInput] = useState('1972.01');
  const [basicBasketInput, setBasicBasketInput] = useState('87.55');
  const [realProfitInput, setRealProfitInput] = useState('513.18');
  const [totalExpensesDREInput, setTotalExpensesDREInput] = useState('257958.78'); // Valor total de despesas da DRE

  // Novos campos para Estoque Inicial e Final
  const [estoqueInicialInput, setEstoqueInicialInput] = useState('38000');
  const [estoqueFinalInput, setEstoqueFinalInput] = useState('37000');


  const [analysisResult, setAnalysisResult] = useState(null);
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
    gasAndIce: true // Incluído aqui para controle na UI
  });

  // Função para simular o processamento da DRE com base nos inputs
  const simulateAnalysis = () => {
    setError(null);
    try {
      const totalSales = parseFloat(totalSalesInput);
      const costsInsumos = parseFloat(costsInsumosInput);
      const gas = parseFloat(gasInput);
      const ice = parseFloat(iceInput);
      const administrative = parseFloat(administrativeInput);
      const personnel = parseFloat(personnelInput);
      const nonOperational = parseFloat(nonOperationalInput);
      const financial = parseFloat(financialInput);
      const taxes = parseFloat(taxesInput);
      const marketing = parseFloat(marketingInput);
      const thirdPartyServices = parseFloat(thirdPartyServicesInput);
      const maintenance = parseFloat(maintenanceInput);
      const basicBasket = parseFloat(basicBasketInput);
      const realProfit = parseFloat(realProfitInput);
      const totalExpensesFromDRE = parseFloat(totalExpensesDREInput);

      // Calculando CMV Real com estoque
      const estoqueInicial = parseFloat(estoqueInicialInput);
      const estoqueFinal = parseFloat(estoqueFinalInput);
      const cmvRealCalculated = estoqueInicial + costsInsumos - estoqueFinal;

      const expensesData = {
        administrative,
        personnel,
        nonOperational,
        financial,
        taxes,
        marketing,
        thirdPartyServices,
        maintenance,
        basicBasket,
        gasAndIce: gas + ice
      };

      // Recalculando totalExpensesExcludingCMV
      // Consideramos todas as despesas da DRE menos os custos diretos (insumos, gás, gelo)
      const totalExpensesExcludingCMVCalculated = totalExpensesFromDRE - (costsInsumos + gas + ice);


      setAnalysisResult({
        totalSales: totalSales,
        cmvReal: cmvRealCalculated + (gas + ice), // Inclui Gás e Gelo no CMV para o cálculo do Markup
        totalExpensesExcludingCMV: totalExpensesExcludingCMVCalculated,
        realProfit: realProfit,
        expenses: expensesData,
        originalDRETotalExpenses: totalExpensesFromDRE // Para referência
      });

    } catch (e) {
      setError('Por favor, insira valores numéricos válidos em todos os campos.');
      setAnalysisResult(null);
    }
  };

  // Efeito para rodar a simulação assim que o componente carrega (com os valores padrão)
  useEffect(() => {
    simulateAnalysis();
  }, []); // Rodar apenas uma vez ao montar

  // Função para calcular o markup com base nos custos selecionados
  const calculateMarkup = () => {
    if (!analysisResult || !analysisResult.cmvReal || !analysisResult.expenses) {
      return null;
    }

    const { cmvReal, totalSales } = analysisResult;

    let selectedExpenses = 0;

    if (includeExpenses.administrative) selectedExpenses += analysisResult.expenses.administrative;
    if (includeExpenses.personnel) selectedExpenses += analysisResult.expenses.personnel;
    if (includeExpenses.nonOperational) selectedExpenses += analysisResult.expenses.nonOperational;
    if (includeExpenses.financial) selectedExpenses += analysisResult.expenses.financial;
    if (includeExpenses.taxes) selectedExpenses += analysisResult.expenses.taxes;
    if (includeExpenses.marketing) selectedExpenses += analysisResult.expenses.marketing;
    if (includeExpenses.thirdPartyServices) selectedExpenses += analysisResult.expenses.thirdPartyServices;
    if (includeExpenses.maintenance) selectedExpenses += analysisResult.expenses.maintenance;
    if (includeExpenses.basicBasket) selectedExpenses += analysisResult.expenses.basicBasket;
    // Gás e gelo já estão inclusos no cmvReal que é o denominador, então não precisam ser somados novamente aqui
    // if (includeExpenses.gasAndIce) selectedExpenses += analysisResult.expenses.gasAndIce; // Removido para evitar duplicidade


    // Usar uma meta de lucro de 10% sobre o total de vendas
    const desiredProfit = totalSales * 0.10; // 10% de lucro

    const totalToCover = cmvReal + selectedExpenses + desiredProfit;

    if (cmvReal === 0) return 0; // Evitar divisão por zero

    return (totalToCover / cmvReal).toFixed(2);
  };

  const markupCalculated = calculateMarkup();

  return (
    <div className="App">
      <header className="App-header">
        <h1>Análise de DRE - Holy Salt Reserva</h1>
        <p>Período: 01/04/2025 a 30/04/2025</p>
      </header>

      <section className="input-section">
        <h2>Dados da DRE (Manual)</h2>
        <p>Preencha os campos abaixo com os dados da sua DRE e estoque. Estes valores foram pré-preenchidos com os dados que você forneceu.</p>

        <div className="input-group">
          <label>Receita com Vendas (R$):</label>
          <input type="number" value={totalSalesInput} onChange={(e) => setTotalSalesInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Custo com Insumos (Compras da DRE) (R$):</label>
          <input type="number" value={costsInsumosInput} onChange={(e) => setCostsInsumosInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Estoque Inicial (R$):</label>
          <input type="number" value={estoqueInicialInput} onChange={(e) => setEstoqueInicialInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Estoque Final (R$):</label>
          <input type="number" value={estoqueFinalInput} onChange={(e) => setEstoqueFinalInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Gás (R$):</label>
          <input type="number" value={gasInput} onChange={(e) => setGasInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Gelo (R$):</label>
          <input type="number" value={iceInput} onChange={(e) => setIceInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas Administrativas (R$):</label>
          <input type="number" value={administrativeInput} onChange={(e) => setAdministrativeInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas com Pessoal (R$):</label>
          <input type="number" value={personnelInput} onChange={(e) => setPersonnelInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas Não Operacionais (R$):</label>
          <input type="number" value={nonOperationalInput} onChange={(e) => setNonOperationalInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas Financeiras (R$):</label>
          <input type="number" value={financialInput} onChange={(e) => setFinancialInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas com Impostos (R$):</label>
          <input type="number" value={taxesInput} onChange={(e) => setTaxesInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas com Marketing (R$):</label>
          <input type="number" value={marketingInput} onChange={(e) => setMarketingInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Serviços de Terceiros (R$):</label>
          <input type="number" value={thirdPartyServicesInput} onChange={(e) => setThirdPartyServicesInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Manutenções (R$):</label>
          <input type="number" value={maintenanceInput} onChange={(e) => setMaintenanceInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Cesta Básica (R$):</label>
          <input type="number" value={basicBasketInput} onChange={(e) => setBasicBasketInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Lucro Líquido (Saldo da DRE) (R$):</label>
          <input type="number" value={realProfitInput} onChange={(e) => setRealProfitInput(e.target.value)} />
        </div>
        <div className="input-group">
          <label>Total Despesas (DRE) (R$):</label>
          <input type="number" value={totalExpensesDREInput} onChange={(e) => setTotalExpensesDREInput(e.target.value)} />
        </div>


        <button onClick={simulateAnalysis}>Calcular Markup</button>
        {error && <p className="error-message">Erro: {error}</p>}
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
            {/* O Gás e Gelo já estão no CMV Real que é o denominador, não precisam ser selecionados aqui */}
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
            <p>Preencha todos os campos e clique em "Calcular Markup" para ver o resultado.</p>
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