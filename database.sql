-- Script SQL para Retro Wave
CREATE DATABASE IF NOT EXISTS retrowave;
USE retrowave;

-- Tabela de Produtos (Camisas)
CREATE TABLE IF NOT EXISTS produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    liga VARCHAR(100) NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    imagem LONGTEXT NOT NULL,
    descricao TEXT DEFAULT NULL,
    cliques INT DEFAULT 0,
    vendas INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Imagens do Produto (múltiplas fotos com ordem)
CREATE TABLE IF NOT EXISTS produto_imagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    produto_id INT NOT NULL,
    imagem LONGTEXT NOT NULL,
    ordem INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE CASCADE
);

-- Tabela de Usuários (Clientes)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255),
    endereco TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'concluido',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT,
    produto_id INT,
    quantidade INT DEFAULT 1,
    tamanho VARCHAR(5) DEFAULT 'M',
    preco_unitario DECIMAL(10, 2),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);

-- Tabela de Admin
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL
);

-- Tabela de Despesas
CREATE TABLE IF NOT EXISTS despesas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    data_despesa DATE DEFAULT (CURRENT_DATE)
);

-- Tabela de Métricas de Visitantes
CREATE TABLE IF NOT EXISTS metricas_acesso (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_acesso DATE DEFAULT (CURRENT_DATE),
    visitantes_unicos INT DEFAULT 0,
    cliques_totais INT DEFAULT 0,
    UNIQUE KEY uq_data_acesso (data_acesso)
);

-- Inserir Admin Padrão (senha: admin123 — hash bcrypt)
INSERT IGNORE INTO admins (usuario, senha) VALUES ('admin', '$2b$12$00eOKVI/IAmU573.EEDRE.R.Z44/fimbMekuaDcXDcm7s5c6fcsC.');

-- Inserir Ligas iniciais para teste (Serão usadas no filtro)
-- As camisas serão cadastradas via Admin ou Script de Seed
