const path = require('path');
const crypto = require('crypto');
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ═══════════════════════════════════════════════════════
// AUTH — JWT persistente (sobrevive ao restart)
// ═══════════════════════════════════════════════════════
const JWT_SECRET = process.env.JWT_SECRET || 'retrowave-jwt-secret-change-me-in-production';

function generateAdminToken(adminId) {
    return jwt.sign({ adminId, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (!token) return res.status(401).json({ error: 'Não autorizado' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.type !== 'admin') return res.status(401).json({ error: 'Não autorizado' });
        req.adminId = decoded.adminId;
        next();
    } catch {
        return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
    }
}

const app = express();

// Segurança: headers HTTP
app.use(helmet({ contentSecurityPolicy: false }));

// CORS restrito ao frontend
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, cb) => {
        // Permitir sem origin (Postman/mobile) e origins autorizadas
        if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
        cb(new Error('CORS bloqueado'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-admin-token', 'ngrok-skip-browser-warning']
}));

app.use(express.json({ limit: '50mb' }));

// ═══════════════════════════════════════════════════════
// EMAIL — Nodemailer
// ═══════════════════════════════════════════════════════
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || ''
  }
});

// Verificar conexão SMTP na inicialização
emailTransporter.verify()
  .then(() => console.log('✅ Email SMTP conectado com sucesso'))
  .catch(err => console.error('❌ Erro na conexão SMTP:', err.message, '\n   → Para Gmail, use uma Senha de App: https://myaccount.google.com/apppasswords'));

async function sendEmail(to, subject, html) {
  const from = process.env.EMAIL_USER;
  if (!from) throw new Error('EMAIL_USER not configured');
  const info = await emailTransporter.sendMail({ from: `"Retro Wave" <${from}>`, to, subject, html });
  console.log(`📧 Email enviado para ${to} — MessageId: ${info.messageId}`);
  return info;
}

