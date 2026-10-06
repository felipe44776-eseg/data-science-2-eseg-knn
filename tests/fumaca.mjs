// Teste de fumaça da animação: dirige o Chrome real, varre a linha do tempo e confere o quadro final com a base do notebook.
// Uso (dentro de tests/):  npm install --no-package-lock  &&  node fumaca.mjs
// Contra o site publicado:  KNN_URL=https://felipe44776-eseg.github.io/data-science-2-eseg-knn/knn_animacao.html node fumaca.mjs
// Chrome fora do caminho padrão: variável CHROME.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const PASTA = path.dirname(aqui);
const URL_BASE = process.env.KNN_URL || pathToFileURL(path.join(PASTA, 'knn_animacao.html')).href;
const D = JSON.parse(fs.readFileSync(path.join(PASTA, 'knn_animacao_dados.json'), 'utf8'));
const fotos = path.join(aqui, 'fotos');
fs.mkdirSync(fotos, { recursive: true });

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'knn-fumaca-'));
const falhas = [];
const confere = (ok, msg) => { console.log((ok ? '  ok    ' : '  FALHA ') + msg); if (!ok) falhas.push(msg); };
const pct = a => (a * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
const dorme = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  // perfil novo a cada execução: perfil reaproveitado refaz pedidos antigos de /favicon.ico e acusa 404 falso
  headless: true, userDataDir: perfil,
  args: ['--no-first-run', '--disable-gpu'],
});
const erros = [];
async function abre(query, vp = { width: 1440, height: 900 }) {
  const page = await browser.newPage();
  await page.setViewport(vp);
  page.on('pageerror', e => erros.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() >= 400) erros.push(`http ${r.status()} ${r.url()}`); });
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) erros.push(`console.${m.type()}: ${m.text()}`); });
  await page.goto(URL_BASE + query);
  await page.waitForFunction(() => document.getElementById('titulo').textContent.length > 0);
  return page;
}
const txt = (page, id) => page.$eval('#' + id, e => e.textContent);
const estadoFinal = page => page.evaluate(() => {
  const t = id => document.getElementById(id).textContent;
  return { etapa: t('etapa'), k: t('t-k'), treino: t('t-atr'), teste: t('t-ate'), matriz: [[t('m00'), t('m01')], [t('m10'), t('m11')]],
    voto: t('contagem'), codigo: t('codigo'), fichas: [...document.querySelectorAll('#fichas i')].map(i => i.className).join(''),
    nota: t('nota'), aviso: getComputedStyle(document.getElementById('aviso')).display };
});

// 1. varredura completa arrastando a linha do tempo: nenhuma cena pode lancar excecao
console.log('1. varredura da linha do tempo');
let page = await abre('?t=0');
const tr = await (await page.$('#trilho')).boundingBox();
const y = tr.y + tr.height / 2, vistas = new Set();
await page.mouse.move(tr.x + 1, y); await page.mouse.down();
for (let i = 0; i <= 460; i++) {
  await page.mouse.move(tr.x + 1 + (tr.width - 2) * i / 460, y);
  if (i % 4 === 0) { await page.evaluate(() => new Promise(r => requestAnimationFrame(r))); vistas.add(await txt(page, 'etapa')); }
}
await page.mouse.up();
confere(vistas.size === 14, `14 etapas visitadas (${vistas.size})`);
confere(erros.length === 0, `sem erros de execucao na varredura (${erros.length}) ${erros.slice(0, 3).join(' | ')}`);

// 2. quadro final = resultado do KNN no notebook
console.log('2. quadro final x notebook');
await page.keyboard.press('End');
await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
const fim = await estadoFinal(page);
const e = D.experimentos.normalizado, k = e.melhor_k, r = D.resumo.find(q => q.experimento === 'normalizado');
confere(fim.etapa === 'Etapa 14 de 14', 'ultima etapa');
confere(fim.k === String(r.melhor_k), `k final ${fim.k} = melhor_k do notebook ${r.melhor_k}`);
confere(fim.teste === pct(r.acuracia_teste), `acuracia de teste ${fim.teste} = ${pct(r.acuracia_teste)}`);
confere(fim.treino === pct(r.acuracia_treino), `acuracia de treino ${fim.treino} = ${pct(r.acuracia_treino)}`);
confere(JSON.stringify(fim.matriz) === JSON.stringify(e.matriz[k - 1].map(l => l.map(String))), `matriz ${JSON.stringify(fim.matriz)} = ${JSON.stringify(e.matriz[k - 1])}`);
confere(fim.voto.includes('X → ' + (r.pred_X ? 'homem' : 'mulher')), `previsao de X: "${fim.voto.replace(/\s+/g, ' ')}"`);
const homens = e.viz_x[k - 1].filter(id => D.linhas.homem[id]).length;
confere((fim.fichas.match(/h/g) || []).length === homens && fim.fichas.length === k, `fichas do voto: ${k - homens} mulheres e ${homens} homens`);
for (const q of D.resumo) confere(fim.codigo.includes(q.acuracia_teste.toFixed(6)) && fim.codigo.includes(q.experimento), `resumo exibe ${q.experimento} ${q.acuracia_teste.toFixed(6)}`);
confere(fim.nota.startsWith('Conferido com o sklearn'), 'conferencia interna com o sklearn sem divergencias');
confere(fim.aviso === 'none', 'sem faixa de erro');
await page.screenshot({ path: path.join(fotos, 't-final.png') });

