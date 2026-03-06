const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

const queries = [
  "ALTER TABLE produtos ADD COLUMN destaque TINYINT(1) DEFAULT 0",
  "ALTER TABLE produtos ADD COLUMN promo_desconto DECIMAL(5,2) DEFAULT NULL",
  "ALTER TABLE produtos ADD COLUMN promo_tipo ENUM('porcentagem','fixo') DEFAULT 'porcentagem'",
  "ALTER TABLE produtos ADD COLUMN promo_inicio DATE DEFAULT NULL",
  "ALTER TABLE produtos ADD COLUMN promo_fim DATE DEFAULT NULL",
  `CREATE TABLE IF NOT EXISTS site_config (
    chave VARCHAR(100) PRIMARY KEY,
    valor LONGTEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('nome_loja','RETRO WAVE')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('footer_texto','Camisas retro de futebol com estilo único')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('instagram','')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('whatsapp','')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_titulo','')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_subtitulo','')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_imagem','')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_link','')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_ativo','0')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_animacao','flag')",
  "INSERT IGNORE INTO site_config (chave, valor) VALUES ('banner_cintilante','1')"
];

let i = 0;
function next() {
  if (i >= queries.length) {
    console.log('Todas as migrações aplicadas com sucesso!');
    db.end();
    return;
  }
  db.query(queries[i], (err) => {
    if (err && !err.message.includes('Duplicate')) {
      console.warn(`[${i+1}] WARN: ${err.message}`);
    } else {
      console.log(`[${i+1}] OK`);
    }
    i++;
    next();
  });
}

db.connect((err) => {
  if (err) { console.error('Erro de conexão:', err.message); process.exit(1); }
  console.log('Conectado. Executando migrações...');
  next();
});
