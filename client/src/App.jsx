import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, X, BarChart, Menu, Plus, Minus, Package, Search, AlertCircle, Check, ShoppingCart, Mail, Shield, Globe, Mic, MicOff, SlidersHorizontal } from 'lucide-react';

import './styles/global.css';
import './styles/responsive.css';

import { I18nProvider, useI18n } from './i18n/index.jsx';
import Home from './views/Home';
import AdminDashboard from './views/AdminDashboard';
import Checkout from './views/Checkout';
import MeusPedidos from './views/MeusPedidos';

import ChatBot from './components/ChatBot';

import { API_URL } from './config';

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
    setToasts(prev => [...prev, { id, message, type, duration }]);
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
                  transition={{ duration: (t.duration || 2800) / 1000, ease: 'linear' }}
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
  const { t } = useI18n();
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-code">404</h1>
        <div className="not-found-divider" />
        <p className="not-found-text">{t('notfound.text')}</p>
      </div>
      <Link to="/" className="not-found-link">
        {t('notfound.back')}
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// MODAL — Política de Privacidade / LGPD
// ═══════════════════════════════════════════════════════
function PolicyModal({ isOpen, onClose }) {
  const { t } = useI18n();

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
              <h2>{t('policy.title')}</h2>
            </div>
            <button className="policy-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className="policy-modal-body">
            <p className="policy-updated">{t('policy.updated')}</p>

            <section className="policy-section">
              <h3>{t('policy.s1_title')}</h3>
              <p>{t('policy.s1_intro')}</p>
              <ul>
                <li><strong>{t('policy.s1_name').split(':')[0]}:</strong>{t('policy.s1_name').split(':').slice(1).join(':')}</li>
                <li><strong>{t('policy.s1_address').split(':')[0]}:</strong>{t('policy.s1_address').split(':').slice(1).join(':')}</li>
                <li><strong>{t('policy.s1_nav').split(':')[0]}:</strong>{t('policy.s1_nav').split(':').slice(1).join(':')}</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s2_title')}</h3>
              <p>{t('policy.s2_intro')}</p>
              <ul>
                <li>{t('policy.s2_process')}</li>
                <li>{t('policy.s2_confirm')}</li>
                <li>{t('policy.s2_track')}</li>
                <li>{t('policy.s2_legal')}</li>
              </ul>
              <p><strong>{t('policy.s2_noshare')}</strong></p>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s3_title')}</h3>
              <p>{t('policy.s3_intro')}</p>
              <ul>
                <li><strong>{t('policy.s3_consent').split(':')[0]}:</strong>{t('policy.s3_consent').split(':').slice(1).join(':')}</li>
                <li><strong>{t('policy.s3_contract').split(':')[0]}:</strong>{t('policy.s3_contract').split(':').slice(1).join(':')}</li>
                <li><strong>{t('policy.s3_interest').split(':')[0]}:</strong>{t('policy.s3_interest').split(':').slice(1).join(':')}</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s4_title')}</h3>
              <ul>
                <li>{t('policy.s4_bcrypt')}</li>
                <li>{t('policy.s4_db')}</li>
                <li>{t('policy.s4_payment')}</li>
                <li>{t('policy.s4_measures')}</li>
              </ul>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s5_title')}</h3>
              <p>{t('policy.s5_intro')}</p>
              <ul>
                <li>{t('policy.s5_confirm')}</li>
                <li>{t('policy.s5_access')}</li>
                <li>{t('policy.s5_delete')}</li>
                <li>{t('policy.s5_revoke')}</li>
                <li>{t('policy.s5_port')}</li>
                <li>{t('policy.s5_info')}</li>
              </ul>
              <p>{t('policy.s5_contact')}</p>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s6_title')}</h3>
              <p>{t('policy.s6_intro')}</p>
              <ul>
                <li>{t('policy.s6_session')}</li>
                <li>{t('policy.s6_cart')}</li>
              </ul>
              <p>{t('policy.s6_notrack')}</p>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s7_title')}</h3>
              <p>{t('policy.s7_text')}</p>
            </section>

            <section className="policy-section">
              <h3>{t('policy.s8_title')}</h3>
              <p>{t('policy.s8_text')}</p>
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

// ═══════════════════════════════════════════════════════
// ERROR BOUNDARY — Evita tela preta em crashes de render
// ═══════════════════════════════════════════════════════
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: '#fff', fontFamily: 'Arial, sans-serif', padding: 32 }}>
          <h1 style={{ fontSize: '1rem', letterSpacing: 4, marginBottom: 16 }}>ERRO DE RENDERIZAÇÃO</h1>
          <p style={{ opacity: 0.5, fontSize: '0.7rem', letterSpacing: 2, maxWidth: 400, textAlign: 'center', marginBottom: 24 }}>
            {this.state.error?.message || 'Erro inesperado'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
            style={{ background: '#fff', color: '#000', border: 'none', padding: '10px 24px', fontSize: '0.65rem', letterSpacing: 3, cursor: 'pointer' }}
          >
            VOLTAR AO INÍCIO
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('retrowave_cart');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [ligaAtiva, setLigaAtiva] = useState('');
  const [cliente, setCliente] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [policyOpen, setPolicyOpen] = useState(false);
  const [forceReload, setForceReload] = useState(0);
  const [nlEmail, setNlEmail] = useState('');
  const [nlStatus, setNlStatus] = useState('');
  const [filterLocked, setFilterLocked] = useState(false);
  const [anuncioBanner, setAnuncioBanner] = useState(null);
  const [priceRange, setPriceRange] = useState([0, 999]);
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [voiceSearching, setVoiceSearching] = useState(false);
  const voiceSearchRef = useRef(null);
  const adminTabNavRef = useRef(null);
  const [freteConfig, setFreteConfig] = useState({ ativo: true, valor: 29.90, gratis_acima: 299.90 });
  const [manutencaoConfig, setManutencaoConfig] = useState({ ativo: false, titulo: 'EM MANUTENÇÃO', subtitulo: 'Voltamos em breve.', cor_fundo: '#0a0a0a', cor_texto: '#ffffff', imagem: '', video_url: '', animacao: 'pulse' });

  // Persistir carrinho no localStorage
  useEffect(() => {
    localStorage.setItem('retrowave_cart', JSON.stringify(cart));
  }, [cart]);

  // Buscar anúncio ativo do site
  useEffect(() => {
    fetch(`${API_URL}/api/anuncios/ativo`)
      .then(r => r.json())
      .then(data => setAnuncioBanner(data))
      .catch(() => {});
  }, []);

  // Buscar config de frete
  useEffect(() => {
    fetch(`${API_URL}/api/frete-config`)
      .then(r => r.json())
      .then(data => setFreteConfig(data))
      .catch(() => {});
  }, []);

  // Verificar modo manutenção
  useEffect(() => {
    fetch(`${API_URL}/api/config`)
      .then(r => r.json())
      .then(data => setManutencaoConfig({
        ativo: data.manutencao_ativo === '1',
        titulo: data.manutencao_titulo || 'EM MANUTENÇÃO',
        subtitulo: data.manutencao_subtitulo || 'Voltamos em breve.',
        cor_fundo: data.manutencao_cor_fundo || '#0a0a0a',
        cor_texto: data.manutencao_cor_texto || '#ffffff',
        imagem: data.manutencao_imagem || '',
        video_url: data.manutencao_video_url || '',
        animacao: data.manutencao_animacao || 'pulse',
      }))
      .catch(() => {});
  }, []);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const toast = useToast();
  const { lang, setLang, t, langs } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.lang-switcher-wrap')) setLangOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [langOpen]);

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
  }, [searchParams, location.pathname]);

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
  // Toast for cart with i18n
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
    toast.cart(`${product.nome} — ${t('cart.size_label')} ${tamanho}`);
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

  const cartTotal = cart.reduce((acc, item) => acc + parseFloat(item.precoFinal ?? item.preco) * item.qtd, 0);
  const cartCount = cart.reduce((acc, item) => acc + item.qtd, 0);
  const cartEconomia = cart.reduce((acc, item) => {
    const orig = parseFloat(item.preco);
    const final = parseFloat(item.precoFinal ?? item.preco);
    return acc + (orig > final ? (orig - final) * item.qtd : 0);
  }, 0);

  // Cart abandonment — save to backend when user has email and cart isn't empty
  useEffect(() => {
    if (!cliente?.email || cart.length === 0) return;
    const timer = setTimeout(() => {
      fetch(`${API_URL}/api/carrinho-abandonado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cliente.email, carrinho: cart })
      }).catch(() => {});
    }, 5000); // Save after 5s of no changes
    return () => clearTimeout(timer);
  }, [cart, cliente?.email]);

  // Recover abandoned cart on login
  useEffect(() => {
    if (!cliente?.email || cart.length > 0) return;
    fetch(`${API_URL}/api/carrinho-abandonado?email=${encodeURIComponent(cliente.email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.carrinho?.length > 0) {
          setCart(data.carrinho);
          toast.info(t('cart.restored').replace('{count}', data.carrinho.length));
          fetch(`${API_URL}/api/carrinho-abandonado/recuperar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cliente.email })
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [cliente?.email]);

  const adminTabs = ['dashboard', 'produtos', 'banner', 'config', 'frete', 'manutencao', 'despesas', 'pedidos', 'cupons', 'avaliacoes', 'newsletter', 'estoque', 'promocoes', 'lucratividade', 'campanhas'];
  const adminTabLabels = {
    dashboard: 'PAINEL', produtos: 'PRODUTOS', banner: 'BANNER', config: 'CONFIG',
    frete: 'FRETE', manutencao: 'MANUTENÇÃO', despesas: 'DESPESAS', pedidos: 'PEDIDOS',
    cupons: 'CUPONS', avaliacoes: 'REVIEWS', newsletter: 'NEWSLETTER', estoque: 'ESTOQUE',
    promocoes: 'PROMOÇÕES', lucratividade: 'LUCRATIVIDADE', campanhas: 'CAMPANHAS'
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!nlEmail.trim()) return;
    setNlStatus('...');
    try {
      const res = await fetch(`${API_URL}/api/newsletter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: nlEmail.trim(), nome: cliente?.nome || '' })
      });
      if (res.ok) {
        setNlStatus(t('footer.newsletter_success'));
        setNlEmail('');
        setTimeout(() => setNlStatus(''), 4000);
      } else {
        setNlStatus(t('footer.newsletter_error'));
      }
    } catch {
      setNlStatus(t('footer.newsletter_error'));
    }
  };
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

  const toggleVoiceSearch = useCallback(() => {
    if (voiceSearching) {
      voiceSearchRef.current?.stop();
      setVoiceSearching(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    voiceSearchRef.current = rec;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setSearchQuery(text);
      if (!searchOpen) setSearchOpen(true);
    };
    rec.onerror = () => setVoiceSearching(false);
    rec.onend = () => setVoiceSearching(false);
    setVoiceSearching(true);
    if (!searchOpen) setSearchOpen(true);
    rec.start();
  }, [voiceSearching, searchOpen]);

  // Modo manutenção — bloqueia site para não-admins
  if (manutencaoConfig.ativo && location.pathname !== '/admin') {
    const cfg = manutencaoConfig;
    const isYoutube = cfg.video_url && (cfg.video_url.includes('youtube') || cfg.video_url.includes('youtu.be'));
    const ytId = isYoutube ? (cfg.video_url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1] || '') : '';
    const isDirectVideo = cfg.video_url && !isYoutube;
    return (
      <div className={`manutencao-page manutencao-anim-${cfg.animacao}`} style={{ background: cfg.cor_fundo, color: cfg.cor_texto, '--mt-cor': cfg.cor_texto }}>
        {cfg.imagem && !cfg.video_url && (
          <img src={cfg.imagem} alt="" className="manutencao-bg-img" />
        )}
        {isYoutube && ytId && (
          <iframe className="manutencao-video" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0`} allow="autoplay; fullscreen" frameBorder="0" />
        )}
        {isDirectVideo && (
          <video className="manutencao-video" src={cfg.video_url} autoPlay muted loop playsInline />
        )}
        <div className="manutencao-overlay" />
        <div className="manutencao-content">
          <div className="manutencao-icon">🔧</div>
          <h1 className="manutencao-title">{cfg.titulo}</h1>
          <p className="manutencao-sub">{cfg.subtitulo}</p>
          <a href="/admin" className="manutencao-admin-link">admin</a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── BANNER DE ANÚNCIO ── */}
      {anuncioBanner && (
        <div
          className="announcement-bar"
          style={{ background: anuncioBanner.cor_fundo, color: anuncioBanner.cor_texto, cursor: anuncioBanner.link ? 'pointer' : 'default' }}
          onClick={() => anuncioBanner.link && (window.location.href = anuncioBanner.link)}
          role={anuncioBanner.link ? 'link' : undefined}
        >
          <span className="announcement-titulo">{anuncioBanner.titulo}</span>
          {anuncioBanner.subtitulo && <span className="announcement-sub">{anuncioBanner.subtitulo}</span>}
        </div>
      )}

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
          <div className="admin-tabs-wrapper">
            <button className="admin-tabs-arrow" onClick={() => adminTabNavRef.current?.scrollBy({ left: -120, behavior: 'smooth' })}>‹</button>
            <nav className="filters admin-header-tabs" ref={adminTabNavRef}>
              {adminTabs.map(tab => (
                <button
                  key={tab}
                  className={`filter-btn ${adminTabAtiva === tab ? 'active' : ''}`}
                  onClick={() => setSearchParams({ tab })}
                >
                  {adminTabLabels[tab]}
                </button>
              ))}
            </nav>
            <button className="admin-tabs-arrow" onClick={() => adminTabNavRef.current?.scrollBy({ left: 120, behavior: 'smooth' })}>›</button>
            <button
              className={`admin-manut-btn ${manutencaoConfig.ativo ? 'active' : ''}`}
              title={manutencaoConfig.ativo ? 'Manutenção ATIVA — clique para gerenciar' : 'Modo manutenção — clique para gerenciar'}
              onClick={() => setSearchParams({ tab: 'manutencao' })}
            >
              🔧
            </button>
          </div>
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
          {/* Language switcher */}
          <div className="lang-switcher-wrap">
            <button
              className={`header-search-toggle lang-toggle ${langOpen ? 'active' : ''}`}
              onClick={() => setLangOpen(v => !v)}
              aria-label="Idioma"
            >
              <Globe size={17} />
              <span className="lang-current">{lang.toUpperCase()}</span>
            </button>
            <AnimatePresence>
              {langOpen && (
                <motion.div
                  className="lang-dropdown"
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                >
                  {langs.map(l => (
                    <button
                      key={l}
                      className={`lang-option ${lang === l ? 'lang-active' : ''}`}
                      onClick={() => { setLang(l); setLangOpen(false); }}
                    >
                      <span className="lang-flag">{l === 'pt' ? '🇧🇷' : l === 'en' ? '🇺🇸' : '🇪🇸'}</span>
                      {t(`lang.${l}`)}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
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
            <Link to="/meus-pedidos" className="header-user-btn" title={t('header.my_orders')}>
              <Package size={18} />
            </Link>
          )}
          <Link to="/admin" aria-label={t('header.admin')}><BarChart size={18} /></Link>
          <button onClick={() => setIsCartOpen(true)} style={{ position: 'relative' }} aria-label={t('header.cart')}>
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
                placeholder={t('header.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                aria-label={t('header.search_placeholder')}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <X size={14} />
                </button>
              )}
              {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                <button
                  className={`search-voice-btn ${voiceSearching ? 'active' : ''}`}
                  onClick={toggleVoiceSearch}
                  aria-label="Busca por voz"
                >
                  {voiceSearching ? <MicOff size={14} /> : <Mic size={14} />}
                </button>
              )}
              <button
                className={`search-filter-btn ${showPriceFilter ? 'active' : ''}`}
                onClick={() => setShowPriceFilter(v => !v)}
                aria-label="Filtro de preço"
              >
                <SlidersHorizontal size={14} />
              </button>
            </div>
            {showPriceFilter && (
              <div className="price-filter-bar">
                <span className="price-filter-label">R$ {priceRange[0]}</span>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="10"
                  value={priceRange[0]}
                  onChange={e => setPriceRange([Math.min(Number(e.target.value), priceRange[1] - 10), priceRange[1]])}
                  className="price-range-input"
                />
                <input
                  type="range"
                  min="0"
                  max="999"
                  step="10"
                  value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Math.max(Number(e.target.value), priceRange[0] + 10)])}
                  className="price-range-input"
                />
                <span className="price-filter-label">R$ {priceRange[1] >= 999 ? '∞' : priceRange[1]}</span>
                {(priceRange[0] > 0 || priceRange[1] < 999) && (
                  <button className="price-filter-reset" onClick={() => setPriceRange([0, 999])}>
                    <X size={12} /> LIMPAR
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROUTES ── */}
      <main>
        <Routes location={location}>
          <Route path="/" element={<Home ligaAtiva={ligaAtiva} addToCart={addToCart} searchQuery={searchQuery} forceReload={forceReload} cliente={cliente} priceRange={priceRange} />} />
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
                <h2>{location.pathname === '/admin' ? 'ADMIN' : t('mobile_menu.leagues')}</h2>
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
                      {adminTabLabels[tab]}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  <button
                    className={`mobile-menu-item ${ligaAtiva === '' ? 'active' : ''}`}
                    onClick={() => handleFilterClick('')}
                  >
                    {t('mobile_menu.all')}
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
                <h2>{t('cart.title')} ({cartCount})</h2>
                <button onClick={() => setIsCartOpen(false)}><X size={20} /></button>
              </div>

              {cart.length === 0 ? (
                <div className="cart-empty">{t('cart.empty')}</div>
              ) : (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
                    {cart.map((item, index) => (
                      <div
                        key={`${item.id}-${item.tamanho || 'M'}`}
                        className="cart-item"
                      >
                        <img src={`${API_URL}/api/produtos/${item.id}/thumb`} alt={item.nome} />
                        <div className="cart-item-info">
                          <span className="name">{item.nome}</span>
                          <span className="cart-item-size">{t('cart.size_label')}: {item.tamanho || 'M'}</span>
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
                              {t('cart.remove').toUpperCase()}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {freteConfig.ativo && (() => {
                    const falta = freteConfig.gratis_acima - cartTotal;
                    const pct = Math.min(100, (cartTotal / freteConfig.gratis_acima) * 100);
                    return (
                      <div className="cart-frete-banner">
                        {falta <= 0
                          ? <span className="cart-frete-gratis">🎉 Frete grátis aplicado!</span>
                          : <>
                              <span>Falta <strong>R$ {falta.toFixed(2)}</strong> para frete grátis</span>
                              <div className="cart-frete-bar"><div className="cart-frete-bar-fill" style={{ width: `${pct}%` }} /></div>
                            </>
                        }
                      </div>
                    );
                  })()}

                  <div className="cart-footer">
                    {cartEconomia > 0 && (
                      <div className="cart-economia">
                        <span>ECONOMIA</span>
                        <span>− R$ {cartEconomia.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="cart-total">
                      <span>{t('cart.total').toUpperCase()}</span>
                      <span>R$ {cartTotal.toFixed(2)}</span>
                    </div>
                    <Link
                      to="/checkout"
                      className="checkout-btn"
                      onClick={() => setIsCartOpen(false)}
                    >
                      {t('cart.checkout')}
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

          <form className="footer-newsletter" onSubmit={handleNewsletterSubmit}>
            <span className="footer-nl-label"><Mail size={12} /> {t('footer.newsletter_label')}</span>
            <div className="footer-nl-row">
              <input
                type="email"
                placeholder={t('footer.newsletter_placeholder')}
                value={nlEmail}
                onChange={(e) => setNlEmail(e.target.value)}
                required
                className="footer-nl-input"
              />
              <button type="submit" className="footer-nl-btn">{t('footer.newsletter_btn')}</button>
            </div>
            {nlStatus && <span className="footer-nl-status">{nlStatus}</span>}
          </form>

          <div className="footer-links">
            <button className="footer-link" onClick={() => setPolicyOpen(true)}>
              <Shield size={12} />
              {t('footer.privacy_policy')}
            </button>
            <span className="footer-separator">|</span>
            <a href="mailto:retroswaves@gmail.com" className="footer-link">
              <Mail size={12} />
              retroswaves@gmail.com
            </a>
          </div>

          <p className="footer-lgpd">
            {t('footer.lgpd_text')}
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
    <ErrorBoundary>
      <Router>
        <I18nProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppContent />
            </ErrorBoundary>
          </ToastProvider>
        </I18nProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
