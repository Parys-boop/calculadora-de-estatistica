# Calculadora de Estatística

Primeira versão para a atividade da faculdade, com a Correlação de Pearson. Insira pares X e Y com o teclado físico ou o teclado da página. O visor substitui os valores diretamente na fórmula de todos os pares e mostra as médias e as somas durante a edição. Clique em **Calcular** para ver o coeficiente com quatro casas decimais no lugar de r.

Campos vazios ou inválidos conservam os símbolos de suas variáveis na fórmula. As médias da prévia consideram os pares completos. A expressão conserva x̄ e ȳ até todos os pares estarem completos, quando recebe as médias e as somas calculadas em C. Preencha ou remova as linhas pendentes para finalizar. O separador decimal pode ser vírgula ou ponto.

## Marco aprovado em 12/11/2026

Versão de Correlação de Pearson aprovada pelo usuário e preservada pela tag `v0.1.0-pearson-aprovado`.

- Interface escura em verde, responsiva, com card inicial contendo o título e a fórmula, tabela X/Y, edição de pares e teclados físico e virtual.
- Visor dinâmico em MathML com os valores substituídos diretamente na expressão de todos os pares. O resultado ocupa o lugar de r após **Calcular** e é invalidado quando os dados mudam.
- Médias, somas e coeficiente calculados em C com `double`, compilado para WebAssembly pelo Emscripten. Resultado com quatro casas decimais em português brasileiro e validações de campos, séries constantes e limites numéricos.
- Validação já concluída com 11 testes automatizados e verificações no navegador, incluindo telas de computador e celular. O exemplo da aula resulta em **0,9865**, conferido independentemente com o Python.

Este marco será a referência das próximas alterações. A próxima fórmula dependerá dos requisitos enviados pelo usuário e será adicionada em um novo card, preservando o funcionamento de Pearson.

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
- `web/` contém o HTML, o CSS, a interface em JavaScript e a integração com WebAssembly.
- `scripts/build.mjs` compila o módulo com Emscripten e monta o site estático em `dist/`.
- `test/pearson.test.js` exercita o módulo compilado por meio da mesma integração usada no navegador.

Para conferir o exemplo da aula de forma independente:

```sh
python -c "from statistics import correlation; print(correlation([100,200,300,400,500,600], [50,80,130,190,260,350]))"
```

O valor de referência é aproximadamente `0.9865208973698818`. A calculadora exibe **0,9865**.

## Publicar no GitHub Pages

1. Crie um repositório GitHub público para compartilhar o site com a turma e envie o código para a branch `main`.
2. No repositório, acesse **Settings → Pages → Build and deployment** e selecione **GitHub Actions** como fonte.
3. Em **Actions**, execute **Publicar no GitHub Pages** na branch `main`. O fluxo instala o Emscripten, compila o site, roda os testes e publica `dist/`. Novos envios para `main` acionam a mesma publicação.
4. Copie o endereço exibido em **Settings → Pages** e teste-o antes de compartilhar.

[Documentação do GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
