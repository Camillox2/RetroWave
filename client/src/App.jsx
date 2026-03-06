import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, BarChart, Menu, Plus, Minus, Package, Search, AlertCircle, Check, ShoppingCart, Mail, Shield } from 'lucide-react';

import './styles/global.css';
import './styles/responsive.css';

import Home from './views/Home';
import AdminDashboard from './views/AdminDashboard';
import Checkout from './views/Checkout';
import MeusPedidos from './views/MeusPedidos';

import ChatBot from './components/ChatBot';

import logoBranca from '/src/assets/images/white_semfundo.png';
import logoPreta from '/src/assets/images/black_semfundo.png';

// ═══════════════════════════════════════════════════════
// TOAST CONTEXT — Yeezy-style Notifications
// ═══════════════════════════════════════════════════════
const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 2800) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  const toastMethods = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    cart: (msg) => addToast(msg, 'cart'),
    dismiss: (id) => removeToast(id),
  }), [addToast, removeToast]);

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}

      {/* Toast Container */}
      <div className="toast-container">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              className={`toast toast-${t.type}`}
              initial={{ x: 120, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 120, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              onClick={() => removeToast(t.id)}
              role="alert"
            >
              <div className="toast-icon">
                {t.type === 'success' && <Check size={14} />}
                {t.type === 'error' && <AlertCircle size={14} />}
                {t.type === 'cart' && <ShoppingCart size={14} />}
                {t.type === 'info' && <Check size={14} />}
              </div>
              <span className="toast-msg">{t.message}</span>
              <div className="toast-progress">
                <motion.div
                  className="toast-progress-bar"
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: 2.8, ease: 'linear' }}
                  style={{ transformOrigin: 'left' }}
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════
// 404 PAGE
// ═══════════════════════════════════════════════════════
function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <div className="not-found-divider" />
        <p className="not-found-text">ESTA PÁGINA NÃO EXISTE</p>
      </div>
      <Link to="/" className="not-found-link">
        VOLTAR AO INÍCIO
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL — Política de Privacidade / LGPD
// ═══════════════════════════════════════════════════════
function PolicyModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handleKey);
      return () => document.removeEventListener('keydown', handleKey);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="policy-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      >
        <motion.div
          className="policy-modal"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="policy-modal-header">
            <div className="policy-modal-title">
              <Shield size={18} />
              <h2>POLÍTICA DE PRIVACIDADE</h2>
            </div>
            <button className="policy-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="policy-modal-body">
            <p className="policy-updated">Última atualização: Março de 2026</p>

            <section className="policy-section">
              <h3>1. INFORMAÇÕES QUE COLETAMOS</h3>
              <p>A Retro Wave coleta apenas os dados estritamente necessários para processar suas compras e garantir uma experiência de qualidade:</p>
              <ul>
                <li><strong>Dados de identificação:</strong> nome completo e endereço de e-mail, fornecidos no momento da compra.</li>
                <li><strong>Endereço de entrega:</strong> para envio dos produtos adquiridos.</li>
                <li><strong>Dados de navegação:</strong> informações anônimas de acesso (IP anonimizado) para métricas internas, sem rastreamento individual.</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3>2. COMO UTILIZAMOS SEUS DADOS</h3>
              <p>Seus dados pessoais são utilizados exclusivamente para:</p>
              <ul>
                <li>Processar e entregar seus pedidos;</li>
                <li>Enviar confirmações e atualizações de status do pedido;</li>
                <li>Permitir o acompanhamento do pedido na área "Meus Pedidos";</li>
                <li>Cumprir obrigações legais e regulatórias.</li>
              </ul>
              <p><strong>Não vendemos, compartilhamos ou cedemos seus dados pessoais a terceiros para fins comerciais.</strong></p>
            </section>

            <section className="policy-section">
              <h3>3. BASE LEGAL (LGPD — Lei 13.709/2018)</h3>
              <p>O tratamento de dados pessoais pela Retro Wave fundamenta-se nas seguintes bases legais previstas no Art. 7º da LGPD:</p>
              <ul>
                <li><strong>Consentimento (Art. 7º, I):</strong> mediante aceite explícito no momento da compra.</li>
                <li><strong>Execução de contrato (Art. 7º, V):</strong> para viabilizar a entrega dos produtos adquiridos.</li>
                <li><strong>Legítimo interesse (Art. 7º, IX):</strong> para métricas internas agregadas e anonimizadas.</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3>4. ARMAZENAMENTO E SEGURANÇA</h3>
              <ul>
                <li>Senhas administrativas são criptografadas com <strong>bcrypt</strong> (12 rounds de salt).</li>
                <li>Dados são armazenados em banco de dados com acesso restrito.</li>
                <li>Não armazenamos dados de pagamento — transações são processadas por gateways seguros de terceiros.</li>
                <li>Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não autorizado, perda ou destruição.</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3>5. SEUS DIREITOS (Art. 18 — LGPD)</h3>
              <p>Você tem o direito de, a qualquer momento:</p>
              <ul>
                <li>Confirmar a existência de tratamento de seus dados;</li>
                <li>Acessar, corrigir ou atualizar seus dados pessoais;</li>
                <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários;</li>
                <li>Revogar o consentimento a qualquer momento;</li>
                <li>Solicitar a portabilidade de dados;</li>
                <li>Obter informações sobre compartilhamento de dados.</li>
              </ul>
              <p>Para exercer qualquer desses direitos, entre em contato pelo e-mail <strong>retroswaves@gmail.com</strong>.</p>
            </section>

            <section className="policy-section">
              <h3>6. COOKIES E ARMAZENAMENTO LOCAL</h3>
              <p>Utilizamos <strong>localStorage</strong> do navegador exclusivamente para:</p>
              <ul>
                <li>Manter a sessão do cliente ativa (dados de login invisível);</li>
                <li>Preservar o conteúdo do carrinho durante a navegação.</li>
              </ul>
              <p>Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.</p>
            </section>

            <section className="policy-section">
              <h3>7. RETENÇÃO DE DADOS</h3>
              <p>Os dados pessoais são mantidos enquanto houver relação comercial ativa ou conforme exigido por obrigações legais (Art. 16, LGPD). Após solicitação de exclusão, os dados são removidos no prazo máximo de 15 dias úteis.</p>
            </section>

            <section className="policy-section">
              <h3>8. CONTATO DO ENCARREGADO (DPO)</h3>
              <p>Para questões relacionadas à privacidade e proteção de dados:</p>
              <p className="policy-contact">
                <Mail size={14} />
                <a href="mailto:retroswaves@gmail.com">retroswaves@gmail.com</a>
              </p>
            </section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function AppContent() {
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [ligaAtiva, setLigaAtiva] = useState('');
  const [cliente, setCliente] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [forceReload, setForceReload] = useState(0);
  const location = useLocation();
  const toast = useToast();

  const ligas = [
    'BUNDESLIGA', 'LIGA PORTUGUESA', 'LIGUE 1', 'BRASILEIRÃO', 'SERIE A'
  ];

  // Restaurar cliente do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('retrowave_cliente');
      if (saved) setCliente(JSON.parse(saved));
    } catch {}
  }, []);

  const handleClienteLogin = (clienteData) => {
    setCliente(clienteData);
    localStorage.setItem('retrowave_cliente', JSON.stringify(clienteData));
  };

  const handleClienteLogout = () => {
    setCliente(null);
    localStorage.removeItem('retrowave_cliente');
  };

  // Detecção automática de tema
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mq.matches ? 'dark' : 'light');
    const handler = (e) => setTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Fechar menus ao navegar
  useEffect(() => {
    setIsCartOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Ler liga do URL param ao carregar (para links compartilháveis)
  useEffect(() => {
    if (location.pathname === '/') {
      const ligaParam = searchParams.get('liga');
      if (ligaParam && ligas.includes(ligaParam)) {
        setLigaAtiva(ligaParam);
      }
    }
  }, []);

  // Bloquear scroll do body quando drawer está aberto
  useEffect(() => {
    if (isCartOpen || isMobileMenuOpen) {
      const scrollbarW = window.innerWidth - document.documentElement.clientWidth;
      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.paddingRight = `${scrollbarW}px`;
      // Propagar padding no header sticky para não pular
      const header = document.querySelector('.header');
      const searchBar = document.querySelector('.search-bar');
      if (header) header.style.paddingRight = `${40 + scrollbarW}px`;
      if (searchBar) searchBar.style.paddingRight = `${scrollbarW}px`;
    } else {
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
      const header = document.querySelector('.header');
      const searchBar = document.querySelector('.search-bar');
      if (header) header.style.paddingRight = '';
      if (searchBar) searchBar.style.paddingRight = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
      const header = document.querySelector('.header');
      const searchBar = document.querySelector('.search-bar');
      if (header) header.style.paddingRight = '';
      if (searchBar) searchBar.style.paddingRight = '';
    };
  }, [isCartOpen, isMobileMenuOpen]);

  // Adicionar ao carrinho (com tamanho, incrementa qty se mesmo id+tamanho)
  const addToCart = (product, tamanho = 'M') => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.id === product.id && item.tamanho === tamanho);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], qtd: updated[existingIndex].qtd + 1 };
        return updated;
      }
      return [...prev, { ...product, tamanho, qtd: 1 }];
    });
    toast.cart(`${product.nome} — TAM ${tamanho}`);
  };

  const updateQty = (index, delta) => {
    setCart(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], qtd: Math.max(1, updated[index].qtd + delta) };
      return updated;
    });
  };

  const removeFromCart = (index) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const cartTotal = cart.reduce((acc, item) => acc + parseFloat(item.precoFinal || item.preco) * item.qtd, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.qtd, 0);

  const [filterLocked, setFilterLocked] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const adminTabs = ['dashboard', 'produtos', 'banner', 'config', 'despesas', 'pedidos', 'cupons', 'avaliacoes'];
  const adminTabAtiva = searchParams.get('tab') || 'dashboard';

  const handleFilterClick = (liga) => {
    if (filterLocked) return;
    setFilterLocked(true);
    const newLiga = liga === ligaAtiva ? '' : liga;
    setLigaAtiva(newLiga);
    if (location.pathname === '/') {
      setSearchParams(newLiga ? { liga: newLiga } : {});
    }
    setIsMobileMenuOpen(false);
    setTimeout(() => setFilterLocked(false), 800);
  };

  return (
    <>
      {/* ── HEADER ── */}
      <header className="header">
        <button className="menu-mobile" onClick={() => setIsMobileMenuOpen(true)} aria-label="Menu">
          <Menu size={22} />
        </button>

        <Link to="/" onClick={() => { setLigaAtiva(''); setSearchQuery(''); setForceReload(r => r + 1); }}>
          <img
            src={theme === 'dark' ? logoBranca : logoPreta}
            alt="Retro Wave"
            className="logo"
          />
        </Link>

        {location.pathname === '/admin' ? (
          <nav className="filters admin-header-tabs">
            {adminTabs.map(tab => (
              <button
                key={tab}
                className={`filter-btn ${adminTabAtiva === tab ? 'active' : ''}`}
                onClick={() => setSearchParams({ tab })}
              >
                {tab === 'avaliacoes' ? 'REVIEWS' : tab.toUpperCase()}
              </button>
            ))}
          </nav>
        ) : (
          <nav className={`filters ${filterLocked ? 'filters-locked' : ''}`}>
            {ligas.map(liga => (
              <button
                key={liga}
                className={`filter-btn ${ligaAtiva === liga ? 'active' : ''}`}
                onClick={() => handleFilterClick(liga)}
                disabled={filterLocked}
              >
                {liga}
              </button>
            ))}
          </nav>
        )}

        <div className="header-actions">
          {/* Search toggle */}
          <button
            className={`header-search-toggle ${searchOpen ? 'active' : ''}`}
            onClick={() => {
              setSearchOpen(v => {
                if (v) setSearchQuery(''); // Limpar busca ao fechar
                return !v;
              });
            }}
          >
            <Search size={18} />
          </button>
          {cliente && (
            <Link to="/meus-pedidos" className="header-user-btn" title="Meus Pedidos">
              <Package size={18} />
            </Link>
          )}
          <Link to="/admin" aria-label="Painel Admin"><BarChart size={18} /></Link>
          <button onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }} aria-label="Carrinho">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
          </button>
        </div>
      </header>

      {/* ── SEARCH BAR (slide down) ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="search-bar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="search-bar-inner">
              <Search size={16} className="search-icon" aria-hidden="true" />
              <input
                type="text"
                className="search-input"
                placeholder="BUSCAR CAMISAS..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                aria-label="Buscar camisas"
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROUTES ── */}
      <main>
        <Routes location={location}>
          <Route path="/" element={<Home ligaAtiva={ligaAtiva} addToCart={addToCart} searchQuery={searchQuery} forceReload={forceReload} />} />
          <Route path="/checkout" element={
            <Checkout cart={cart} setCart={setCart} onClienteLogin={handleClienteLogin} />
          } />
          <Route path="/meus-pedidos" element={
            <MeusPedidos cliente={cliente} onLogout={handleClienteLogout} />
          } />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      {/* ── MOBILE MENU ── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="cart-overlay"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="mobile-menu"
            >
              <div className="mobile-menu-header">
                <h2>{location.pathname === '/admin' ? 'ADMIN' : 'LIGAS'}</h2>
                <button onClick={() => setIsMobileMenuOpen(false)}><X size={20} /></button>
              </div>

              {location.pathname === '/admin' ? (
                <>
                  {adminTabs.map(tab => (
                    <button
                      key={tab}
                      className={`mobile-menu-item ${adminTabAtiva === tab ? 'active' : ''}`}
                      onClick={() => { setSearchParams({ tab }); setIsMobileMenuOpen(false); }}
                    >
                      {tab === 'avaliacoes' ? 'REVIEWS' : tab.toUpperCase()}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    className={`mobile-menu-item ${ligaAtiva === '' ? 'active' : ''}`}
                    onClick={() => handleFilterClick('')}
                  >
                    TODAS
                  </button>
                  {ligas.map(liga => (
                    <button
                      key={liga}
                      className={`mobile-menu-item ${ligaAtiva === liga ? 'active' : ''}`}
                      onClick={() => handleFilterClick(liga)}
                    >
                      {liga}
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CART DRAWER ── */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="cart-overlay"
              onClick={() => setIsCartOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="cart-drawer"
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h2>CARRINHO ({cartCount})</h2>
                <button onClick={() => setIsCartOpen(false)}><X size={20} /></button>
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty">CARRINHO VAZIO</div>
              ) : (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                    {cart.map((item, index) => (
                      <div
                        key={`${item.id}-${item.tamanho || 'M'}`}
                        className="cart-item"
                      >
                        <img src={`http://localhost:3001/api/produtos/${item.id}/thumb`} alt={item.nome} />
                        <div className="cart-item-info">
                          <span className="name">{item.nome}</span>
                          <span className="cart-item-size">TAM: {item.tamanho || 'M'}</span>
                          <span className="price">R$ {(parseFloat(item.precoFinal || item.preco) * item.qtd).toFixed(2)}</span>
                          <div className="cart-item-actions">
                            <button className="qty-btn" onClick={() => updateQty(index, -1)}>
                              <Minus size={12} />
                            </button>
                            <span className="qty-value">{item.qtd}</span>
                            <button className="qty-btn" onClick={() => updateQty(index, 1)}>
                              <Plus size={12} />
                            </button>
                            <button className="remove-btn" onClick={() => removeFromCart(index)}>
                              REMOVER
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="cart-footer">
                    <div className="cart-total">
                      <span>TOTAL</span>
                      <span>R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <Link
                      to="/checkout"
                      className="checkout-btn"
                      onClick={() => setIsCartOpen(false)}
                    >
                      CONCLUIR COMPRA
                    </Link>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">RETRO WAVE</span>
            <p className="footer-copy">&copy; 2026 DC Foundry Digital. By Vitor Camillo.</p>
          </div>

          <div className="footer-links">
            <button className="footer-link" onClick={() => setPolicyOpen(true)}>
              <Shield size={12} />
              POLÍTICA DE PRIVACIDADE
            </button>
            <span className="footer-separator">|</span>
            <a href="mailto:retroswaves@gmail.com" className="footer-link">
              <Mail size={12} />
              retroswaves@gmail.com
            </a>
          </div>

          <p className="footer-lgpd">
            Em conformidade com a LGPD — Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
          </p>
        </div>
      </footer>

      {/* ── POLICY MODAL ── */}
      <PolicyModal isOpen={policyOpen} onClose={() => setPolicyOpen(false)} />

      {/* ── CHATBOT IA ── */}
      <ChatBot />
    </>
  );
}

function App() {
  return (
    <Router>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
}

export default App;