function buildOrderEmailHtml(pedidoId, nome, itens, total, status, extraHtml = '') {
  const statusLabel = { aguardando: 'Aguardando Envio', concluido: 'Confirmado', preparando: 'Em preparação', enviado: 'Enviado', entregue: 'Entregue', cancelado: 'Cancelado' };
  const itemsHtml = itens.map(i =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${i.nome} (TAM ${i.tamanho}) × ${i.quantidade}</td><td style="text-align:right;padding:8px 0;border-bottom:1px solid #eee">R$ ${(parseFloat(i.preco_unitario) * i.quantidade).toFixed(2)}</td></tr>`
  ).join('');
  return `
    <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#111">
      <div style="background:#111;color:#fff;padding:32px 24px;text-align:center">
        <h1 style="margin:0;font-size:22px;letter-spacing:4px">RETRO WAVE</h1>
      </div>
      <div style="padding:32px 24px">
        <h2 style="font-size:16px;letter-spacing:2px">Olá, ${nome || 'cliente'}!</h2>
        <p style="color:#555">Seu pedido <strong>#${pedidoId}</strong> foi atualizado:</p>
        <div style="background:#f5f5f5;border-radius:8px;padding:16px 20px;margin:20px 0;font-size:14px;letter-spacing:1px">
          STATUS: <strong>${statusLabel[status] || status.toUpperCase()}</strong>
        </div>
        ${extraHtml}
        ${itens.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          ${itemsHtml}
          <tr><td style="padding-top:12px;font-weight:bold">TOTAL</td><td style="text-align:right;font-weight:bold;padding-top:12px">R$ ${parseFloat(total).toFixed(2)}</td></tr>
        </table>` : ''}
      </div>
      <div style="background:#f9f9f9;padding:20px 24px;text-align:center;font-size:12px;color:#888">
        © 2026 DC Foundry Digital — By Vitor Camillo
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════
// CONEXÃO COM O BANCO DE DADOS
// ═══════════════════════════════════════════════════════
const db = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'retrowave',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Testar conexão
db.getConnection((err, conn) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err.message);
        return;
    }
    console.log('Conectado ao MySQL — Retro Wave (Pool)');
    conn.release();
});

// ═══════════════════════════════════════════════════════
// MIDDLEWARE — Tracking de Visitantes (persistente no DB)
// ═══════════════════════════════════════════════════════
// Criar tabela de IPs diários se não existir
db.query(`CREATE TABLE IF NOT EXISTS visitantes_diarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_acesso DATE NOT NULL,
    ip_hash VARCHAR(64) NOT NULL,
    UNIQUE KEY uq_dia_ip (data_acesso, ip_hash)
)`);

// Estoque por tamanho (A5)
const stockCols = ['estoque_p', 'estoque_m', 'estoque_g', 'estoque_gg'];
stockCols.forEach(col => {
  db.query(`ALTER TABLE produtos ADD COLUMN ${col} INT DEFAULT -1`, (err) => {
    // Ignore ER_DUP_FIELDNAME — column already exists
  });
});

// Cupons de desconto (A6)
db.query(`CREATE TABLE IF NOT EXISTS cupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE NOT NULL,
    tipo ENUM('porcentagem','fixo') DEFAULT 'porcentagem',
    valor DECIMAL(10,2) NOT NULL,
    minimo DECIMAL(10,2) DEFAULT 0,
    usos_max INT DEFAULT 0,
    usos_atuais INT DEFAULT 0,
    ativo TINYINT DEFAULT 1,
    validade DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Avaliações de clientes (C8)
db.query(`CREATE TABLE IF NOT EXISTS avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    nota INT NOT NULL,
    comentario TEXT,
    aprovada TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
)`);

// Wishlist persistente
db.query(`CREATE TABLE IF NOT EXISTS wishlist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    produto_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_prod (usuario_id, produto_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
)`);

// Carrinho abandonado
db.query(`CREATE TABLE IF NOT EXISTS carrinhos_abandonados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    carrinho JSON NOT NULL,
    recuperado TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email (email)
)`);
// H-3: garantir unique key mesmo em tabelas já existentes
db.query(`ALTER TABLE carrinhos_abandonados ADD UNIQUE KEY IF NOT EXISTS uq_email (email)`, () => {});

// Colunas de rastreio nos pedidos
db.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS codigo_rastreio VARCHAR(100) DEFAULT NULL`, () => {});
db.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data_envio DATE DEFAULT NULL`, () => {});

// Anúncios / Promoções do site (aba Admin Promoções)
db.query(`CREATE TABLE IF NOT EXISTS anuncios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    subtitulo VARCHAR(255) DEFAULT '',
    cor_fundo VARCHAR(20) DEFAULT '#111',
    cor_texto VARCHAR(20) DEFAULT '#fff',
    link VARCHAR(500) DEFAULT '',
    ativo TINYINT DEFAULT 1,
    inicio DATE DEFAULT NULL,
    fim DATE DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

// Newsletter subscribers
db.query(`CREATE TABLE IF NOT EXISTS newsletter (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) DEFAULT '',
    ativo TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`);

app.use((req, res, next) => {
    // Apenas contar em rotas públicas (não admin/api internas)
    if (req.path.startsWith('/api/admin') || req.path.startsWith('/api/imagens')) return next();

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
    const hoje = new Date().toISOString().split('T')[0];

    // Tentar inserir — se já existe (UNIQUE), ignora silenciosamente
    db.query(
        'INSERT IGNORE INTO visitantes_diarios (data_acesso, ip_hash) VALUES (?, ?)',
        [hoje, ipHash],
        (err, result) => {
            // Se inseriu (affectedRows === 1), é visitante novo hoje
            if (!err && result && result.affectedRows === 1) {
                db.query(
                    `INSERT INTO metricas_acesso (data_acesso, visitantes_unicos, cliques_totais)
                     VALUES (?, 1, 0)
                     ON DUPLICATE KEY UPDATE visitantes_unicos = visitantes_unicos + 1`,
                    [hoje]
                );
            }
        }
    );
    next();
});

// ═══════════════════════════════════════════════════════
// ROTAS DA LOJA
// ═══════════════════════════════════════════════════════

// Listar Produtos (com busca opcional) — retorna contagem de imagens extras (não base64)
// Configurações públicas do site
app.get('/api/config', (req, res) => {
    db.query('SELECT chave, valor FROM site_config', (err, rows) => {
        if (err) return res.status(500).json({});
        const config = {};
        rows.forEach(r => { config[r.chave] = r.valor; });
        res.json(config);
    });
});

// Banner image (serve como binário)
app.get('/api/banner-image', (req, res) => {
    db.query("SELECT valor FROM site_config WHERE chave = 'banner_imagem'", (err, rows) => {
        if (err || !rows.length || !rows[0].valor) return res.status(404).send('');
        const base64 = rows[0].valor;
        const matches = base64.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return res.status(400).send('');
        const data = Buffer.from(matches[2], 'base64');
        res.set('Content-Type', matches[1]);
        res.set('Cache-Control', 'public, max-age=1800');
        res.send(data);
    });
});

app.get('/api/produtos', (req, res) => {
    const { liga, q } = req.query;
    let sql = `SELECT p.id, p.nome, p.liga, p.preco, p.descricao, p.cliques, p.vendas, p.created_at,
               p.destaque, p.promo_desconto, p.promo_tipo, p.promo_inicio, p.promo_fim,
               p.estoque_p, p.estoque_m, p.estoque_g, p.estoque_gg,
               (SELECT COUNT(*) FROM produto_imagens pi WHERE pi.produto_id = p.id) as imgCount FROM produtos p`;
    const params = [];
    const conditions = [];

    if (liga) {
        conditions.push('p.liga = ?');
        params.push(liga);
    }
    if (q) {
        conditions.push('(p.nome LIKE ? OR p.liga LIKE ?)');
        params.push(`%${q}%`, `%${q}%`);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY p.destaque DESC, p.id DESC';

    db.query(sql, params, (err, produtos) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar produtos' });
        // Filtrar promoções ativas e calcular preço com desconto
        const now = new Date().toISOString().split('T')[0];
        const result = produtos.map(p => {
            const promo = p.promo_desconto && p.promo_inicio && p.promo_fim &&
                          p.promo_inicio <= now && p.promo_fim >= now;
            let precoFinal = parseFloat(p.preco);
            let promoLabel = null;
            if (promo) {
                if (p.promo_tipo === 'porcentagem') {
                    precoFinal = precoFinal * (1 - parseFloat(p.promo_desconto) / 100);
                    promoLabel = `-${parseFloat(p.promo_desconto).toFixed(0)}%`;
                } else {
                    precoFinal = precoFinal - parseFloat(p.promo_desconto);
                    promoLabel = `-R$${parseFloat(p.promo_desconto).toFixed(0)}`;
                }
            }
            return { ...p, promoAtiva: !!promo, precoFinal: precoFinal.toFixed(2), promoLabel };
        });
        res.json(result);
    });
});

// Buscar imagens extras de um produto (sob demanda, quando abre o modal)
// Retorna apenas IDs e ordem — sem base64 (otimizado)
app.get('/api/produtos/:id/imagens', (req, res) => {
    const { id } = req.params;
    db.query(
        'SELECT id, ordem FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC',
        [id],
        (err, imagens) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar imagens' });
            res.json(imagens);
        }
    );
});

// Servir imagem extra como binário (igual ao thumb)
app.get('/api/imagens/:imgId/bin', (req, res) => {
    db.query('SELECT imagem FROM produto_imagens WHERE id = ?', [req.params.imgId], (err, rows) => {
        if (err || !rows.length || !rows[0].imagem) return res.status(404).send('');
        const base64 = rows[0].imagem;
        const matches = base64.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return res.status(400).send('');
        const data = Buffer.from(matches[2], 'base64');
        res.set('Content-Type', matches[1]);
        res.set('Cache-Control', 'public, max-age=3600');
        res.send(data);
    });
});

// Thumbnail de produto (serve imagem como binário para <img src>)
app.get('/api/produtos/:id/thumb', (req, res) => {
    db.query('SELECT imagem FROM produtos WHERE id = ?', [req.params.id], (err, rows) => {
        if (err || !rows.length || !rows[0].imagem) return res.status(404).send('');
        const base64 = rows[0].imagem;
        const matches = base64.match(/^data:(.+);base64,(.+)$/);
        if (!matches) return res.status(400).send('');
        const data = Buffer.from(matches[2], 'base64');
        res.set('Content-Type', matches[1]);
        res.set('Cache-Control', 'public, max-age=3600');
        res.send(data);
    });
});

// Registrar Clique
app.post('/api/clique/:id', (req, res) => {
    const { id } = req.params;
    const hoje = new Date().toISOString().split('T')[0];

    db.query('UPDATE produtos SET cliques = cliques + 1 WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao registrar clique' });

        db.query(
            `INSERT INTO metricas_acesso (data_acesso, cliques_totais)
             VALUES (?, 1)
             ON DUPLICATE KEY UPDATE cliques_totais = cliques_totais + 1`,
            [hoje]
        );
        res.json({ message: 'Clique registrado' });
    });
});

// Checkout (Login Invisível)
app.post('/api/checkout', (req, res) => {
    const { email, nome, endereco, carrinho, cupomCodigo } = req.body;

    if (!email || !nome || !endereco || !carrinho || carrinho.length === 0) {
        return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Validar itens do carrinho
    const itemIds = carrinho.map(i => parseInt(i.id)).filter(id => Number.isInteger(id) && id > 0);
    if (itemIds.length !== carrinho.length) {
        return res.status(400).json({ error: 'Carrinho inválido' });
    }

    // Buscar preços reais no banco (C-1: nunca confiar no total do cliente)
    db.query('SELECT id, nome, preco, promo_desconto, promo_tipo, promo_inicio, promo_fim FROM produtos WHERE id IN (?)', [itemIds], (err, produtos) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (produtos.length !== [...new Set(itemIds)].length) {
            return res.status(400).json({ error: 'Produto não encontrado' });
        }

        const precoMap = {};
        produtos.forEach(p => { precoMap[p.id] = p; });

        const hoje = new Date().toISOString().split('T')[0];
        let totalReal = 0;

        for (const item of carrinho) {
            const p = precoMap[item.id];
            if (!p) return res.status(400).json({ error: 'Produto inválido' });
            let preco = parseFloat(p.preco);
            const promoAtiva = p.promo_desconto && p.promo_inicio && p.promo_fim
                && p.promo_inicio <= hoje && p.promo_fim >= hoje;
            if (promoAtiva) {
                preco = p.promo_tipo === 'porcentagem'
                    ? preco * (1 - p.promo_desconto / 100)
                    : preco - p.promo_desconto;
            }
            totalReal += preco * (item.qtd || 1);
        }

        // Frete
        const FRETE = 29.90;
        const FRETE_GRATIS = 299.90;
        if (totalReal < FRETE_GRATIS) totalReal += FRETE;

        // Aplicar cupom (se informado, validar no banco)
        const aplicarCupomEProsseguir = (descontoCupom) => {
            const totalFinal = Math.max(0, totalReal - (descontoCupom || 0));
            processarCheckout(totalFinal);
        };

        if (cupomCodigo) {
            db.query('SELECT * FROM cupons WHERE codigo = ? AND ativo = 1', [cupomCodigo.toUpperCase().trim()], (err, cupons) => {
                let desconto = 0;
                if (!err && cupons.length > 0) {
                    const c = cupons[0];
                    const valido = (!c.validade || c.validade >= hoje)
                        && (c.usos_max <= 0 || c.usos_atuais < c.usos_max);
                    if (valido) {
                        desconto = c.tipo === 'porcentagem'
                            ? totalReal * (c.valor / 100)
                            : parseFloat(c.valor);
                        db.query('UPDATE cupons SET usos_atuais = usos_atuais + 1 WHERE codigo = ?', [c.codigo]);
                    }
                }
                aplicarCupomEProsseguir(desconto);
            });
        } else {
            aplicarCupomEProsseguir(0);
        }

        function processarCheckout(totalFinal) {
            // C-4: usar transaction para evitar sobrevenda
            db.getConnection((err, conn) => {
                if (err) return res.status(500).json({ error: 'Erro de conexão' });

                conn.beginTransaction(err => {
                    if (err) { conn.release(); return res.status(500).json({ error: 'Erro ao iniciar transação' }); }

                    // Verificar e decrementar estoque com lock
                    let estoqueOk = true;
                    let pendentes = carrinho.length;

                    const onEstoqueVerificado = (estoqueErro) => {
                        if (estoqueErro) {
                            return conn.rollback(() => { conn.release(); res.status(400).json({ error: estoqueErro }); });
                        }
                        pendentes--;
                        if (pendentes > 0) return;

                        // Upsert usuário
                        conn.query('SELECT id FROM usuarios WHERE email = ?', [email], (err, users) => {
                            if (err) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erro no servidor' }); });

                            const prosseguir = (userId) => {
                                conn.query('INSERT INTO pedidos (usuario_id, total, status) VALUES (?, ?, ?)', [userId, totalFinal.toFixed(2), 'aguardando'], (err, result) => {
                                    if (err) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erro ao criar pedido' }); });
                                    const pedidoId = result.insertId;

                                    const itemValues = carrinho.map(item => [
                                        pedidoId, item.id, item.qtd || 1, item.tamanho || 'M',
                                        (() => {
                                            const p = precoMap[item.id];
                                            let pr = parseFloat(p.preco);
                                            const pA = p.promo_desconto && p.promo_inicio && p.promo_fim && p.promo_inicio <= hoje && p.promo_fim >= hoje;
                                            if (pA) pr = p.promo_tipo === 'porcentagem' ? pr * (1 - p.promo_desconto / 100) : pr - p.promo_desconto;
                                            return pr.toFixed(2);
                                        })()
                                    ]);

                                    conn.query('INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, tamanho, preco_unitario) VALUES ?', [itemValues], (err) => {
                                        if (err) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erro ao inserir itens' }); });

                                        // Incrementar vendas
                                        const vendaPromises = carrinho.map(item => new Promise(resolve => {
                                            conn.query('UPDATE produtos SET vendas = vendas + ? WHERE id = ?', [item.qtd || 1, item.id], resolve);
                                        }));

                                        Promise.all(vendaPromises).then(() => {
                                            conn.commit(err => {
                                                if (err) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erro ao confirmar pedido' }); });
                                                conn.release();

                                                // Limpar carrinho abandonado
                                                db.query('UPDATE carrinhos_abandonados SET recuperado = 1 WHERE email = ?', [email]);

                                                // Email de confirmação (H-4: nomes vêm do banco, não do cliente)
                                                const itensEmail = carrinho.map(item => ({
                                                    nome: precoMap[item.id].nome,
                                                    tamanho: item.tamanho || 'M',
                                                    quantidade: item.qtd || 1,
                                                    preco_unitario: (() => {
                                                        const p = precoMap[item.id];
                                                        let pr = parseFloat(p.preco);
                                                        const pA = p.promo_desconto && p.promo_inicio && p.promo_fim && p.promo_inicio <= hoje && p.promo_fim >= hoje;
                                                        if (pA) pr = p.promo_tipo === 'porcentagem' ? pr * (1 - p.promo_desconto / 100) : pr - p.promo_desconto;
                                                        return pr.toFixed(2);
                                                    })()
                                                }));

                                                sendEmail(email, `Pedido #${pedidoId} — Retro Wave`,
                                                    buildOrderEmailHtml(pedidoId, nome, itensEmail, totalFinal, 'concluido'))
                                                    .catch(e => console.error('Email confirmação erro:', e.message));

                                                db.query('SELECT id, email, nome, endereco FROM usuarios WHERE id = ?', [userId], (err, rows) => {
                                                    const cliente = rows && rows[0] ? rows[0] : { id: userId, email, nome, endereco };
                                                    res.json({ success: true, pedidoId, cliente, total: totalFinal.toFixed(2) });
                                                });
                                            });
                                        });
                                    });
                                });
                            };

                            if (users.length > 0) {
                                prosseguir(users[0].id);
                            } else {
                                conn.query('INSERT INTO usuarios (email, nome, endereco) VALUES (?, ?, ?)', [email, nome, endereco], (err, result) => {
                                    if (err) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erro ao criar usuário' }); });
                                    prosseguir(result.insertId);
                                });
                            }
                        });
                    };

                    // Decrementar estoque com verificação (FOR UPDATE seria ideal mas callback hell — usamos série)
                    let i = 0;
                    const processarItem = () => {
                        if (i >= carrinho.length) return onEstoqueVerificado(null);
                        const item = carrinho[i++];
                        const tamCol = `estoque_${(item.tamanho || 'M').toLowerCase()}`;
                        if (!['estoque_p', 'estoque_m', 'estoque_g', 'estoque_gg'].includes(tamCol)) {
                            return onEstoqueVerificado('Tamanho inválido');
                        }
                        conn.query(
                            `UPDATE produtos SET ${tamCol} = ${tamCol} - ? WHERE id = ? AND (${tamCol} >= ? OR ${tamCol} = -1)`,
                            [item.qtd || 1, item.id, item.qtd || 1],
                            (err, result) => {
                                if (err) return onEstoqueVerificado('Erro ao verificar estoque');
                                if (result.affectedRows === 0) {
                                    return onEstoqueVerificado(`Estoque insuficiente para o tamanho ${(item.tamanho || 'M').toUpperCase()}`);
                                }
                                processarItem();
                            }
                        );
                    };
                    processarItem();
                });
            });
        }
    });
});

