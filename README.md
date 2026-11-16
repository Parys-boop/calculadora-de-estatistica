# Calculadora de Estatística

Calculadora para a atividade da faculdade, com Correlação de Pearson, Regressão Linear Simples e Intervalo de Confiança para a Média. Nas duas primeiras, insira pares X e Y; na terceira, informe os dados resumidos da amostra. Use o teclado físico ou o teclado da página. O visor substitui os valores durante a edição, e **= (Calcular)** apresenta os resultados com quatro casas decimais.

## Intervalo de Confiança para a Média

O terceiro card recebe média, desvio padrão, n inteiro positivo, confiança (90%, 95% ou 99%) e tipo do desvio. A confiança inicial é 95%, com desvio amostral. Margem e limites são calculados em `src/confidence.c` no mesmo módulo WebAssembly, com `double`, sem arredondar a margem antes de obter os limites. O resultado aparece abaixo do visor da fórmula, acima dos dados resumidos. Alterar qualquer entrada invalida o resultado; campos pendentes permanecem como símbolos na prévia.

O método Z segue os valores **tabelados arredondados do material da aula**: **90% → 1,645; 95% → 1,96; 99% → 2,575**, inclusive esse arredondamento de 99%. Usa α = 1 − confiança, Em = Z × desvio / √n e IC = (x̄ − Em; x̄ + Em).

- Com **s amostral**, permite somente **n > 30** e identifica o resultado como aproximação Z segundo a regra do material. Essa regra não garante validade estatística universal. Para n ≤ 30, bloqueia e explica a necessidade de avaliar t de Student, ainda não implementado.
- Com **σ populacional conhecido**, aceita n inteiro positivo; para **n ≤ 30**, exige confirmação explícita de que a população tem distribuição normal.
- O método pressupõe amostra aleatória e observações independentes, condições que os dados resumidos não permitem verificar. O intervalo estima a **média populacional**, não os valores individuais. A interpretação da confiança se refere à cobertura de intervalos em repetições do procedimento.
- Desvio zero produz margem zero e limites iguais à média, com observação sobre o significado do desvio informado. Limites negativos são preservados. n está limitado ao maior inteiro exato da integração JavaScript/double, 9.007.199.254.740.991; entradas fracionárias não são arredondadas.

`npm test` verifica os quatro exemplos da aula contra referências calculadas independentemente com Python `decimal` (precisão 60), os valores de Z, as condições do método e as falhas numéricas, além dos testes preservados de Pearson e regressão. Não há t de Student, gráficos ou quarta fórmula neste marco.

Campos vazios ou inválidos conservam os símbolos de suas variáveis na fórmula. As médias da prévia consideram os pares completos. A expressão conserva x̄ e ȳ até todos os pares estarem completos, quando recebe as médias e as somas calculadas em C. Preencha ou remova as linhas pendentes para finalizar. O separador decimal pode ser vírgula ou ponto.

## Regressão Linear Simples aprovada em 15/11/2026

O segundo card abre o ajuste por mínimos quadrados, com visor organizado em médias, inclinação a, intercepto b e equação final ŷ = ax + b. A reta é disponibilizada após **Calcular**. Cada calculadora conserva seus próprios pares ao alternar entre os cards.

Após ajustar a reta, informe **Valor de X para estimar Y** e use **Estimar Y**. A previsão usa os coeficientes completos em C, sem arredondamento intermediário, e avisa quando X está fora do intervalo observado. Alterar os pares invalida a reta e a previsão. Y constante é aceito, e X constante impede o ajuste.

Marco aprovado pelo usuário e preservado pela tag `v0.2.0-regressao-aprovada`, mantendo a interface escura e o funcionamento de Pearson. O botão **= (Calcular)** integra o teclado ao lado do zero. Médias, somas, a, b e previsões são calculados em C/WebAssembly com `double`; os resultados são apresentados com quatro casas decimais em português brasileiro.

