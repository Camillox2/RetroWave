/**
 * MIGRAÇÃO: Base64 → WebP em disco
 * Executa uma vez: node migrate-images.js
 */
const path = require('path');
const fs = require('fs');
const mysql = require('mysql2');
const sharp = require('sharp');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
});

async function convertBase64ToWebP(base64, filename) {
    const matches = base64.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;
    const buffer = Buffer.from(matches[2], 'base64');
    const outPath = path.join(UPLOADS_DIR, filename);
    await sharp(buffer)
        .resize(480, 480, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outPath);
    return `/uploads/${filename}`;
}

async function migrar() {
    console.log('🚀 Iniciando migração de imagens...\n');

    // ── 1. Imagens principais dos produtos ──────────────────────────────────
    const [produtos] = await db.promise().query(
        "SELECT id, imagem FROM produtos WHERE imagem LIKE 'data:%'"
    );
    console.log(`📦 Produtos com base64: ${produtos.length}`);

    let okProdutos = 0, errProdutos = 0;
    for (const p of produtos) {
        try {
            const urlPath = await convertBase64ToWebP(p.imagem, `thumb-${p.id}.webp`);
            if (urlPath) {
                await db.promise().query('UPDATE produtos SET imagem = ? WHERE id = ?', [urlPath, p.id]);
                okProdutos++;
                process.stdout.write(`\r  ✅ ${okProdutos}/${produtos.length} produtos convertidos`);
            }
        } catch (e) {
            errProdutos++;
            console.error(`\n  ❌ Produto #${p.id}: ${e.message}`);
        }
    }
    console.log(`\n  → ${okProdutos} OK, ${errProdutos} erros\n`);

    // ── 2. Imagens extras dos produtos ──────────────────────────────────────
    const [extras] = await db.promise().query(
        "SELECT id, imagem FROM produto_imagens WHERE imagem LIKE 'data:%'"
    );
    console.log(`🖼️  Imagens extras com base64: ${extras.length}`);

    let okExtras = 0, errExtras = 0;
    for (const img of extras) {
        try {
            const urlPath = await convertBase64ToWebP(img.imagem, `extra-${img.id}.webp`);
            if (urlPath) {
                await db.promise().query('UPDATE produto_imagens SET imagem = ? WHERE id = ?', [urlPath, img.id]);
                okExtras++;
                process.stdout.write(`\r  ✅ ${okExtras}/${extras.length} extras convertidos`);
            }
        } catch (e) {
            errExtras++;
            console.error(`\n  ❌ Extra #${img.id}: ${e.message}`);
        }
    }
    console.log(`\n  → ${okExtras} OK, ${errExtras} erros\n`);

    // ── 3. Banner ────────────────────────────────────────────────────────────
    const [bannerRows] = await db.promise().query(
        "SELECT valor FROM site_config WHERE chave = 'banner_imagem' AND valor LIKE 'data:%'"
    );
    if (bannerRows.length > 0) {
        try {
            const urlPath = await convertBase64ToWebP(bannerRows[0].valor, 'banner.webp');
            if (urlPath) {
                await db.promise().query("UPDATE site_config SET valor = ? WHERE chave = 'banner_imagem'", [urlPath]);
                console.log('🖼️  Banner convertido ✅');
            }
        } catch (e) {
            console.error(`❌ Banner: ${e.message}`);
        }
    }

    console.log('\n✨ Migração concluída!');
    db.end();
}

migrar().catch(e => { console.error('Erro fatal:', e); db.end(); });