// ═══════════════════════════════════════════════════════
// ROTAS DO CLIENTE (Meus Pedidos)
// ═══════════════════════════════════════════════════════

// Buscar pedidos do cliente por email
app.get('/api/cliente/pedidos', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    db.query(
        `SELECT p.id, p.total, p.status, p.created_at,
                u.nome, u.email, u.endereco
         FROM pedidos p
         JOIN usuarios u ON p.usuario_id = u.id
         WHERE u.email = ?
         ORDER BY p.created_at DESC`,
        [email],
        (err, pedidos) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar pedidos' });
            if (pedidos.length === 0) return res.json([]);

            // Buscar itens de cada pedido
            const pedidoIds = pedidos.map(p => p.id);
            db.query(
                `SELECT ip.pedido_id, ip.quantidade, ip.tamanho, ip.preco_unitario, pr.nome, pr.liga
                 FROM itens_pedido ip
                 JOIN produtos pr ON ip.produto_id = pr.id
                 WHERE ip.pedido_id IN (?)`,
                [pedidoIds],
                (err, itens) => {
                    if (err) return res.json(pedidos);

                    const pedidosCompletos = pedidos.map(p => ({
                        ...p,
                        itens: itens.filter(i => i.pedido_id === p.id)
                    }));
                    res.json(pedidosCompletos);
                }
            );
        }
    );
});

// Buscar dados do cliente por email (para restaurar sessão)
app.get('/api/cliente/perfil', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    db.query('SELECT id, email, nome, endereco FROM usuarios WHERE email = ?', [email], (err, results) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (results.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
        res.json(results[0]);
    });
});

// ═══════════════════════════════════════════════════════
// WISHLIST PERSISTENTE
// ═══════════════════════════════════════════════════════
app.get('/api/cliente/wishlist', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    db.query(
        `SELECT w.produto_id FROM wishlist w
         JOIN usuarios u ON w.usuario_id = u.id
         WHERE u.email = ?`,
        [email],
        (err, rows) => {
            if (err) return res.status(500).json([]);
            res.json(rows.map(r => r.produto_id));
        }
    );
});

app.post('/api/cliente/wishlist', (req, res) => {
    const { email, produto_id } = req.body;
    if (!email || !produto_id) return res.status(400).json({ error: 'Dados incompletos' });
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], (err, users) => {
        if (err || !users.length) return res.status(404).json({ error: 'Cliente não encontrado' });
        db.query('INSERT IGNORE INTO wishlist (usuario_id, produto_id) VALUES (?, ?)',
            [users[0].id, produto_id],
            (err2) => {
                if (err2) return res.status(500).json({ error: 'Erro' });
                res.json({ success: true });
            });
    });
});

app.delete('/api/cliente/wishlist', (req, res) => {
    const { email, produto_id } = req.body;
    if (!email || !produto_id) return res.status(400).json({ error: 'Dados incompletos' });
    db.query('SELECT id FROM usuarios WHERE email = ?', [email], (err, users) => {
        if (err || !users.length) return res.status(404).json({ error: 'Cliente não encontrado' });
        db.query('DELETE FROM wishlist WHERE usuario_id = ? AND produto_id = ?',
            [users[0].id, produto_id],
            (err2) => {
                if (err2) return res.status(500).json({ error: 'Erro' });
                res.json({ success: true });
            });
    });
});

// ═══════════════════════════════════════════════════════
// CARRINHO ABANDONADO
// ═══════════════════════════════════════════════════════
app.post('/api/carrinho-abandonado', (req, res) => {
    const { email, carrinho } = req.body;
    if (!email || !carrinho || carrinho.length === 0) return res.status(400).json({ error: 'Dados incompletos' });
    db.query(
        `INSERT INTO carrinhos_abandonados (email, carrinho) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE carrinho = VALUES(carrinho), recuperado = 0`,
        [email, JSON.stringify(carrinho)],
        (err) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json({ success: true });
        }
    );
});

app.get('/api/carrinho-abandonado', (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    db.query(
        'SELECT carrinho, created_at FROM carrinhos_abandonados WHERE email = ? AND recuperado = 0 ORDER BY updated_at DESC LIMIT 1',
        [email],
        (err, rows) => {
            if (err || !rows.length) return res.json({ carrinho: null });
            try {
                res.json({ carrinho: JSON.parse(rows[0].carrinho), created_at: rows[0].created_at });
            } catch {
                res.json({ carrinho: null });
            }
        }
    );
});

app.put('/api/carrinho-abandonado/recuperar', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });
    db.query('UPDATE carrinhos_abandonados SET recuperado = 1 WHERE email = ?', [email], () => {
        res.json({ success: true });
    });
});

// ═══════════════════════════════════════════════════════
// AVALIAÇÕES PÚBLICAS (C8)
// ═══════════════════════════════════════════════════════
app.get('/api/produtos/:id/avaliacoes', (req, res) => {
    db.query(
        'SELECT id, nome, nota, comentario, foto, created_at FROM avaliacoes WHERE produto_id = ? AND aprovada = 1 ORDER BY created_at DESC LIMIT 20',
        [req.params.id],
        (err, rows) => {
            if (err) return res.status(500).json([]);
            res.json(rows);
        }
    );
});

