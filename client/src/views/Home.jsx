import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ChevronLeft, ChevronRight, Pin, Percent, Heart, Share2, MessageCircle, Star, Send, ExternalLink, Copy } from 'lucide-react';

const API = 'http://localhost:3001';
const CACHE_KEY = 'retrowave_produtos_v3';
const CACHE_TS_KEY = 'retrowave_produtos_v3_ts';
const CACHE_TTL = 10 * 60 * 1000;
const FAV_KEY = 'retrowave_favoritos';

// ═══════════════════════════════════════
// LAZY IMAGE — IntersectionObserver + Shimmer
// ═══════════════════════════════════════
function LazyImage({ src, alt, onClick }) {
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [showReady, setShowReady] = useState(false);
  const [inView, setInView] = useState(false);
  const mountTime = useRef(Date.now());

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '200px 0px', threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const elapsed = Date.now() - mountTime.current;
    const remaining = Math.max(0, 1000 - elapsed);
    const timer = setTimeout(() => setShowReady(true), remaining);
    return () => clearTimeout(timer);
  }, [loaded]);

  return (
    <div ref={imgRef} className={`lazy-img-wrap ${showReady ? 'loaded' : ''}`}>
      {!showReady && <div className="shimmer-placeholder" />}
      {inView && (
        <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false}
          onLoad={() => setLoaded(true)} onClick={onClick} />
      )}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="skeleton-grid">
      {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton-card" />)}
    </div>
  );
}

