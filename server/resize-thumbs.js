/**
 * Redimensiona todos os WebP existentes em /uploads para 280px
 * Executa uma vez: node resize-thumbs.js
 */
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
// Pula banner — ele precisa de resolução maior (1200px)
const files = fs.readdirSync(UPLOADS_DIR).filter(f => f.endsWith('.webp') && f !== 'banner.webp');

console.log(`🔄 Redimensionando ${files.length} arquivos para 280px...\n`);

let ok = 0, err = 0;

(async () => {
    for (const file of files) {
        const filePath = path.join(UPLOADS_DIR, file);
        try {
            const buffer = fs.readFileSync(filePath);
            const resized = await sharp(buffer)
                .resize(280, 280, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 82 })
                .toBuffer();
            fs.writeFileSync(filePath, resized);
            ok++;
            process.stdout.write(`\r  ✅ ${ok}/${files.length} redimensionados`);
        } catch (e) {
            err++;
            console.error(`\n  ❌ ${file}: ${e.message}`);
        }
    }
    console.log(`\n\n✨ Concluído! ${ok} OK, ${err} erros.`);
})();