app.post('/api/avaliacoes', (req, res) => {
    const { produto_id, nome, email, nota, comentario, foto } = req.body;
    if (!produto_id || !nome || !email || !nota || nota < 1 || nota > 5) {
        return res.status(400).json({ error: 'Dados inválidos' });
    }
    // Limit photo size to ~2MB in base64
    const fotoData = foto && foto.length < 3000000 ? foto : null;
    db.query(
        'INSERT INTO avaliacoes (produto_id, nome, email, nota, comentario, foto, aprovada) VALUES (?, ?, ?, ?, ?, ?, 0)',
        [produto_id, nome, email, nota, comentario || null, fotoData],
        (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao salvar avaliação' });
            res.json({ success: true, message: 'Avaliação enviada e aguardando aprovação' });
        }
    );
});

// ═══════════════════════════════════════════════════════
// VALIDAR CUPOM (A6)
// ═══════════════════════════════════════════════════════
app.post('/api/validar-cupom', (req, res) => {
    const { codigo, subtotal } = req.body;
    if (!codigo) return res.status(400).json({ error: 'Código obrigatório' });

    db.query('SELECT * FROM cupons WHERE codigo = ? AND ativo = 1', [codigo.toUpperCase().trim()], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (rows.length === 0) return res.json({ valid: false, message: 'Cupom inválido ou expirado' });

        const cupom = rows[0];
        const hoje = new Date().toISOString().split('T')[0];
        if (cupom.validade && cupom.validade < hoje) return res.json({ valid: false, message: 'Cupom expirado' });
        if (cupom.usos_max > 0 && cupom.usos_atuais >= cupom.usos_max) return res.json({ valid: false, message: 'Cupom esgotado' });
        if (subtotal < parseFloat(cupom.minimo)) return res.json({ valid: false, message: `Mínimo de R$${parseFloat(cupom.minimo).toFixed(2)}` });

        res.json({
            valid: true,
            cupom: {
                codigo: cupom.codigo,
                tipo: cupom.tipo,
                valor: parseFloat(cupom.valor)
            }
        });
    });
});

// ═══════════════════════════════════════════════════════
// ROTAS DO ADMIN
// ═══════════════════════════════════════════════════════

// Rate limit no login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 10,
    message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Login Admin (com bcrypt)
app.post('/api/admin/login', loginLimiter, (req, res) => {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) return res.status(400).json({ error: 'Dados incompletos' });

    db.query('SELECT id, senha FROM admins WHERE usuario = ?', [usuario], async (err, results) => {
        if (err) return res.status(500).json({ error: 'Erro no servidor' });
        if (results.length === 0) return res.status(401).json({ error: 'Credenciais invalidas' });

        try {
            const match = await bcrypt.compare(senha, results[0].senha);
            if (match) {
                const token = generateAdminToken(results[0].id);
                res.json({ success: true, adminId: results[0].id, token });
            } else {
                res.status(401).json({ error: 'Credenciais invalidas' });
            }
        } catch {
            res.status(500).json({ error: 'Erro na verificação' });
        }
    });
});

// Middleware de autenticação para todas as rotas admin (exceto login)
app.use('/api/admin', (req, res, next) => {
    // Permitir login sem token
    if (req.path === '/login' && req.method === 'POST') return next();
    requireAdmin(req, res, next);
});

// Metricas Completas
app.get('/api/admin/stats', (req, res) => {
    const stats = {};

    db.query('SELECT SUM(total) as receita, COUNT(*) as totalPedidos FROM pedidos', (err, r1) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        stats.receitaTotal = r1[0].receita || 0;
        stats.totalPedidos = r1[0].totalPedidos || 0;

        db.query('SELECT SUM(valor) as despesas FROM despesas', (err, r2) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            stats.despesasTotal = (r2[0] && r2[0].despesas) || 0;

            db.query('SELECT id, nome, liga, cliques, vendas FROM produtos ORDER BY cliques DESC LIMIT 5', (err, r3) => {
                if (err) return res.status(500).json({ error: 'Erro' });
                stats.maisClicadas = r3 || [];

                db.query('SELECT id, nome, liga, cliques, vendas FROM produtos ORDER BY vendas DESC LIMIT 5', (err, r4) => {
                    if (err) return res.status(500).json({ error: 'Erro' });
                    stats.maisVendidas = r4 || [];

                    db.query('SELECT COUNT(*) as total FROM usuarios', (err, r5) => {
                        if (err) return res.status(500).json({ error: 'Erro' });
                        stats.totalClientes = (r5[0] && r5[0].total) || 0;

                        db.query(
                            `SELECT COALESCE(SUM(visitantes_unicos), 0) as visitantes,
                                    COALESCE(SUM(cliques_totais), 0) as cliques
                             FROM metricas_acesso`,
                            (err, r6) => {
                                if (err) return res.status(500).json({ error: 'Erro' });
                                stats.totalVisitantes = (r6[0] && r6[0].visitantes) || 0;
                                stats.totalCliquesGeral = (r6[0] && r6[0].cliques) || 0;
                                stats.taxaConversao = stats.totalVisitantes > 0
                                    ? ((stats.totalClientes / stats.totalVisitantes) * 100).toFixed(1)
                                    : '0.0';
                                res.json(stats);
                            }
                        );
                    });
                });
            });
        });
    });
});

// CRUD Produtos (Admin - com imagens)
app.get('/api/admin/produtos', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let whereClause = '';
    const params = [];
    if (search) {
        whereClause = 'WHERE nome LIKE ? OR liga LIKE ?';
        params.push(`%${search}%`, `%${search}%`);
    }

    db.query(`SELECT COUNT(*) as total FROM produtos ${whereClause}`, params, (err, countRows) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        const totalItems = countRows[0].total;
        const totalPages = Math.ceil(totalItems / limit);

        db.query(`SELECT id, nome, liga, preco, descricao, cliques, vendas, created_at, destaque, promo_desconto, promo_tipo, promo_inicio, promo_fim, estoque_p, estoque_m, estoque_g, estoque_gg FROM produtos ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`, [...params, limit, offset], (err, produtos) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (produtos.length === 0) return res.json({ produtos: [], page, totalPages, totalItems });

        const ids = produtos.map(p => p.id);
        db.query(
            'SELECT produto_id, COUNT(*) as total FROM produto_imagens WHERE produto_id IN (?) GROUP BY produto_id',
            [ids],
            (err2, counts) => {
                const countMap = {};
                if (!err2 && counts) counts.forEach(c => { countMap[c.produto_id] = c.total; });

                db.query('SELECT id, LEFT(imagem, 100) as img_preview FROM produtos WHERE id IN (?)', [ids], (err3, previews) => {
                    const previewMap = {};
                    if (!err3 && previews) previews.forEach(p => { previewMap[p.id] = p.img_preview; });

                    const result = produtos.map(p => ({
                        ...p,
                        imgCount: (countMap[p.id] || 0) + 1,
                        hasImage: !!previewMap[p.id]
                    }));
                    res.json({ produtos: result, page, totalPages, totalItems });
                });
            }
        );
    });
    });
});

// Buscar produto completo com todas as imagens (Admin - edição)
app.get('/api/admin/produtos/:id', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM produtos WHERE id = ?', [id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        if (rows.length === 0) return res.status(404).json({ error: 'Produto não encontrado' });

        const produto = rows[0];
        db.query(
            'SELECT id, imagem, ordem FROM produto_imagens WHERE produto_id = ? ORDER BY ordem ASC',
            [id],
            (err2, imagens) => {
                produto.imagens = err2 ? [] : imagens;
                res.json(produto);
            }
        );
    });
});

app.post('/api/admin/produtos', (req, res) => {
    const { nome, liga, preco, imagem, descricao, imagensExtras, estoque_p, estoque_m, estoque_g, estoque_gg } = req.body;
    if (!nome || !liga || !preco) return res.status(400).json({ error: 'Nome, liga e preço são obrigatórios' });

    // H-1: incluir campos destaque e promo no INSERT
    const destaque = req.body.destaque ? 1 : 0;
    const promo_desconto = req.body.promo_desconto || null;
    const promo_tipo = req.body.promo_tipo || 'porcentagem';
    const promo_inicio = req.body.promo_inicio || null;
    const promo_fim = req.body.promo_fim || null;
    const custo = parseFloat(req.body.custo) || 0;

    db.query(
        'INSERT INTO produtos (nome, liga, preco, imagem, descricao, destaque, promo_desconto, promo_tipo, promo_inicio, promo_fim, estoque_p, estoque_m, estoque_g, estoque_gg, custo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [nome, liga, preco, imagem || '', descricao || null, destaque, promo_desconto, promo_tipo, promo_inicio, promo_fim, estoque_p ?? 0, estoque_m ?? 0, estoque_g ?? 0, estoque_gg ?? 0, custo], (err, result) => {
            if (err) return res.status(500).json({ error: 'Erro ao cadastrar' });
            const produtoId = result.insertId;

            // Inserir imagens extras se houver
            if (imagensExtras && imagensExtras.length > 0) {
                const values = imagensExtras.map((img, i) => [produtoId, img, i]);
                db.query('INSERT INTO produto_imagens (produto_id, imagem, ordem) VALUES ?', [values], (err2) => {
                    if (err2) console.error('Erro ao inserir imagens extras:', err2.message);
                    res.json({ success: true, id: produtoId });
                });
            } else {
                res.json({ success: true, id: produtoId });
            }
        });
});