// ═══════════════════════════════════════
// HERO BANNER
// ═══════════════════════════════════════
function HeroBanner({ config }) {
  const navigate = useNavigate();
  if (!config || config.banner_ativo !== '1') return null;
  const hasBgImage = !!config.banner_imagem;

  return (
    <div className="hero-banner">
      {hasBgImage && <img src={`${API}/api/banner-image`} alt="Banner" className="hero-banner-bg" loading="eager" />}
      <div className="hero-banner-overlay">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}>
          {config.banner_titulo || 'RETRO WAVE'}
        </motion.h1>
        {config.banner_subtitulo && (
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}>
            {config.banner_subtitulo}
          </motion.p>
        )}
        {config.banner_link && (
          <motion.button className="hero-banner-cta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
            onClick={() => navigate(config.banner_link)}>
            VER COLEÇÃO →
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// PRODUCT MODAL with reviews, share, zoom, whatsapp
// ═══════════════════════════════════════
const SIZES = ['P', 'M', 'G', 'GG'];

function ProductModal({ produto, onClose, onAddToCart, favorites, toggleFavorite, siteConfig }) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [extraImages, setExtraImages] = useState([]);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ nome: '', email: '', nota: 5, comentario: '' });
  const [reviewSending, setReviewSending] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    if (!produto) return;
    setCurrentImgIdx(0);
    setExtraImages([]);
    setZoomed(false);
    setShowReviewForm(false);
    setShareMsg('');

    if (produto.imgCount > 0) {
      fetch(`${API}/api/produtos/${produto.id}/imagens`)
        .then(r => r.json())
        .then(imgs => setExtraImages(imgs.map(i => `${API}/api/imagens/${i.id}/bin`)))
        .catch(() => {});
    }

    // Load reviews
    fetch(`${API}/api/produtos/${produto.id}/avaliacoes`)
      .then(r => r.json())
      .then(setReviews)
      .catch(() => {});
  }, [produto?.id]);

  const mainThumbUrl = produto ? `${API}/api/produtos/${produto.id}/thumb` : '';
  const allImages = useMemo(() => {
    if (!produto) return [];
    return [mainThumbUrl, ...extraImages];
  }, [produto, mainThumbUrl, extraImages]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && allImages.length > 1) setCurrentImgIdx(i => (i + 1) % allImages.length);
      if (e.key === 'ArrowLeft' && allImages.length > 1) setCurrentImgIdx(i => (i - 1 + allImages.length) % allImages.length);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, allImages.length]);

  if (!produto) return null;

  const preco = parseFloat(produto.preco);
  const precoFinal = parseFloat(produto.precoFinal || produto.preco);
  const promoAtiva = produto.promoAtiva;
  const isFav = favorites.has(produto.id);

  // Stock check
  const estoqueKey = `estoque_${selectedSize.toLowerCase()}`;
  const estoque = produto[estoqueKey];
  const esgotado = estoque === 0;

  // Zoom handlers (C6)
  const handleMouseMove = (e) => {
    if (!zoomed) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  // Share (C2)
  const shareUrl = `${window.location.origin}/?produto=${produto.id}`;
  const shareText = `${produto.nome} — R$ ${precoFinal.toFixed(2)} | Retro Wave`;

  const handleShareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + '\n' + shareUrl)}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareMsg('Link copiado!');
    setTimeout(() => setShareMsg(''), 2000);
  };

  // WhatsApp buy (C7)
  const whatsappNumber = siteConfig?.whatsapp || '5511999999999';
  const whatsappMsg = `Olá! Tenho interesse na camisa *${produto.nome}* (${produto.liga}) — Tamanho ${selectedSize} — R$ ${precoFinal.toFixed(2)}`;

  // Review submit (C8)
  const submitReview = async () => {
    if (!reviewForm.nome || !reviewForm.email || !reviewForm.nota) return;
    setReviewSending(true);
    try {
      await fetch(`${API}/api/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reviewForm, produto_id: produto.id })
      });
      setShowReviewForm(false);
      setReviewForm({ nome: '', email: '', nota: 5, comentario: '' });
      // Reload reviews
      const res = await fetch(`${API}/api/produtos/${produto.id}/avaliacoes`);
      setReviews(await res.json());
    } catch {} finally { setReviewSending(false); }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((a, r) => a + r.nota, 0) / reviews.length).toFixed(1) : null;

  return (
    <motion.div className="product-modal-overlay"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }} onClick={onClose}>
      <motion.div className="product-modal"
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}>

        <button className="modal-close" onClick={onClose}><X size={24} /></button>

        {/* Image side */}
        <div className="modal-image-section">
          {promoAtiva && <div className="modal-promo-badge">PROMO {produto.promoLabel}</div>}
          {!!produto.destaque && <div className="modal-destaque-badge"><Pin size={12} /> DESTAQUE</div>}

          {/* Favorite button (C1) */}
          <button className={`modal-fav-btn ${isFav ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(produto.id); }}>
            <Heart size={18} fill={isFav ? '#fff' : 'none'} />
          </button>

          {allImages.length > 1 && (
            <button className="modal-team-nav modal-team-prev" onClick={() => setCurrentImgIdx(i => (i - 1 + allImages.length) % allImages.length)}>
              <ChevronLeft size={22} />
            </button>
          )}

          {/* Zoom container (C6) */}
          <div
            className={`modal-zoom-container ${zoomed ? 'zoomed' : ''}`}
            onClick={() => setZoomed(z => !z)}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setZoomed(false)}
            style={zoomed ? { '--zoom-x': `${zoomPos.x}%`, '--zoom-y': `${zoomPos.y}%` } : {}}
          >
            <AnimatePresence mode="wait">
              <motion.img key={currentImgIdx} src={allImages[currentImgIdx]} alt={produto.nome}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }} draggable={false} />
            </AnimatePresence>
          </div>

          {allImages.length > 1 && (
            <button className="modal-team-nav modal-team-next" onClick={() => setCurrentImgIdx(i => (i + 1) % allImages.length)}>
              <ChevronRight size={22} />
            </button>
          )}

          {allImages.length > 1 && (
            <div className="modal-team-dots">
              {allImages.map((_, i) => (
                <button key={i} className={`modal-team-dot ${i === currentImgIdx ? 'active' : ''}`} onClick={() => setCurrentImgIdx(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Details side */}
        <div className="modal-details">
          <div>
            <p className="modal-liga">{produto.liga}</p>
            <h2 className="modal-nome">{produto.nome}</h2>

            {avgRating && (
              <div className="modal-rating-summary">
                <span className="modal-stars">{'★'.repeat(Math.round(parseFloat(avgRating)))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating)))}</span>
                <span>{avgRating} ({reviews.length})</span>
              </div>
            )}

            {promoAtiva ? (
              <div className="modal-preco-container">
                <span className="modal-preco-old">R$ {preco.toFixed(2)}</span>
                <span className="modal-preco-promo">R$ {precoFinal.toFixed(2)}</span>
              </div>
            ) : (
              <p className="modal-preco">R$ {preco.toFixed(2)}</p>
            )}

            {produto.descricao && <p className="modal-descricao">{produto.descricao}</p>}

            <div className="modal-divider" />

            <div className="modal-info-grid">
              <div className="modal-info-item"><span className="modal-info-label">CONDIÇÃO</span><span className="modal-info-value">RETRO — NOVA</span></div>
              <div className="modal-info-item"><span className="modal-info-label">TIPO</span><span className="modal-info-value">CAMISA DE TIME</span></div>
              <div className="modal-info-item"><span className="modal-info-label">LIGA</span><span className="modal-info-value">{produto.liga}</span></div>
              <div className="modal-info-item"><span className="modal-info-label">MATERIAL</span><span className="modal-info-value">POLIÉSTER 100%</span></div>
            </div>

            {/* Size Selector with stock badge (A5) */}
            <div className="size-selector">
              <span className="size-selector-label">TAMANHO</span>
              <div className="size-options">
                {SIZES.map(size => {
                  const sizeStock = produto[`estoque_${size.toLowerCase()}`];
                  const sizeOut = sizeStock === 0;
                  return (
                    <button key={size} type="button"
                      className={`size-btn ${selectedSize === size ? 'active' : ''} ${sizeOut ? 'size-esgotado' : ''}`}
                      onClick={() => !sizeOut && setSelectedSize(size)} disabled={sizeOut}>
                      {size}
                      {sizeOut && <span className="size-esgotado-label">ESGOTADO</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="modal-add-btn" disabled={esgotado}
              onClick={() => { if (!esgotado) { onAddToCart(produto, selectedSize); onClose(); } }}>
              <ShoppingBag size={16} />
              {esgotado ? 'ESGOTADO' : `ADICIONAR AO CARRINHO — TAM ${selectedSize}`}
            </button>

            {/* WhatsApp buy (C7) */}
            <a className="modal-whatsapp-btn" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> COMPRAR VIA WHATSAPP
            </a>

            {/* Share (C2) */}
            <div className="modal-share-row">
              <button onClick={handleShareWhatsApp} className="modal-share-btn"><ExternalLink size={12} /> WHATSAPP</button>
              <button onClick={handleCopyLink} className="modal-share-btn"><Copy size={12} /> COPIAR LINK</button>
              {shareMsg && <span className="modal-share-msg">{shareMsg}</span>}
            </div>

            {/* Reviews section (C8) */}
            <div className="modal-reviews-section">
              <div className="modal-reviews-header">
                <h4><Star size={14} /> AVALIAÇÕES ({reviews.length})</h4>
                <button className="modal-review-write-btn" onClick={() => setShowReviewForm(f => !f)}>
                  {showReviewForm ? 'CANCELAR' : 'AVALIAR'}
                </button>
              </div>

              {showReviewForm && (
                <div className="modal-review-form">
                  <input type="text" placeholder="SEU NOME" value={reviewForm.nome} onChange={e => setReviewForm(p => ({ ...p, nome: e.target.value }))} />
                  <input type="email" placeholder="SEU E-MAIL" value={reviewForm.email} onChange={e => setReviewForm(p => ({ ...p, email: e.target.value }))} />
                  <div className="review-stars-input">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className={`review-star-btn ${reviewForm.nota >= n ? 'active' : ''}`} onClick={() => setReviewForm(p => ({ ...p, nota: n }))}>★</button>
                    ))}
                  </div>
                  <textarea placeholder="COMENTÁRIO (opcional)" value={reviewForm.comentario} onChange={e => setReviewForm(p => ({ ...p, comentario: e.target.value }))} rows={3} />
                  <button className="review-submit-btn" onClick={submitReview} disabled={reviewSending || !reviewForm.nome || !reviewForm.email}>
                    <Send size={12} /> {reviewSending ? 'ENVIANDO...' : 'ENVIAR AVALIAÇÃO'}
                  </button>
                </div>
              )}

              {reviews.length > 0 && (
                <div className="modal-reviews-list">
                  {reviews.slice(0, 5).map(r => (
                    <div key={r.id} className="modal-review-item">
                      <div className="review-item-header">
                        <span className="review-item-name">{r.nome}</span>
                        <span className="review-item-stars">{'★'.repeat(r.nota)}{'☆'.repeat(5 - r.nota)}</span>
                      </div>
                      {r.comentario && <p className="review-item-text">{r.comentario}</p>}
                      <span className="review-item-date">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
              {reviews.length === 0 && !showReviewForm && (
                <p style={{ opacity: 0.3, fontSize: '0.65rem', letterSpacing: 1 }}>Nenhuma avaliação ainda. Seja o primeiro!</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════
// HOME
// ═══════════════════════════════════════
function Home({ ligaAtiva, addToCart, searchQuery = '', forceReload = 0 }) {
  const [allProdutos, setAllProdutos] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      const ts = sessionStorage.getItem(CACHE_TS_KEY);
      if (cached && ts && (Date.now() - Number(ts)) < CACHE_TTL) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(allProdutos.length === 0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [siteConfig, setSiteConfig] = useState(null);

  // Favorites (C1)
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { return new Set(); }
  });

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  // State transition
  const [phase, setPhase] = useState('visible');
  const [displayFilter, setDisplayFilter] = useState({ liga: ligaAtiva, query: searchQuery });
  const filterRef = useRef({ liga: ligaAtiva, query: searchQuery });
  const isFirstRender = useRef(true);
  const lastReload = useRef(0);

  useEffect(() => {
    fetch(`${API}/api/config`).then(r => r.json()).then(setSiteConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (allProdutos.length > 0 && forceReload === lastReload.current) { setLoading(false); return; }
    lastReload.current = forceReload;
    fetch(`${API}/api/produtos`)
      .then(res => res.json())
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setAllProdutos(arr);
        setLoading(false);
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(arr)); sessionStorage.setItem(CACHE_TS_KEY, String(Date.now())); } catch {}
      })
      .catch(err => { console.error('Erro ao carregar produtos:', err); if (allProdutos.length === 0) setAllProdutos([]); setLoading(false); });
  }, [forceReload]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; filterRef.current = { liga: ligaAtiva, query: searchQuery }; return; }
    if (filterRef.current.liga !== ligaAtiva || filterRef.current.query !== searchQuery) {
      filterRef.current = { liga: ligaAtiva, query: searchQuery };
      setPhase('exiting');
      const exitTimer = setTimeout(() => {
        setDisplayFilter({ liga: ligaAtiva, query: searchQuery });
        setPhase('entering');
        const enterTimer = setTimeout(() => setPhase('visible'), 400);
        return () => clearTimeout(enterTimer);
      }, 280);
      return () => clearTimeout(exitTimer);
    }
  }, [ligaAtiva, searchQuery]);

  const produtos = useMemo(() => {
    let filtered = allProdutos;
    if (displayFilter.liga) filtered = filtered.filter(p => p.liga === displayFilter.liga);
    if (displayFilter.query.trim()) {
      const q = displayFilter.query.toLowerCase().trim();
      filtered = filtered.filter(p => p.nome.toLowerCase().includes(q) || p.liga.toLowerCase().includes(q));
    }
    return filtered;
  }, [displayFilter, allProdutos]);

  const handleClique = useCallback((produto) => {
    fetch(`${API}/api/clique/${produto.id}`, { method: 'POST' }).catch(() => {});
    setSelectedProduct(produto);
  }, []);

  if (loading) return <SkeletonGrid />;

  const gridClass = `product-grid ${phase === 'exiting' ? 'grid-exit' : ''} ${phase === 'entering' ? 'grid-enter' : ''}`;
  const showBanner = !displayFilter.liga && !displayFilter.query.trim();

  return (
    <>
      {showBanner && <HeroBanner config={siteConfig} />}

      <div className={gridClass}>
        {produtos.length === 0 && phase !== 'exiting' && (
          <div className="empty-state">NENHUMA CAMISA ENCONTRADA</div>
        )}

        {produtos.map((produto, index) => {
          const preco = parseFloat(produto.preco);
          const precoFinal = parseFloat(produto.precoFinal || produto.preco);
          const promoAtiva = produto.promoAtiva;
          const isFav = favorites.has(produto.id);
          const allSizesOut = [produto.estoque_p, produto.estoque_m, produto.estoque_g, produto.estoque_gg].every(e => e === 0);

          return (
            <div key={produto.id}
              className={`product-item ${produto.destaque ? 'item-destaque' : ''} ${allSizesOut ? 'item-esgotado' : ''}`}
              style={{ '--i': Math.min(index, 11) }}
              onClick={() => handleClique(produto)}>

              <LazyImage src={`${API}/api/produtos/${produto.id}/thumb`} alt={produto.nome} />

              {/* Badges */}
              {promoAtiva && <span className="badge-promo"><Percent size={10} /> PROMO {produto.promoLabel}</span>}
              {!!produto.destaque && <span className="badge-destaque"><Pin size={10} /></span>}
              {allSizesOut && <span className="badge-esgotado">ESGOTADO</span>}

              {/* Favorite heart (C1) */}
              <button className={`card-fav-btn ${isFav ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(produto.id); }}>
                <Heart size={16} fill={isFav ? '#fff' : 'none'} />
              </button>

              <div className="product-info">
                <p className="liga-tag">{produto.liga}</p>
                <h3>{produto.nome}</h3>

                {promoAtiva ? (
                  <div className="preco-promo-wrap">
                    <span className="preco-old">R$ {preco.toFixed(2)}</span>
                    <span className="preco-novo">R$ {precoFinal.toFixed(2)}</span>
                  </div>
                ) : (
                  <p className="preco">R$ {preco.toFixed(2)}</p>
                )}

                <button className="add-to-cart-btn" disabled={allSizesOut}
                  onClick={(e) => { e.stopPropagation(); if (!allSizesOut) addToCart(produto); }}>
                  {allSizesOut ? 'ESGOTADO' : 'ADICIONAR AO CARRINHO'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            produto={selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onAddToCart={addToCart}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            siteConfig={siteConfig}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Home;
