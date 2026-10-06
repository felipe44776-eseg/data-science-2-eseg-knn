# CLAUDE.md — Data Science 2 · KNN passo a passo

Contexto de projeto. Herda de `~/CLAUDE.md` tudo que não estiver aqui.

## Tenant

**ESEG (acadêmico)** — nunca tocar em recurso de cliente a partir deste diretório.

| | |
|---|---|
| Identidade git | `felipe_44776@aluno.eseg.edu.br` |
| Conta gh | `felipe44776-eseg` |
| Repo | `felipe44776-eseg/data-science-2-eseg-knn` (público, branch `main`) |
| Site | https://felipe44776-eseg.github.io/data-science-2-eseg-knn/ (GitHub Pages, `main`, raiz) |
| gcloud | não utilizada — sem GCP |

Subagente que rode `git`/`gh` aqui deve receber o tenant declarado no prompt.

## O que é

Notebook de aula de classificação KNN sobre a base Howell1 e uma animação em HTML que mostra, etapa por etapa, o que o notebook faz. Publicado para compartilhar com colegas.

**Invariante do projeto: a página não calcula KNN.** Ela desenha o que o `scikit-learn` calculou no notebook, e o quadro final tem de ser o resultado do notebook. Qualquer número novo na página nasce no notebook e chega pela base exportada.

## Fluxo de dados

```
Howell1.csv ─► Data_Science_Classificacao_KNN.ipynb ─► knn_animacao_dados.json
                                                   └─► injeta em <script id="knn-dados"> de knn_animacao.html ─► Pages
```

- As duas últimas células do notebook montam a base (predições do teste, matriz de confusão, vizinhos de X e fronteira de decisão em grade, para cada experimento e cada k de 1 a 30) e a injetam no HTML. A página continua sendo um arquivo único que abre direto do disco.
- Três travas garantem a invariante: `assert` na célula de exportação (curvas e predições batem com as células de cima), conferência interna da página (aparece no rodapé do diálogo **Tabela**) e `tests/fumaca.mjs`.
- `index.html` só encaminha a raiz do site para `knn_animacao.html`.

## Comandos

```powershell
# reexecutar o notebook inteiro (nbconvert não está instalado nesta máquina; nbclient está)
python -c "import nbformat; from nbclient import NotebookClient; p='Data_Science_Classificacao_KNN.ipynb'; nb=nbformat.read(p, as_version=4); NotebookClient(nb, timeout=600, kernel_name='python3').execute(); nbformat.write(nb, p)"

# teste de fumaça (Chrome real): local e contra o site
cd tests; npm ci; node fumaca.mjs
$env:KNN_URL = 'https://felipe44776-eseg.github.io/data-science-2-eseg-knn/knn_animacao.html'; node fumaca.mjs; Remove-Item Env:KNN_URL
```

Publicar é `git push` em `main`; o Pages republica em cerca de 30 segundos. Conferir com `gh api repos/felipe44776-eseg/data-science-2-eseg-knn/pages/builds/latest`.

Quadros determinísticos, para inspecionar ou fotografar (a página abre pausada): `?cena=<id>&p=<0..1>`, `?t=<segundos>`, `?fim=1`, `?tema=dark`. Ids das cenas, na ordem: `carga`, `filtro`, `sexo`, `ponto`, `split`, `k1`, `k10`, `k30`, `melhor`, `norm`, `knorm`, `melhor2`, `altura`, `final`.

## Decisões travadas

- `SEED = 42` nas três chamadas de `train_test_split`: mesma partição nos três experimentos. Semente convencional, não escolhida pelo resultado.
- `StandardScaler` ajustado só no treino.
- Ponto X é `(156, 52)` no gráfico e nas predições.
- Quadro final da animação é o KNN normalizado (último gráfico de predições do notebook); "só a altura" é a penúltima etapa.
- Cores: laranja para mulheres, azul para homens, verde para tudo que é vizinhança de X; anel escuro é erro de previsão. O `relplot` do seaborn no notebook pinta ao contrário (0 em azul).
- Layout: dispersão fixa à esquerda; à direita gráfico de acurácia, depois voto e matriz, depois código. O gráfico nunca fica com cartão menor que 340 px; em janela baixa o código desce e a página rola.

## Armadilhas

- **A última linha de `knn_animacao.html` tem cerca de 220 KB** (a base embutida). Nunca ler o arquivo inteiro: `Read` com `limit`, edição por substituição exata. Não editar a base à mão; quem escreve ali é o notebook.
- Reexecutar o notebook sempre gera diff (carimbo `gerado_em` e saídas regravadas) mesmo sem mudança de resultado. Se a base não mudou, descartar com `git checkout --` em vez de commitar.
- `npm install` fora de `tests/` sobe até o `package.json` da home e instala lá. Sempre rodar dentro de `tests/`.
- Chrome headless com `--virtual-time-budget` congela transições CSS no meio (a legenda saía apagada na foto). Fotografar em tempo real, como o teste faz.
- Perfil de Chrome reaproveitado refaz pedidos antigos de `/favicon.ico` e acusa 404 falso; o teste usa perfil novo a cada execução.
- Janela baixa é o caso crítico de layout: validar em 1280×600 e 1536×730 além de 1440×900, 1920×1080 e 390×844.

## Estado em 2026-10-06

Publicado e conferido: o site serve o mesmo conteúdo de `main` e o teste de fumaça passa local e contra a URL pública.

Resultado com `SEED = 42` (231 de treino, 115 de teste):

| Experimento | Melhor k | Acurácia no teste | Previsão para X |
|---|---|---|---|
| Altura e peso, sem normalizar | 11 | 0,8957 (103 de 115) | mulher |
| Altura e peso, normalizados | 20 | 0,8957 (103 de 115) | mulher |
| Só a altura | 10 | 0,8870 (102 de 115) | mulher |

Na mesma partição a normalização não muda a acurácia; o salto que o notebook original mostrava vinha de sortear uma partição nova para cada experimento.

## Pendências

- [ ] **Decisão do Felipe:** acrescentar precisão, recall e F1 por classe. O notebook importa `precision_score`, `recall_score` e `f1_score` e não usa. Se entrar, calcular no notebook, exportar na base e só então desenhar.
- [ ] A escolha de k usa a acurácia do próprio teste, o que é otimista. Ficou como no notebook original de propósito: validação cruzada mudaria o roteiro da animação.
- `Data_Science_Classificacao_KNN.original.ipynb` é o backup local do notebook antes das correções. Está fora do git; pode ser apagado quando não for mais necessário.