app.put('/api/admin/produtos/:id', (req, res) => {
    const { id } = req.params;
    const { nome, liga, preco, imagem, descricao } = req.body;
    const fields = [];
    const values = [];

    if (nome !== undefined) { fields.push('nome = ?'); values.push(nome); }
    if (liga !== undefined) { fields.push('liga = ?'); values.push(liga); }
    if (preco !== undefined) { fields.push('preco = ?'); values.push(preco); }
    if (imagem !== undefined) { fields.push('imagem = ?'); values.push(imagem); }
    if (descricao !== undefined) { fields.push('descricao = ?'); values.push(descricao); }
    if (req.body.destaque !== undefined) { fields.push('destaque = ?'); values.push(req.body.destaque ? 1 : 0); }
    if (req.body.promo_desconto !== undefined) { fields.push('promo_desconto = ?'); values.push(req.body.promo_desconto || null); }
    if (req.body.promo_tipo !== undefined) { fields.push('promo_tipo = ?'); values.push(req.body.promo_tipo); }
    if (req.body.promo_inicio !== undefined) { fields.push('promo_inicio = ?'); values.push(req.body.promo_inicio || null); }
    if (req.body.promo_fim !== undefined) { fields.push('promo_fim = ?'); values.push(req.body.promo_fim || null); }
    if (req.body.estoque_p !== undefined) { fields.push('estoque_p = ?'); values.push(req.body.estoque_p); }
    if (req.body.estoque_m !== undefined) { fields.push('estoque_m = ?'); values.push(req.body.estoque_m); }
    if (req.body.estoque_g !== undefined) { fields.push('estoque_g = ?'); values.push(req.body.estoque_g); }
    if (req.body.estoque_gg !== undefined) { fields.push('estoque_gg = ?'); values.push(req.body.estoque_gg); }
    if (req.body.custo !== undefined) { fields.push('custo = ?'); values.push(parseFloat(req.body.custo) || 0); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo' });
    values.push(id);

    db.query(`UPDATE produtos SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
        res.json({ success: true });
    });
});

app.delete('/api/admin/produtos/:id', (req, res) => {
    const { id } = req.params;
    // produto_imagens deleted by CASCADE
    db.query('DELETE FROM itens_pedido WHERE produto_id = ?', [id], () => {
        db.query('DELETE FROM produtos WHERE id = ?', [id], (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao deletar' });
            res.json({ success: true });
        });
    });
});

// ═══════════════════════════════════════════════════════
// ROTAS DE IMAGENS DO PRODUTO (Admin)
// ═══════════════════════════════════════════════════════

// Adicionar imagem extra a um produto
app.post('/api/admin/produtos/:id/imagens', (req, res) => {
    const { id } = req.params;
    const { imagem } = req.body;
    if (!imagem) return res.status(400).json({ error: 'Imagem obrigatória' });

    // Pegar a próxima ordem
    db.query('SELECT COALESCE(MAX(ordem), -1) + 1 as nextOrdem FROM produto_imagens WHERE produto_id = ?', [id], (err, rows) => {
        const ordem = rows ? rows[0].nextOrdem : 0;
        db.query('INSERT INTO produto_imagens (produto_id, imagem, ordem) VALUES (?, ?, ?)', [id, imagem, ordem], (err2, result) => {
            if (err2) return res.status(500).json({ error: 'Erro ao adicionar imagem' });
            res.json({ success: true, id: result.insertId, ordem });
        });
    });
});

// Deletar imagem extra
app.delete('/api/admin/imagens/:imgId', (req, res) => {
    const { imgId } = req.params;
    db.query('DELETE FROM produto_imagens WHERE id = ?', [imgId], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao deletar imagem' });
        res.json({ success: true });
    });
});

// Reordenar imagens de um produto
app.put('/api/admin/produtos/:id/imagens/reorder', (req, res) => {
    const { id } = req.params;
    const { ordens } = req.body; // Array de { id: imgId, ordem: novaOrdem }
    if (!ordens || !Array.isArray(ordens)) return res.status(400).json({ error: 'Dados inválidos' });

    let done = 0;
    ordens.forEach(item => {
        db.query('UPDATE produto_imagens SET ordem = ? WHERE id = ? AND produto_id = ?',
            [item.ordem, item.id, id], () => {
                done++;
                if (done === ordens.length) res.json({ success: true });
            });
    });
    if (ordens.length === 0) res.json({ success: true });
});

// Definir imagem principal do produto (trocar a imagem da tabela produtos)
app.put('/api/admin/produtos/:id/imagem-principal', (req, res) => {
    const { id } = req.params;
    const { imagem } = req.body;
    if (!imagem) return res.status(400).json({ error: 'Imagem obrigatória' });

    db.query('UPDATE produtos SET imagem = ? WHERE id = ?', [imagem, id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar imagem principal' });
        res.json({ success: true });
    });
});

// CRUD Despesas
app.get('/api/admin/despesas', (req, res) => {
    db.query('SELECT * FROM despesas ORDER BY data_despesa DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json(results);
    });
});

app.post('/api/admin/despesas', (req, res) => {
    const { descricao, valor, data_despesa } = req.body;
    db.query('INSERT INTO despesas (descricao, valor, data_despesa) VALUES (?, ?, ?)',
        [descricao, valor, data_despesa || new Date()], (err, result) => {
            if (err) return res.status(500).json({ error: 'Erro ao cadastrar despesa' });
            res.json({ success: true, id: result.insertId });
        });
});

app.put('/api/admin/despesas/:id', (req, res) => {
    const { id } = req.params;
    const { descricao, valor, data_despesa } = req.body;
    db.query('UPDATE despesas SET descricao = ?, valor = ?, data_despesa = ? WHERE id = ?',
        [descricao, valor, data_despesa, id], (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar' });
            res.json({ success: true });
        });
});

app.delete('/api/admin/despesas/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM despesas WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao deletar' });
        res.json({ success: true });
    });
});

// Pedidos recentes (com rastreio e data_envio)
app.get('/api/admin/pedidos', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    db.query(
        `SELECT p.id, p.total, p.status, p.created_at, p.codigo_rastreio, p.data_envio,
                u.nome, u.email, u.endereco
         FROM pedidos p LEFT JOIN usuarios u ON p.usuario_id = u.id
         ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
        [limit, offset],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json(results);
        }
    );
});

// Atualizar status do pedido (Admin)
app.put('/api/admin/pedidos/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const statusValidos = ['aguardando', 'preparando', 'enviado', 'entregue', 'cancelado'];
    if (!statusValidos.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }
    db.query('UPDATE pedidos SET status = ? WHERE id = ?', [status, id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao atualizar status' });

        // Buscar rastreio + dados cliente para email
        db.query(
            `SELECT p.total, p.codigo_rastreio, p.data_envio, u.email, u.nome
             FROM pedidos p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = ?`,
            [id],
            (err2, rows) => {
                if (!err2 && rows.length > 0) {
                    const { email, nome, total, codigo_rastreio, data_envio } = rows[0];
                    // Email especial para "enviado" com código de rastreio
                    let assunto = `Atualização do Pedido #${id} — Retro Wave`;
                    let extra = '';
                    if (status === 'enviado' && codigo_rastreio) {
                        assunto = `Seu Pedido #${id} foi enviado! — Retro Wave`;
                        const dtEnvio = data_envio ? new Date(data_envio).toLocaleDateString('pt-BR') : null;
                        extra = `
                            <div style="background:#f0f9f0;border:1px solid #4caf50;border-radius:8px;padding:16px 20px;margin:20px 0">
                                <p style="margin:0 0 8px;font-weight:bold;color:#2e7d32">📦 Código de Rastreio:</p>
                                <p style="margin:0;font-size:18px;font-family:monospace;letter-spacing:2px">${codigo_rastreio}</p>
                                ${dtEnvio ? `<p style="margin:8px 0 0;font-size:12px;color:#555">Enviado em: ${dtEnvio}</p>` : ''}
                                <a href="https://rastreamento.correios.com.br/app/index.php?objetos=${codigo_rastreio}"
                                   style="display:inline-block;margin-top:12px;background:#2e7d32;color:#fff;padding:8px 16px;border-radius:4px;text-decoration:none;font-size:12px;letter-spacing:1px">
                                   RASTREAR PELO SITE DOS CORREIOS
                                </a>
                            </div>`;
                    }
                    // Injetar extra no email
                    const html = buildOrderEmailHtml(id, nome, [], total, status, extra);
                    sendEmail(email, assunto, html)
                        .catch(e => console.error('Email status erro:', e.message));
                }
            }
        );
        res.json({ success: true });
    });
});

// Atualizar código de rastreio e data de envio (Admin)
app.put('/api/admin/pedidos/:id/rastreio', (req, res) => {
    const { id } = req.params;
    const { codigo_rastreio, data_envio } = req.body;
    db.query(
        'UPDATE pedidos SET codigo_rastreio = ?, data_envio = ? WHERE id = ?',
        [codigo_rastreio || null, data_envio || null, id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao salvar rastreio' });
            res.json({ success: true });
        }
    );
});