A validação concluída inclui 19 testes automatizados, os cinco casos de regressão solicitados, conferência independente do exemplo da aula e verificações no navegador em computador e celular. Foram conferidos o visor dinâmico, edição e remoção de pares, invalidação dos resultados, previsão fora do intervalo e preservação de Pearson. Os comandos de compilação, teste e execução continuam os mesmos.

## Marco aprovado em 12/11/2026

Versão de Correlação de Pearson aprovada pelo usuário e preservada pela tag `v0.1.0-pearson-aprovado`.

- Interface escura em verde, responsiva, com card inicial contendo o título e a fórmula, tabela X/Y, edição de pares e teclados físico e virtual.
- Visor dinâmico em MathML com os valores substituídos diretamente na expressão de todos os pares. O resultado ocupa o lugar de r após **Calcular** e é invalidado quando os dados mudam.
- Médias, somas e coeficiente calculados em C com `double`, compilado para WebAssembly pelo Emscripten. Resultado com quatro casas decimais em português brasileiro e validações de campos, séries constantes e limites numéricos.
- Validação já concluída com 11 testes automatizados e verificações no navegador, incluindo telas de computador e celular. O exemplo da aula resulta em **0,9865**, conferido independentemente com o Python.

A tag de Pearson permanece como referência histórica. Novas fórmulas dependerão dos requisitos enviados pelo usuário e serão adicionadas em novos cards, preservando as calculadoras aprovadas.

## Rodar localmente

Use Node.js 22 ou superior, Python 3 e [Emscripten 4.0.23](https://emscripten.org/docs/getting_started/downloads.html). Em um terminal com `emcc` ativo, na raiz do projeto, execute:

```sh
npm run build
npm test
npm start
```

Abra [http://127.0.0.1:8000](http://127.0.0.1:8000). O servidor entrega os arquivos de `dist/` por HTTP para o navegador carregar o WebAssembly. O projeto usa o npm para executar scripts e dispensa instalação de pacotes JavaScript.

Para ativar o Emscripten no Windows, execute `emsdk_env.ps1` no PowerShell ou `emsdk_env.bat` no Prompt de Comando antes de compilar. Use `npm.cmd` se a política de scripts do PowerShell bloquear `npm.ps1`. Em macOS ou Linux, use `source /caminho/para/emsdk/emsdk_env.sh`.

## Organização

- `src/pearson.c` calcula médias, somas e o coeficiente usando `double`.
- `src/regression.c` reaproveita as médias e somas para ajustar a reta e calcular previsões em C com `double`.
- `web/` contém o HTML, o CSS, a interface em JavaScript e a integração com WebAssembly.
- `scripts/build.mjs` compila o módulo com Emscripten e monta o site estático em `dist/`.
- `test/pearson.test.js` exercita o módulo compilado por meio da mesma integração usada no navegador.
- `test/regression.test.js` confere os ajustes, previsões, validações e a preservação da precisão no mesmo módulo WebAssembly.

Para conferir o exemplo da aula de forma independente:

```sh
python -c "from statistics import correlation; print(correlation([100,200,300,400,500,600], [50,80,130,190,260,350]))"
```

O valor de referência é aproximadamente `0.9865208973698818`. A calculadora exibe **0,9865**.

## Publicar no GitHub Pages

O repositório configurado é [Parys-boop/calculadora-de-estatistica](https://github.com/Parys-boop/calculadora-de-estatistica), e a calculadora está em [GitHub Pages](https://parys-boop.github.io/calculadora-de-estatistica/). Envios para `main` acionam o fluxo existente, que compila o C/WebAssembly, executa os testes e publica o site.

Para configurar a mesma publicação em outro repositório:

1. Crie um repositório GitHub público para compartilhar o site com a turma e envie o código para a branch `main`.
2. No repositório, acesse **Settings → Pages → Build and deployment** e selecione **GitHub Actions** como fonte.
3. Em **Actions**, execute **Publicar no GitHub Pages** na branch `main`. O fluxo instala o Emscripten, compila o site, roda os testes e publica `dist/`. Novos envios para `main` acionam a mesma publicação.
4. Copie o endereço exibido em **Settings → Pages** e teste-o antes de compartilhar.

[Documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