// 3. dicas ao passar o cursor
console.log('3. interacao');
const mp = await (await page.$('#mapa')).boundingBox();
let dicaPonto = '';
busca: for (let gy = 0.25; gy < 0.8; gy += 0.05) for (let gx = 0.3; gx < 0.7; gx += 0.03) {
  await page.mouse.move(mp.x + mp.width * gx, mp.y + mp.height * gy);
  const d = await page.$eval('#dica', el => (el.style.display === 'block' ? el.textContent : ''));
  if (d.includes('previsto')) { dicaPonto = d; await page.screenshot({ path: path.join(fotos, 't-dica-ponto.png') }); break busca; }
}
confere(dicaPonto.length > 0, `dica de ponto de teste: "${dicaPonto}"`);
const cv = await (await page.$('#curva')).boundingBox();
await page.mouse.move(cv.x + cv.width * 0.5, cv.y + cv.height * 0.5);
const dicaK = await page.$eval('#dica', el => (el.style.display === 'block' ? el.textContent : ''));
confere(/k = \d+/.test(dicaK) && dicaK.includes('teste'), `dica do grafico: "${dicaK}"`);
await page.screenshot({ path: path.join(fotos, 't-dica-curva.png') });

await page.click('#btn-tabela');
const linhas = await page.$$eval('#dlg table', ts => ts.map(t => t.rows.length));
confere(await page.$eval('#dlg', d => d.open) && linhas[0] === 4 && linhas[1] === D.meta.k_max + 2, `tabela aberta com ${linhas} linhas`);
await page.screenshot({ path: path.join(fotos, 't-tabela.png') });
await page.click('#dlg-fecha');
await page.click('#btn-tema');
confere(await page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'troca de tema');
await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft');
await page.evaluate(() => new Promise(r => requestAnimationFrame(r)));
confere((await txt(page, 'etapa')) === 'Etapa 13 de 14', 'seta para a esquerda volta uma etapa');
await page.close();

// 4. reproducao: toca sozinha, pausa com espaco e para no fim
console.log('4. reproducao');
page = await abre('');
await dorme(1500);
const t1 = await txt(page, 'tempo');
confere(!t1.startsWith('0:00') && (await page.$eval('#btn-toca', b => b.getAttribute('aria-label'))) === 'Pausar', `toca ao abrir (${t1})`);
await page.keyboard.press(' ');
const t2 = await txt(page, 'tempo'); await dorme(1200);
confere((await txt(page, 'tempo')) === t2, 'espaco pausa');
await page.select('#vel', '4');
await page.mouse.move(5, 5);
await page.keyboard.press(' ');
await page.waitForFunction(() => document.getElementById('btn-toca').getAttribute('aria-label') === 'Reproduzir', { timeout: 60000 });
const fim2 = await estadoFinal(page);
confere(fim2.etapa === 'Etapa 14 de 14' && fim2.teste === fim.teste && JSON.stringify(fim2.matriz) === JSON.stringify(fim.matriz), 'reproducao termina no mesmo quadro final');
await page.close();

// 5. tela estreita: sem rolagem horizontal
console.log('5. celular');
page = await abre('?cena=melhor2&p=0.9', { width: 390, height: 844, deviceScaleFactor: 2 });
const larg = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
confere(larg[0] <= larg[1], `sem rolagem horizontal (${larg})`);
const cabe = await page.evaluate(() => {
  const c = document.querySelector('.grafico').getBoundingClientRect(), k = document.getElementById('curva').getBoundingClientRect();
  return k.bottom <= c.bottom + 1 && k.height > 100;
});
confere(cabe, 'grafico dentro do cartao');
await page.screenshot({ path: path.join(fotos, 't-celular.png'), fullPage: true });
await page.close();

confere(erros.length === 0, `sem erros no console em todo o teste (${erros.length}) ${erros.slice(0, 3).join(' | ')}`);
await browser.close();
fs.rmSync(perfil, { recursive: true, force: true, maxRetries: 5 });
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