// ═══════════════════════════════════════════════════════
// ADMIN — CONFIGURAÇÕES DO SITE
// ═══════════════════════════════════════════════════════
app.get('/api/admin/config', (req, res) => {
    db.query('SELECT chave, valor FROM site_config', (err, rows) => {
        if (err) return res.status(500).json({});
        const config = {};
        rows.forEach(r => { config[r.chave] = r.valor; });
        res.json(config);
    });
});

app.put('/api/admin/config', (req, res) => {
    const entries = Object.entries(req.body);
    if (entries.length === 0) return res.status(400).json({ error: 'Nada para salvar' });
    let done = 0;
    entries.forEach(([chave, valor]) => {
        db.query('INSERT INTO site_config (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = ?',
            [chave, valor, valor], () => {
                done++;
                if (done === entries.length) res.json({ success: true });
            });
    });
});

// Toggle destaque rápido
app.put('/api/admin/produtos/:id/destaque', (req, res) => {
    const { id } = req.params;
    db.query('UPDATE produtos SET destaque = NOT destaque WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ success: true });
    });
});

// ═══════════════════════════════════════════════════════
// DUPLICAR PRODUTO (A4)
// ═══════════════════════════════════════════════════════
app.post('/api/admin/produtos/:id/duplicar', (req, res) => {
    const { id } = req.params;
    db.query('SELECT * FROM produtos WHERE id = ?', [id], (err, rows) => {
        if (err || !rows.length) return res.status(404).json({ error: 'Produto não encontrado' });
        const p = rows[0];
        db.query(
            'INSERT INTO produtos (nome, liga, preco, imagem, descricao, destaque, promo_desconto, promo_tipo, promo_inicio, promo_fim, estoque_p, estoque_m, estoque_g, estoque_gg) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [`${p.nome} (CÓPIA)`, p.liga, p.preco, p.imagem, p.descricao, 0, null, null, null, null, p.estoque_p, p.estoque_m, p.estoque_g, p.estoque_gg],
            (err2, result) => {
                if (err2) return res.status(500).json({ error: 'Erro ao duplicar' });
                const newId = result.insertId;
                // Copiar imagens extras
                db.query('SELECT imagem, ordem FROM produto_imagens WHERE produto_id = ?', [id], (err3, imgs) => {
                    if (!err3 && imgs.length > 0) {
                        const vals = imgs.map(img => [newId, img.imagem, img.ordem]);
                        db.query('INSERT INTO produto_imagens (produto_id, imagem, ordem) VALUES ?', [vals]);
                    }
                    res.json({ success: true, id: newId });
                });
            }
        );
    });
});

// ═══════════════════════════════════════════════════════
// CUPONS CRUD (A6)
// ═══════════════════════════════════════════════════════
app.get('/api/admin/cupons', (req, res) => {
    db.query('SELECT * FROM cupons ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

app.post('/api/admin/cupons', (req, res) => {
    const { codigo, tipo, valor, minimo, usos_max, validade } = req.body;
    if (!codigo || !valor) return res.status(400).json({ error: 'Código e valor são obrigatórios' });
    db.query(
        'INSERT INTO cupons (codigo, tipo, valor, minimo, usos_max, validade) VALUES (?, ?, ?, ?, ?, ?)',
        [codigo.toUpperCase().trim(), tipo || 'porcentagem', valor, minimo || 0, usos_max || 0, validade || null],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Código já existe' });
                return res.status(500).json({ error: 'Erro ao criar cupom' });
            }
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.put('/api/admin/cupons/:id', (req, res) => {
    const { id } = req.params;
    const { codigo, tipo, valor, minimo, usos_max, validade, ativo } = req.body;
    db.query(
        'UPDATE cupons SET codigo=?, tipo=?, valor=?, minimo=?, usos_max=?, validade=?, ativo=? WHERE id=?',
        [codigo?.toUpperCase().trim(), tipo, valor, minimo || 0, usos_max || 0, validade || null, ativo ? 1 : 0, id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json({ success: true });
        }
    );
});

app.delete('/api/admin/cupons/:id', (req, res) => {
    db.query('DELETE FROM cupons WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ success: true });
    });
});

// ═══════════════════════════════════════════════════════
// HISTÓRICO DE MÉTRICAS (A2/A8)
// ═══════════════════════════════════════════════════════
app.get('/api/admin/stats/historico', (req, res) => {
    const dias = parseInt(req.query.dias) || 30;
    const sql = `
        SELECT
            d.dia,
            COALESCE(m.visitantes_unicos, 0) as visitantes,
            COALESCE(m.cliques_totais, 0) as cliques,
            COALESCE(p.receita, 0) as receita,
            COALESCE(p.pedidos, 0) as pedidos
        FROM (
            SELECT DATE_SUB(CURDATE(), INTERVAL n DAY) as dia
            FROM (
                SELECT a.N + b.N * 10 as n
                FROM (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a
                CROSS JOIN (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
            ) nums
            WHERE n < ?
        ) d
        LEFT JOIN metricas_acesso m ON m.data_acesso = d.dia
        LEFT JOIN (
            SELECT DATE(created_at) as dia, SUM(total) as receita, COUNT(*) as pedidos
            FROM pedidos GROUP BY DATE(created_at)
        ) p ON p.dia = d.dia
        ORDER BY d.dia ASC`;
    db.query(sql, [dias], (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// Stats com filtro de período (A8)
app.get('/api/admin/stats/periodo', (req, res) => {
    const { inicio, fim } = req.query;
    if (!inicio || !fim) return res.status(400).json({ error: 'inicio e fim obrigatórios' });

    const stats = {};
    db.query('SELECT COALESCE(SUM(total),0) as receita, COUNT(*) as pedidos FROM pedidos WHERE DATE(created_at) BETWEEN ? AND ?', [inicio, fim], (err, r1) => {
        if (err) return res.status(500).json({});
        stats.receita = r1[0].receita;
        stats.pedidos = r1[0].pedidos;
        db.query('SELECT COALESCE(SUM(valor),0) as despesas FROM despesas WHERE data_despesa BETWEEN ? AND ?', [inicio, fim], (err, r2) => {
            stats.despesas = r2?.[0]?.despesas || 0;
            db.query('SELECT COALESCE(SUM(visitantes_unicos),0) as visitantes, COALESCE(SUM(cliques_totais),0) as cliques FROM metricas_acesso WHERE data_acesso BETWEEN ? AND ?', [inicio, fim], (err, r3) => {
                stats.visitantes = r3?.[0]?.visitantes || 0;
                stats.cliques = r3?.[0]?.cliques || 0;
                res.json(stats);
            });
        });
    });
});

// ═══════════════════════════════════════════════════════
// AVALIAÇÕES ADMIN (C8)
// ═══════════════════════════════════════════════════════
app.get('/api/admin/avaliacoes', (req, res) => {
    db.query(
        `SELECT a.*, p.nome as produto_nome FROM avaliacoes a
         LEFT JOIN produtos p ON a.produto_id = p.id
         ORDER BY a.created_at DESC LIMIT 50`,
        (err, rows) => {
            if (err) return res.status(500).json([]);
            res.json(rows);
        }
    );
});

app.put('/api/admin/avaliacoes/:id/aprovar', (req, res) => {
    db.query('UPDATE avaliacoes SET aprovada = NOT aprovada WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ success: true });
    });
});

app.delete('/api/admin/avaliacoes/:id', (req, res) => {
    db.query('DELETE FROM avaliacoes WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ success: true });
    });
});

// ═══════════════════════════════════════════════════════
// GEMINI AI — Proxy (protege a API key) com fallback automático
// ═══════════════════════════════════════════════════════
const GEMINI_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash'];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

async function callGemini(messages) {
    for (const model of GEMINI_MODELS) {
        const url = `${GEMINI_BASE}/${model}:generateContent`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': GEMINI_KEY
            },
            body: JSON.stringify({ contents: messages })
        });

        if (response.status === 503 || response.status === 429) {
            console.warn(`Gemini ${model}: ${response.status}, tentando fallback...`);
            continue;
        }

        const data = await response.json();
        if (!response.ok) {
            return { error: true, status: response.status, data };
        }
        return { error: false, data };
    }
    return { error: true, status: 503, data: { error: { message: 'Todos os modelos indisponíveis no momento' } } };
}

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Mensagens inválidas' });
        }
        if (!GEMINI_KEY) {
            return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
        }

        const result = await callGemini(messages);

        if (result.error) {
            console.error('Gemini API error:', result.data);
            return res.status(result.status).json({ error: result.data?.error?.message || 'Erro na API Gemini' });
        }

        const text = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Desculpe, não consegui gerar uma resposta.';
        res.json({ reply: text });
    } catch (err) {
        console.error('Chat proxy error:', err.message);
        res.status(500).json({ error: 'Erro interno ao processar chat' });
    }
});

// ═══════════════════════════════════════════════════════
// NEWSLETTER
// ═══════════════════════════════════════════════════════

