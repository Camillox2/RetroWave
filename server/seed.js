const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'retrowave',
    port: process.env.DB_PORT || 3306
});

// ─────────────────────────────────────────────────────────────────────────────
// Caminho base das imagens
// ─────────────────────────────────────────────────────────────────────────────
const ASSETS = path.join(__dirname, '..', 'src', 'assets', 'camisastime');

// Ler a imagem *frente* de uma pasta e retornar base64
function getBase64(folder) {
    const fullPath = path.join(ASSETS, folder);
    const files = fs.readdirSync(fullPath)
                    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    // Priorizar arquivo com "frente" no nome
    const frente = files.find(f => /frente/i.test(f));
    const chosen = frente || files.sort()[0];
    if (!chosen) throw new Error(`Sem imagens em: ${fullPath}`);
    const buf = fs.readFileSync(path.join(fullPath, chosen));
    const ext = path.extname(chosen).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    console.log(`    → Usando: ${chosen}${frente ? ' (frente)' : ' (fallback)'}`);
    return `data:image/${mime};base64,` + buf.toString('base64');
}

// Retorna array de base64 das imagens EXTRAS (excluindo a frente)
function getExtrasBase64(folder) {
    const fullPath = path.join(ASSETS, folder);
    const files = fs.readdirSync(fullPath)
                    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
                    .filter(f => !/frente/i.test(f))
                    .sort();
    return files.map(f => {
        const buf = fs.readFileSync(path.join(fullPath, f));
        const ext = path.extname(f).slice(1).toLowerCase();
        const mime = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mime};base64,` + buf.toString('base64');
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// CATÁLOGO — 41 camisas reais de 5 ligas
// ─────────────────────────────────────────────────────────────────────────────
const camisas = [
    // ── BUNDESLIGA (8) ──────────────────────────────────────────────────────
    { nome: 'BAYERN MUNICH RETRO 1993',        liga: 'BUNDESLIGA', preco: 289.90, pasta: 'BUNDESLIGA/bayern 1993' },
    { nome: 'BAYERN MUNICH RETRO 1996',        liga: 'BUNDESLIGA', preco: 279.90, pasta: 'BUNDESLIGA/bayern 1996' },
    { nome: 'BAYERN MUNICH RETRO 1997',        liga: 'BUNDESLIGA', preco: 299.90, pasta: 'BUNDESLIGA/bayern 1997' },
    { nome: 'BAYERN MUNICH RETRO 1998',        liga: 'BUNDESLIGA', preco: 289.90, pasta: 'BUNDESLIGA/bayern 1998' },
    { nome: 'BAYERN MUNICH RETRO 2007',        liga: 'BUNDESLIGA', preco: 269.90, pasta: 'BUNDESLIGA/bayern 2007' },
    { nome: 'BAYERN MUNICH RETRO 2014',        liga: 'BUNDESLIGA', preco: 309.90, pasta: 'BUNDESLIGA/bayern 2014' },
    { nome: 'BORUSSIA DORTMUND RETRO 1989',    liga: 'BUNDESLIGA', preco: 299.90, pasta: 'BUNDESLIGA/dortmund 1989' },
    { nome: 'BORUSSIA DORTMUND RETRO 1997',    liga: 'BUNDESLIGA', preco: 289.90, pasta: 'BUNDESLIGA/dormund 1997' },

    // ── LIGA PORTUGUESA (2) ─────────────────────────────────────────────────
    { nome: 'SPORTING CP MANGA CURTA RETRO 1999',  liga: 'LIGA PORTUGUESA', preco: 269.90, pasta: 'LIGA PORTUGUESA/sporting manga curta 1999' },
    { nome: 'SPORTING CP MANGA LONGA RETRO 2001',  liga: 'LIGA PORTUGUESA', preco: 279.90, pasta: 'LIGA PORTUGUESA/sporting manga longa 2001' },

    // ── LIGUE 1 (8) ────────────────────────────────────────────────────────
    { nome: 'OLYMPIQUE MARSEILLE RETRO 1998',  liga: 'LIGUE 1', preco: 279.90, pasta: 'LIGUE ONE FRANÇA/Marseille 1998' },
    { nome: 'OLYMPIQUE MARSEILLE RETRO 1999',  liga: 'LIGUE 1', preco: 289.90, pasta: 'LIGUE ONE FRANÇA/Marseille 1999' },
    { nome: 'PSG RETRO 1993',                  liga: 'LIGUE 1', preco: 299.90, pasta: 'LIGUE ONE FRANÇA/psg 1993' },
    { nome: 'PSG RETRO 1996',                  liga: 'LIGUE 1', preco: 289.90, pasta: 'LIGUE ONE FRANÇA/psg 1996' },
    { nome: 'PSG RETRO 2000',                  liga: 'LIGUE 1', preco: 279.90, pasta: 'LIGUE ONE FRANÇA/psg 2000' },
    { nome: 'PSG RETRO 2001',                  liga: 'LIGUE 1', preco: 289.90, pasta: 'LIGUE ONE FRANÇA/psg 2001' },
    { nome: 'PSG PRETA RETRO 2001',            liga: 'LIGUE 1', preco: 299.90, pasta: 'LIGUE ONE FRANÇA/psg 2001 preta' },
    { nome: 'PSG RETRO 2004',                  liga: 'LIGUE 1', preco: 269.90, pasta: 'LIGUE ONE FRANÇA/psg 2004' },

    // ── BRASILEIRÃO (10) ────────────────────────────────────────────────────
    { nome: 'CORINTHIANS RETRO 2008',              liga: 'BRASILEIRÃO', preco: 259.90, pasta: 'SERIE A BRASILEIRÃO/corinthians 2008' },
    { nome: 'FLAMENGO RETRO 2003',                 liga: 'BRASILEIRÃO', preco: 269.90, pasta: 'SERIE A BRASILEIRÃO/flamengo 2003' },
    { nome: 'PALMEIRAS RETRO 1992',                liga: 'BRASILEIRÃO', preco: 279.90, pasta: 'SERIE A BRASILEIRÃO/palmeiras 1992' },
    { nome: 'PALMEIRAS RETRO 1999',                liga: 'BRASILEIRÃO', preco: 269.90, pasta: 'SERIE A BRASILEIRÃO/palmeiras 1999' },
    { nome: 'SANTOS MANGA LONGA RETRO 2012',       liga: 'BRASILEIRÃO', preco: 289.90, pasta: 'SERIE A BRASILEIRÃO/santos 2012 manga longa' },
    { nome: 'SANTOS PRETA RETRO 2012',             liga: 'BRASILEIRÃO', preco: 279.90, pasta: 'SERIE A BRASILEIRÃO/santos 2012 preta' },
    { nome: 'SANTOS RETRO 2013',                   liga: 'BRASILEIRÃO', preco: 259.90, pasta: 'SERIE A BRASILEIRÃO/santos 2013' },
    { nome: 'SANTOS MANGA LONGA RETRO 2013',       liga: 'BRASILEIRÃO', preco: 289.90, pasta: 'SERIE A BRASILEIRÃO/santos 2013 manga longa' },
    { nome: 'SÃO PAULO RETRO 2000',                liga: 'BRASILEIRÃO', preco: 269.90, pasta: 'SERIE A BRASILEIRÃO/são paulo 2000' },
    { nome: 'SÃO PAULO VERMELHA RETRO 2000',       liga: 'BRASILEIRÃO', preco: 279.90, pasta: 'SERIE A BRASILEIRÃO/são paulo 2000 vermelha' },

    // ── SERIE A (13) ────────────────────────────────────────────────────────
    { nome: 'FIORENTINA RETRO 1998',                    liga: 'SERIE A', preco: 289.90, pasta: 'SERIE A ITALIA/fiorentina 1998' },
    { nome: 'FIORENTINA MANGA LONGA RETRO 1998',        liga: 'SERIE A', preco: 299.90, pasta: 'SERIE A ITALIA/fiorentina 1998 manga longa' },
    { nome: 'INTER DE MILÃO RETRO 1998',                liga: 'SERIE A', preco: 299.90, pasta: 'SERIE A ITALIA/inter de milao 1998' },
    { nome: 'INTER DE MILÃO RETRO 2009',                liga: 'SERIE A', preco: 279.90, pasta: 'SERIE A ITALIA/inter de milao 2009' },
    { nome: 'INTER DE MILÃO MANGA LONGA RETRO 2009',    liga: 'SERIE A', preco: 309.90, pasta: 'SERIE A ITALIA/inter de milao 2009 manga longa' },
    { nome: 'JUVENTUS RETRO 1995',                      liga: 'SERIE A', preco: 299.90, pasta: 'SERIE A ITALIA/juventus 1995' },
    { nome: 'AC MILAN RETRO 1997',                      liga: 'SERIE A', preco: 289.90, pasta: 'SERIE A ITALIA/milan 1997' },
    { nome: 'AC MILAN PRETA RETRO 1997',                liga: 'SERIE A', preco: 299.90, pasta: 'SERIE A ITALIA/milan 1997 preta' },
    { nome: 'AC MILAN RETRO 2006',                      liga: 'SERIE A', preco: 279.90, pasta: 'SERIE A ITALIA/milan 2006' },
    { nome: 'AC MILAN BRANCA RETRO 2006',               liga: 'SERIE A', preco: 289.90, pasta: 'SERIE A ITALIA/milan 2006 branca' },
    { nome: 'AC MILAN BRANCA MANGA LONGA RETRO 2006',   liga: 'SERIE A', preco: 309.90, pasta: 'SERIE A ITALIA/milan 2006 branca manga longa' },
    { nome: 'AC MILAN MANGA LONGA RETRO 2009',          liga: 'SERIE A', preco: 299.90, pasta: 'SERIE A ITALIA/milan 2009 manga longa' },
    { nome: 'AS ROMA MANGA LONGA RETRO 2000',           liga: 'SERIE A', preco: 289.90, pasta: 'SERIE A ITALIA/roma 2000 manga longa' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Carregar imagens e inserir no banco
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n  Preparando ${camisas.length} produtos...\n`);

// Pre-carregar todas as imagens antes de conectar (fail fast)
const produtosComImagem = camisas.map((c, i) => {
    try {
        const img = getBase64(c.pasta);
        const extras = getExtrasBase64(c.pasta);
        console.log(`  OK  [${i + 1}/${camisas.length}] ${c.nome} — ${extras.length} extras`);
        return { ...c, imagem: img, extras };
    } catch (err) {
        console.error(`  ERRO  [${i + 1}/${camisas.length}] ${c.nome} - ${err.message}`);
        process.exit(1);
    }
});

console.log(`\n  Todas as imagens carregadas. Conectando ao MySQL...\n`);

db.connect(err => {
    if (err) throw err;
    console.log('  Conectado ao MySQL');

    // Limpar produtos antigos e imagens extras
    db.query('DELETE FROM produto_imagens', () => {});
    db.query('DELETE FROM itens_pedido', () => {});
    db.query('DELETE FROM produtos', (err) => {
        if (err) throw err;
        console.log('  Produtos antigos removidos');

        // Inserir um a um para evitar max_allowed_packet
        let inserted = 0;
        let totalExtras = 0;
        const insertNext = (index) => {
            if (index >= produtosComImagem.length) {
                console.log(`\n  Seed finalizado: ${inserted} produtos + ${totalExtras} imagens extras inseridos!\n`);
                db.end();
                return;
            }
            const p = produtosComImagem[index];
            db.query(
                'INSERT INTO produtos (nome, liga, preco, imagem) VALUES (?, ?, ?, ?)',
                [p.nome, p.liga, p.preco, p.imagem],
                (err, result) => {
                    if (err) {
                        console.error(`  Erro ao inserir "${p.nome}":`, err.message);
                        process.exit(1);
                    }
                    inserted++;
                    const produtoId = result.insertId;

                    // Inserir imagens extras
                    if (p.extras.length === 0) {
                        if (inserted % 10 === 0) console.log(`  ${inserted}/${produtosComImagem.length} inseridos...`);
                        insertNext(index + 1);
                        return;
                    }

                    let extIdx = 0;
                    const insertExtraNext = () => {
                        if (extIdx >= p.extras.length) {
                            if (inserted % 10 === 0) console.log(`  ${inserted}/${produtosComImagem.length} inseridos...`);
                            insertNext(index + 1);
                            return;
                        }
                        const extra = p.extras[extIdx];
                        db.query(
                            'INSERT INTO produto_imagens (produto_id, imagem, ordem) VALUES (?, ?, ?)',
                            [produtoId, extra, extIdx],
                            (err2) => {
                                if (err2) {
                                    console.error(`  Erro ao inserir extra ${extIdx} de "${p.nome}":`, err2.message);
                                }
                                totalExtras++;
                                extIdx++;
                                insertExtraNext();
                            }
                        );
                    };
                    insertExtraNext();
                }
            );
        };
        insertNext(0);
    });
});
