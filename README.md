# KNN passo a passo

Animação da classificação por K-vizinhos mais próximos (KNN) sobre a base Howell1: do CSV até a decisão, seguindo as células do notebook.

**Ver online:** https://felipe44776-eseg.github.io/data-science-2-eseg-knn/

A página não recalcula o KNN. Ela desenha o que o `scikit-learn` calculou no notebook, então o quadro final é o resultado do notebook: KNN com dados normalizados, K = 20, 103 acertos em 115 pontos de teste (89,6%), e o ponto X (156 cm, 52 kg) classificado como mulher.

## Arquivos

| Arquivo | O que é |
|---|---|
| `knn_animacao.html` | A animação. Arquivo único: funciona offline, basta abrir no navegador |
| `Data_Science_Classificacao_KNN.ipynb` | O notebook. Treina os modelos e gera a base da animação |
| `Howell1.csv` | Os dados: altura, peso, idade e sexo de 544 pessoas |
| `knn_animacao_dados.json` | A base exportada pelo notebook, a mesma que está embutida no HTML |
| `index.html` | Só encaminha a raiz do site para a animação |

## Como usar

- **Só assistir:** abra o link acima, ou baixe `knn_animacao.html` e abra com dois cliques.
- **Controles:** espaço toca e pausa, setas esquerda e direita trocam de etapa, a barra arrasta no tempo. Passe o cursor sobre um ponto de teste para ver os vizinhos que decidiram a classe dele.

## Como refazer os números

```bash
pip install -r requirements.txt
jupyter notebook Data_Science_Classificacao_KNN.ipynb
```

Rode todas as células. A última grava `knn_animacao_dados.json` e injeta a base em `knn_animacao.html`, então a animação passa a mostrar o resultado da sua execução. Trocar `SEED` sorteia outra partição de treino e teste e muda o melhor K e a acurácia.

No Google Colab o notebook também roda (ele pede o upload do `Howell1.csv`), mas a injeção no HTML só acontece se `knn_animacao.html` estiver na mesma pasta.

## Dados

`Howell1` reúne o censo dos !Kung San da região de Dobe feito por Nancy Howell, distribuído com o pacote `rethinking` de Richard McElreath. O notebook usa só os adultos (`age > 18`): 346 pessoas.