// Inscrição pública
app.post('/api/newsletter', (req, res) => {
    const { email, nome } = req.body;
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Email inválido' });
    db.query(
        'INSERT INTO newsletter (email, nome) VALUES (?, ?) ON DUPLICATE KEY UPDATE ativo = 1, nome = VALUES(nome)',
        [email.trim().toLowerCase(), (nome || '').trim()],
        (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao cadastrar' });
            res.json({ success: true });
        }
    );
});

// Admin: listar inscritos
app.get('/api/admin/newsletter', (req, res) => {
    db.query('SELECT * FROM newsletter ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// Admin: deletar inscrito
app.delete('/api/admin/newsletter/:id', (req, res) => {
    db.query('DELETE FROM newsletter WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ success: true });
    });
});

// Admin: enviar email em massa
app.post('/api/admin/newsletter/enviar', async (req, res) => {
    const { assunto, conteudo } = req.body;
    if (!assunto || !conteudo) return res.status(400).json({ error: 'Assunto e conteúdo são obrigatórios' });

    db.query('SELECT email FROM newsletter WHERE ativo = 1', async (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro ao buscar inscritos' });
        if (rows.length === 0) return res.status(400).json({ error: 'Nenhum inscrito ativo' });

        const html = `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#111">
                <div style="background:#111;color:#fff;padding:32px 24px;text-align:center">
                    <h1 style="margin:0;font-size:22px;letter-spacing:4px">RETRO WAVE</h1>
                </div>
                <div style="padding:32px 24px;line-height:1.7;font-size:14px">
                    ${conteudo.replace(/\n/g, '<br/>')}
                </div>
                <div style="background:#f9f9f9;padding:20px 24px;text-align:center;font-size:12px;color:#888">
                    © 2026 DC Foundry Digital — By Vitor Camillo<br/>
                    <small>Você recebeu este email por estar inscrito na newsletter da Retro Wave.</small>
                </div>
            </div>
        `;

        let enviados = 0;
        let erros = 0;
        let lastError = '';

        // M-3: enviar em batches paralelos para não bloquear o event loop
        const BATCH_SIZE = 20;
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const batch = rows.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(
                batch.map(row => sendEmail(row.email, assunto, html)
                    .then(() => console.log(`Newsletter enviada para: ${row.email}`))
                )
            );
            results.forEach((r, idx) => {
                if (r.status === 'fulfilled') { enviados++; }
                else { erros++; lastError = r.reason?.message || 'Erro desconhecido'; console.error(`Erro ao enviar para ${batch[idx].email}:`, lastError); }
            });
        }
        res.json({ success: enviados > 0, enviados, erros, total: rows.length, lastError: erros > 0 ? lastError : undefined });
    });
});

// ═══════════════════════════════════════════════════════
// TESTE DE EMAIL (Admin)
// ═══════════════════════════════════════════════════════
app.post('/api/admin/email/test', requireAdmin, async (req, res) => {
    const { destinatario } = req.body;
    if (!destinatario || !destinatario.includes('@')) return res.status(400).json({ error: 'Email de destino inválido' });
    try {
        await sendEmail(destinatario, 'Teste — Retro Wave', `
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;color:#111">
                <div style="background:#111;color:#fff;padding:32px 24px;text-align:center">
                    <h1 style="margin:0;font-size:22px;letter-spacing:4px">RETRO WAVE</h1>
                </div>
                <div style="padding:32px 24px;text-align:center">
                    <h2 style="font-size:16px;letter-spacing:2px">✅ Email configurado com sucesso!</h2>
                    <p style="color:#555">Se você está lendo isso, o envio de emails está funcionando corretamente.</p>
                </div>
                <div style="background:#f9f9f9;padding:20px 24px;text-align:center;font-size:12px;color:#888">
                    © 2026 DC Foundry Digital — By Vitor Camillo
                </div>
            </div>
        `);
        res.json({ success: true, message: `Email de teste enviado para ${destinatario}` });
    } catch (err) {
        console.error('Erro ao enviar email de teste:', err.message);
        res.status(500).json({ error: `Falha ao enviar: ${err.message}` });
    }
});

// ═══════════════════════════════════════════════════════
// PRODUTOS RELACIONADOS (pública)
// ═══════════════════════════════════════════════════════
app.get('/api/produtos/:id/relacionados', (req, res) => {
    const id = parseInt(req.params.id);
    if (!id) return res.json([]);
    db.query('SELECT liga FROM produtos WHERE id = ?', [id], (err, rows) => {
        if (err || !rows.length) return res.json([]);
        const liga = rows[0].liga;
        const hoje = new Date().toISOString().split('T')[0];
        db.query(
            `SELECT id, nome, preco, liga, imagem, promo_desconto, promo_tipo, promo_inicio, promo_fim,
                    estoque_p, estoque_m, estoque_g, estoque_gg
             FROM produtos
             WHERE liga = ? AND id != ?
             ORDER BY cliques DESC, id DESC
             LIMIT 4`,
            [liga, id],
            (err2, produtos) => {
                if (err2) return res.json([]);
                const result = produtos.map(p => {
                    const promoAtiva = p.promo_desconto && p.promo_inicio && p.promo_fim
                        && p.promo_inicio <= hoje && p.promo_fim >= hoje;
                    let precoFinal = parseFloat(p.preco);
                    if (promoAtiva) {
                        precoFinal = p.promo_tipo === 'porcentagem'
                            ? precoFinal * (1 - p.promo_desconto / 100)
                            : precoFinal - p.promo_desconto;
                    }
                    return { ...p, promoAtiva, precoFinal: precoFinal.toFixed(2) };
                });
                res.json(result);
            }
        );
    });
});

// ═══════════════════════════════════════════════════════
// ESTOQUE BAIXO (admin)
// ═══════════════════════════════════════════════════════
app.get('/api/admin/produtos/estoque-baixo', requireAdmin, (req, res) => {
    const limite = Math.min(parseInt(req.query.limite) || 20, 100);
    db.query(
        `SELECT id, nome, liga, estoque_p, estoque_m, estoque_g, estoque_gg,
                LEAST(
                    CASE WHEN estoque_p >= 0 THEN estoque_p ELSE 9999 END,
                    CASE WHEN estoque_m >= 0 THEN estoque_m ELSE 9999 END,
                    CASE WHEN estoque_g >= 0 THEN estoque_g ELSE 9999 END,
                    CASE WHEN estoque_gg >= 0 THEN estoque_gg ELSE 9999 END
                ) AS menor_estoque
         FROM produtos
         WHERE (estoque_p >= 0 OR estoque_m >= 0 OR estoque_g >= 0 OR estoque_gg >= 0)
         ORDER BY LEAST(
                    CASE WHEN estoque_p >= 0 THEN estoque_p ELSE 9999 END,
                    CASE WHEN estoque_m >= 0 THEN estoque_m ELSE 9999 END,
                    CASE WHEN estoque_g >= 0 THEN estoque_g ELSE 9999 END,
                    CASE WHEN estoque_gg >= 0 THEN estoque_gg ELSE 9999 END
                 ) ASC
         LIMIT ?`,
        [limite],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro ao buscar estoque' });
            res.json(rows);
        }
    );
});

// ═══════════════════════════════════════════════════════
// ANÚNCIOS / PROMOÇÕES BANNER (admin CRUD + público)
// ═══════════════════════════════════════════════════════

// Público: retorna anúncio ativo agora
app.get('/api/anuncios/ativo', (req, res) => {
    const hoje = new Date().toISOString().split('T')[0];
    db.query(
        `SELECT id, titulo, subtitulo, cor_fundo, cor_texto, link
         FROM anuncios
         WHERE ativo = 1 AND (inicio IS NULL OR inicio <= ?) AND (fim IS NULL OR fim >= ?)
         ORDER BY created_at DESC LIMIT 1`,
        [hoje, hoje],
        (err, rows) => {
            if (err) return res.json(null);
            res.json(rows[0] || null);
        }
    );
});

// Admin: listar todos
app.get('/api/admin/anuncios', requireAdmin, (req, res) => {
    db.query('SELECT * FROM anuncios ORDER BY created_at DESC', (err, rows) => {
        if (err) return res.status(500).json([]);
        res.json(rows);
    });
});

// Admin: criar
app.post('/api/admin/anuncios', requireAdmin, (req, res) => {
    const { titulo, subtitulo, cor_fundo, cor_texto, link, ativo, inicio, fim } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título obrigatório' });
    db.query(
        `INSERT INTO anuncios (titulo, subtitulo, cor_fundo, cor_texto, link, ativo, inicio, fim)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [titulo, subtitulo || '', cor_fundo || '#111', cor_texto || '#fff',
         link || '', ativo ? 1 : 0, inicio || null, fim || null],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Erro ao criar anúncio' });
            res.json({ id: result.insertId, ok: true });
        }
    );
});

// Admin: atualizar
app.put('/api/admin/anuncios/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    const { titulo, subtitulo, cor_fundo, cor_texto, link, ativo, inicio, fim } = req.body;
    if (!titulo) return res.status(400).json({ error: 'Título obrigatório' });
    db.query(
        `UPDATE anuncios SET titulo=?, subtitulo=?, cor_fundo=?, cor_texto=?, link=?, ativo=?, inicio=?, fim=?
         WHERE id=?`,
        [titulo, subtitulo || '', cor_fundo || '#111', cor_texto || '#fff',
         link || '', ativo ? 1 : 0, inicio || null, fim || null, id],
        (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao atualizar anúncio' });
            res.json({ ok: true });
        }
    );
});

// Admin: deletar
app.delete('/api/admin/anuncios/:id', requireAdmin, (req, res) => {
    const id = parseInt(req.params.id);
    db.query('DELETE FROM anuncios WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro ao deletar anúncio' });
        res.json({ ok: true });
    });
});

// ═══════════════════════════════════════════════════════
// ALERTAS EM TEMPO REAL (admin polling)
// ═══════════════════════════════════════════════════════
app.get('/api/admin/alertas', requireAdmin, (req, res) => {
    const desde = req.query.desde;
    const queries = [
        // pedidos novos desde última verificação
        desde
            ? db.promise().query('SELECT id, total, created_at FROM pedidos WHERE created_at > ? ORDER BY created_at DESC LIMIT 10', [desde])
            : db.promise().query('SELECT id, total, created_at FROM pedidos ORDER BY created_at DESC LIMIT 5'),
        // produtos com estoque baixo (<=3 units)
        db.promise().query(
            `SELECT id, nome, liga,
                LEAST(
                    CASE WHEN estoque_p >= 0 THEN estoque_p ELSE 9999 END,
                    CASE WHEN estoque_m >= 0 THEN estoque_m ELSE 9999 END,
                    CASE WHEN estoque_g >= 0 THEN estoque_g ELSE 9999 END,
                    CASE WHEN estoque_gg >= 0 THEN estoque_gg ELSE 9999 END
                ) AS menor_estoque
             FROM produtos
             WHERE (estoque_p BETWEEN 0 AND 3) OR (estoque_m BETWEEN 0 AND 3)
                OR (estoque_g BETWEEN 0 AND 3) OR (estoque_gg BETWEEN 0 AND 3)
             ORDER BY menor_estoque ASC LIMIT 20`
        )
    ];
    Promise.all(queries)
        .then(([[pedidosRows], [estoqueRows]]) => {
            res.json({ pedidos: pedidosRows, estoqueBaixo: estoqueRows });
        })
        .catch(() => res.status(500).json({ pedidos: [], estoqueBaixo: [] }));
});

// ═══════════════════════════════════════════════════════
// ITENS DE PEDIDO (admin detalhe)
// ═══════════════════════════════════════════════════════
app.get('/api/admin/pedidos/:id/itens', requireAdmin, (req, res) => {
    const { id } = req.params;
    db.query(
        `SELECT ip.produto_id, ip.quantidade, ip.tamanho, ip.preco_unitario,
                p.nome AS produto_nome, p.liga AS produto_liga, p.imagem AS produto_img
         FROM itens_pedido ip
         LEFT JOIN produtos p ON ip.produto_id = p.id
         WHERE ip.pedido_id = ?`,
        [id],
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json(rows);
        }
    );
});

// ═══════════════════════════════════════════════════════
// LUCRATIVIDADE (análise de margem)
// ═══════════════════════════════════════════════════════

// Garantir que a coluna custo existe na tabela produtos
db.query('ALTER TABLE produtos ADD COLUMN IF NOT EXISTS custo DECIMAL(10,2) DEFAULT 0', () => {});

app.get('/api/admin/lucratividade', requireAdmin, (req, res) => {
    db.query(
        `SELECT p.id, p.nome, p.liga, p.preco, COALESCE(p.custo, 0) AS custo,
                COUNT(ip.produto_id) AS qtd_vendida,
                SUM(ip.quantidade * ip.preco_unitario) AS receita_total,
                SUM(ip.quantidade * COALESCE(p.custo, 0)) AS custo_total,
                SUM(ip.quantidade * (ip.preco_unitario - COALESCE(p.custo, 0))) AS margem_total
         FROM produtos p
         LEFT JOIN itens_pedido ip ON ip.produto_id = p.id
         LEFT JOIN pedidos ped ON ip.pedido_id = ped.id AND ped.status NOT IN ('cancelado')
         GROUP BY p.id, p.nome, p.liga, p.preco, p.custo
         ORDER BY margem_total DESC
         LIMIT 50`,
        (err, rows) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json(rows);
        }
    );
});

app.put('/api/admin/produtos/:id/custo', requireAdmin, (req, res) => {
    const { id } = req.params;
    const { custo } = req.body;
    db.query('UPDATE produtos SET custo = ? WHERE id = ?', [parseFloat(custo) || 0, id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ success: true });
    });
});

// ═══════════════════════════════════════════════════════
// REVIEWS COM FOTO
// ═══════════════════════════════════════════════════════
db.query('ALTER TABLE avaliacoes ADD COLUMN IF NOT EXISTS foto TEXT DEFAULT NULL', () => {});

// ═══════════════════════════════════════════════════════
// CAMPANHAS DE EMAIL (Marketing Automation)
// ═══════════════════════════════════════════════════════
db.query(`CREATE TABLE IF NOT EXISTS campanhas_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assunto VARCHAR(255) NOT NULL,
    conteudo TEXT NOT NULL,
    agendado_para DATETIME DEFAULT NULL,
    enviado_em DATETIME DEFAULT NULL,
    destinatarios INT DEFAULT 0,
    status ENUM('rascunho','agendado','enviado') DEFAULT 'rascunho',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`, () => {});

app.get('/api/admin/campanhas', requireAdmin, (req, res) => {
    db.query('SELECT * FROM campanhas_email ORDER BY created_at DESC LIMIT 50', (err, rows) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json(rows);
    });
});

app.post('/api/admin/campanhas', requireAdmin, (req, res) => {
    const { assunto, conteudo, agendado_para } = req.body;
    if (!assunto || !conteudo) return res.status(400).json({ error: 'Campos obrigatórios' });
    const status = agendado_para ? 'agendado' : 'rascunho';
    db.query(
        'INSERT INTO campanhas_email (assunto, conteudo, agendado_para, status) VALUES (?, ?, ?, ?)',
        [assunto, conteudo, agendado_para || null, status],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Erro' });
            res.json({ success: true, id: result.insertId });
        }
    );
});

app.post('/api/admin/campanhas/:id/enviar', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().query('SELECT * FROM campanhas_email WHERE id = ?', [id]);
        if (!rows.length) return res.status(404).json({ error: 'Campanha não encontrada' });
        const campanha = rows[0];
        const [subs] = await db.promise().query("SELECT email, nome FROM newsletter WHERE ativo = 1");
        let enviados = 0;
        for (const sub of subs) {
            const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                <h2 style="letter-spacing:2px">${campanha.assunto}</h2>
                <div style="line-height:1.7;color:#333">${campanha.conteudo.replace(/\n/g, '<br>')}</div>
                <hr style="margin:30px 0;border:none;border-top:1px solid #eee">
                <p style="font-size:11px;color:#999">
                    <a href="${process.env.SITE_URL || 'http://localhost:5173'}/unsubscribe?email=${encodeURIComponent(sub.email)}" style="color:#999">Cancelar inscrição</a>
                </p>
            </div>`;
            try {
                await sendEmail(sub.email, campanha.assunto, html);
                enviados++;
            } catch {}
        }
        await db.promise().query(
            'UPDATE campanhas_email SET status = ?, enviado_em = NOW(), destinatarios = ? WHERE id = ?',
            ['enviado', enviados, id]
        );
        res.json({ success: true, enviados });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao enviar' });
    }
});

app.delete('/api/admin/campanhas/:id', requireAdmin, (req, res) => {
    db.query('DELETE FROM campanhas_email WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: 'Erro' });
        res.json({ ok: true });
    });
});

// Verificar campanhas agendadas (a cada 60s)
setInterval(async () => {
    try {
        const [rows] = await db.promise().query(
            "SELECT * FROM campanhas_email WHERE status = 'agendado' AND agendado_para <= NOW()"
        );
        for (const campanha of rows) {
            const [subs] = await db.promise().query("SELECT email, nome FROM newsletter WHERE ativo = 1");
            let enviados = 0;
            for (const sub of subs) {
                const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
                    <h2 style="letter-spacing:2px">${campanha.assunto}</h2>
                    <div style="line-height:1.7">${campanha.conteudo.replace(/\n/g, '<br>')}</div>
                </div>`;
                try { await sendEmail(sub.email, campanha.assunto, html); enviados++; } catch {}
            }
            await db.promise().query(
                'UPDATE campanhas_email SET status = ?, enviado_em = NOW(), destinatarios = ? WHERE id = ?',
                ['enviado', enviados, campanha.id]
            );
        }
    } catch {}
}, 60000);

// ═══════════════════════════════════════════════════════
// SERVIDOR
// ═══════════════════════════════════════════════════════
const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
