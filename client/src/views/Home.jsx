import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API_URL } from '../config.js';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, ChevronLeft, ChevronRight, Pin, Percent, Heart, Share2, Star, Send, Copy, AlertTriangle, Camera } from 'lucide-react';

// ═══════════════════════════════════════
// PROMO COUNTDOWN — Contagem regressiva
// ═══════════════════════════════════════
function PromoCountdown({ fim }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const end = new Date(fim + 'T23:59:59');
    const calc = () => {
      const diff = end - new Date();
      if (diff <= 0) { setTimeLeft(''); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setTimeLeft(`${d}d ${String(h).padStart(2,'0')}h`);
      else setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [fim]);

  if (!timeLeft) return null;
  return <span className="promo-countdown">⏱ {timeLeft}</span>;
}
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

// ═══════════════════════════════════════
// PRODUCT CARD 3D — Mouse Tracking + Glassmorphism (Optimized)
// ═══════════════════════════════════════
function ProductCard3D({ children, onClick }) {
  const cardRef = useRef(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0 });
  const rafRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    if (!cardRef.current) return;

    // Cancelar animação anterior para evitar bugs
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Reduzir para 5 graus (mais suave, menos bug)
      const rotateX = ((y - centerY) / centerY) * -5;
      const rotateY = ((x - centerX) / centerX) * 5;

      setTransform({ rotateX, rotateY });
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setTransform({ rotateX: 0, rotateY: 0 });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={cardRef}
      className="product-card-3d"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        transform: `rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg)`,
      }}
    >
      <div className="glass-shelf" />
      {children}
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
function HeroBanner({ config, t }) {
  const navigate = useNavigate();
  if (!config || config.banner_ativo !== '1') return null;
  const hasBgImage = !!config.banner_imagem;

  return (
    <div className="hero-banner">
      {hasBgImage && <img src={`${API_URL}/api/banner-image`} alt="Banner" className="hero-banner-bg" loading="eager" />}
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
            {t('home.hero_cta')}
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

function ProductModal({ produto, onClose, onAddToCart, favorites, toggleFavorite, siteConfig, t }) {
  const [selectedSize, setSelectedSize] = useState('M');
  const [extraImages, setExtraImages] = useState([]);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ nome: '', email: '', nota: 5, comentario: '', foto: null });
  const [reviewFotoPreview, setReviewFotoPreview] = useState(null);
  const [reviewSending, setReviewSending] = useState(false);
  const [shareMsg, setShareMsg] = useState('');

  useEffect(() => {
    if (!produto) return;
    setCurrentImgIdx(0);
    setExtraImages([]);
    setZoomed(false);
    setShowReviewForm(false);
    setShareMsg('');
    setReviewFotoPreview(null);

    if (produto.imgCount > 0) {
      fetch(`${API_URL}/api/produtos/${produto.id}/imagens`)
        .then(r => r.json())
        .then(imgs => setExtraImages(imgs.map(i => `${API_URL}/api/imagens/${i.id}/bin`)))
        .catch(() => {});
    }

    // Load reviews
    fetch(`${API_URL}/api/produtos/${produto.id}/avaliacoes`)
      .then(r => r.json())
      .then(setReviews)
      .catch(() => {});
  }, [produto?.id]);

  const mainThumbUrl = produto ? `${API_URL}/api/produtos/${produto.id}/thumb` : '';
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setShareMsg(t('home.link_copied'));
    setTimeout(() => setShareMsg(''), 2000);
  };

  // WhatsApp buy removed

  // Review submit (C8)
  const submitReview = async () => {
    if (!reviewForm.nome || !reviewForm.email || !reviewForm.nota) return;
    setReviewSending(true);
    try {
      await fetch(`${API_URL}/api/avaliacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...reviewForm, produto_id: produto.id })
      });
      setShowReviewForm(false);
      setReviewForm({ nome: '', email: '', nota: 5, comentario: '', foto: null });
      setReviewFotoPreview(null);
      // Reload reviews
      const res = await fetch(`${API_URL}/api/produtos/${produto.id}/avaliacoes`);
      setReviews(await res.json());
    } catch {} finally { setReviewSending(false); }
  };

  const handleReviewFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      // Resize/compress via canvas to max 800px
      const img = new window.Image();
      img.onload = () => {
        const maxW = 800;
        let w = img.width, h = img.height;
        if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const b64 = canvas.toDataURL('image/jpeg', 0.75);
        setReviewFotoPreview(b64);
        setReviewForm(p => ({ ...p, foto: b64 }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
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
          {promoAtiva && <div className="modal-promo-badge">{t('home.promo')} {produto.promoLabel}{produto.promo_fim && <PromoCountdown fim={produto.promo_fim} />}</div>}
          {!!produto.destaque && <div className="modal-destaque-badge"><Pin size={12} /> {t('home.highlight')}</div>}

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
              {allImages[currentImgIdx]?.startsWith('data:video/') ? (
                <video key={currentImgIdx} src={allImages[currentImgIdx]}
                  autoPlay loop muted playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              ) : (
                <motion.img key={currentImgIdx} src={allImages[currentImgIdx]} alt={produto.nome}
                  initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.2 }} draggable={false} />
              )}
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
              <div className="modal-info-item"><span className="modal-info-label">{t('home.condition').toUpperCase()}</span><span className="modal-info-value">{t('home.condition_value').toUpperCase()}</span></div>
              <div className="modal-info-item"><span className="modal-info-label">{t('home.type').toUpperCase()}</span><span className="modal-info-value">{t('home.type_value').toUpperCase()}</span></div>
              <div className="modal-info-item"><span className="modal-info-label">{t('home.liga').toUpperCase()}</span><span className="modal-info-value">{produto.liga}</span></div>
              <div className="modal-info-item"><span className="modal-info-label">{t('home.material').toUpperCase()}</span><span className="modal-info-value">{t('home.material_value').toUpperCase()}</span></div>
            </div>

            {/* Size Selector with stock badge (A5) */}
            <div className="size-selector">
              <span className="size-selector-label">{t('home.size').toUpperCase()}</span>
              <div className="size-options">
                {SIZES.map(size => {
                  const sizeStock = produto[`estoque_${size.toLowerCase()}`];
                  const sizeOut = sizeStock === 0;
                  return (
                    <button key={size} type="button"
                      className={`size-btn ${selectedSize === size ? 'active' : ''} ${sizeOut ? 'size-esgotado' : ''}`}
                      onClick={() => !sizeOut && setSelectedSize(size)} disabled={sizeOut}>
                      {size}
                      {sizeOut && <span className="size-esgotado-label">{t('home.sold_out')}</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button className="modal-add-btn" disabled={esgotado}
              onClick={() => { if (!esgotado) { onAddToCart(produto, selectedSize); onClose(); } }}>
              <ShoppingBag size={16} />
              {esgotado ? t('home.sold_out') : `${t('home.add_to_cart')} — ${t('home.size').toUpperCase()} ${selectedSize}`}
            </button>

            {/* Share (C2) */}
            <div className="modal-share-row">
              <button onClick={handleCopyLink} className="modal-share-btn"><Copy size={12} /> {t('home.copy_link').toUpperCase()}</button>
              {shareMsg && <span className="modal-share-msg">{shareMsg}</span>}
            </div>

            {/* Reviews section (C8) */}
            <div className="modal-reviews-section">
              <div className="modal-reviews-header">
                <h4><Star size={14} /> {t('home.reviews_title')} ({reviews.length})</h4>
                <button className="modal-review-write-btn" onClick={() => setShowReviewForm(f => !f)}>
                  {showReviewForm ? t('home.review_cancel') : t('home.review_write')}
                </button>
              </div>

              {showReviewForm && (
                <div className="modal-review-form">
                  <input type="text" placeholder={t('home.review_name').toUpperCase()} value={reviewForm.nome} onChange={e => setReviewForm(p => ({ ...p, nome: e.target.value }))} />
                  <input type="email" placeholder={t('home.review_email').toUpperCase()} value={reviewForm.email} onChange={e => setReviewForm(p => ({ ...p, email: e.target.value }))} />
                  <div className="review-stars-input">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button key={n} className={`review-star-btn ${reviewForm.nota >= n ? 'active' : ''}`} onClick={() => setReviewForm(p => ({ ...p, nota: n }))}>★</button>
                    ))}
                  </div>
                  <textarea placeholder={t('home.review_comment').toUpperCase()} value={reviewForm.comentario} onChange={e => setReviewForm(p => ({ ...p, comentario: e.target.value }))} rows={3} />
                  {/* Photo upload */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.6rem', letterSpacing: 1.5, opacity: 0.7, padding: '7px 12px', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: 4 }}>
                      <Camera size={13} /> ADICIONAR FOTO (opcional)
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleReviewFoto} />
                    </label>
                    {reviewFotoPreview && (
                      <div style={{ position: 'relative' }}>
                        <img src={reviewFotoPreview} alt="preview" style={{ width: 52, height: 52, objectFit: 'cover', borderRadius: 4 }} />
                        <button onClick={() => { setReviewFotoPreview(null); setReviewForm(p => ({ ...p, foto: null })); }} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    )}
                  </div>
                  <button className="review-submit-btn" onClick={submitReview} disabled={reviewSending || !reviewForm.nome || !reviewForm.email}>
                    <Send size={12} /> {reviewSending ? '...' : t('home.review_submit')}
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
                      {r.foto && <img src={r.foto} alt="foto da avaliação" style={{ maxWidth: 120, maxHeight: 120, borderRadius: 4, marginTop: 6, objectFit: 'cover' }} />}
                      <span className="review-item-date">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              )}
              {reviews.length === 0 && !showReviewForm && (
                <p style={{ opacity: 0.3, fontSize: '0.65rem', letterSpacing: 1 }}>{t('home.no_reviews')}</p>
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
function Home({ ligaAtiva, addToCart, searchQuery = '', forceReload = 0, cliente = null }) {
  const { t } = useI18n();
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

  // Favorites (C1) — synced with backend when logged in
  const [favorites, setFavorites] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FAV_KEY) || '[]')); } catch { return new Set(); }
  });

  // Load wishlist from backend on login
  useEffect(() => {
    if (!cliente?.email) return;
    fetch(`${API_URL}/api/cliente/wishlist?email=${encodeURIComponent(cliente.email)}`)
      .then(r => r.json())
      .then(ids => {
        if (Array.isArray(ids) && ids.length > 0) {
          setFavorites(prev => {
            const merged = new Set([...prev, ...ids]);
            localStorage.setItem(FAV_KEY, JSON.stringify([...merged]));
            return merged;
          });
        }
      })
      .catch(() => {});
  }, [cliente?.email]);

  const toggleFavorite = useCallback((id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      const adding = !next.has(id);
      adding ? next.add(id) : next.delete(id);
      localStorage.setItem(FAV_KEY, JSON.stringify([...next]));

      // Sync with backend if logged in
      if (cliente?.email) {
        fetch(`${API_URL}/api/cliente/wishlist`, {
          method: adding ? 'POST' : 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cliente.email, produto_id: id })
        }).catch(() => {});
      }
      return next;
    });
  }, [cliente?.email]);

  // State transition
  const [phase, setPhase] = useState('visible');
  const [displayFilter, setDisplayFilter] = useState({ liga: ligaAtiva, query: searchQuery });
  const filterRef = useRef({ liga: ligaAtiva, query: searchQuery });
  const isFirstRender = useRef(true);
  const lastReload = useRef(0);

  useEffect(() => {
    fetch(`${API_URL}/api/config`).then(r => r.json()).then(setSiteConfig).catch(() => {});
  }, []);

  useEffect(() => {
    if (allProdutos.length > 0 && forceReload === lastReload.current) { setLoading(false); return; }
    lastReload.current = forceReload;
    fetch(`${API_URL}/api/produtos`)
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
    fetch(`${API_URL}/api/clique/${produto.id}`, { method: 'POST' }).catch(() => {});
    setSelectedProduct(produto);
  }, []);

  if (loading) return <SkeletonGrid />;

  const gridClass = `product-grid ${phase === 'exiting' ? 'grid-exit' : ''} ${phase === 'entering' ? 'grid-enter' : ''}`;
  const showBanner = !displayFilter.liga && !displayFilter.query.trim();

  return (
    <>
      {showBanner && <HeroBanner config={siteConfig} t={t} />}

      <div className={gridClass}>
        {produtos.length === 0 && phase !== 'exiting' && (
          <div className="empty-state">{t('home.empty')}</div>
        )}

        {produtos.map((produto, index) => {
          const preco = parseFloat(produto.preco);
          const precoFinal = parseFloat(produto.precoFinal || produto.preco);
          const promoAtiva = produto.promoAtiva;
          const isFav = favorites.has(produto.id);
          const allSizesOut = [produto.estoque_p, produto.estoque_m, produto.estoque_g, produto.estoque_gg].every(e => e === 0);

          // Estoque baixo: menor valor positivo entre 1 e 3
          const stockValues = [produto.estoque_p, produto.estoque_m, produto.estoque_g, produto.estoque_gg]
            .filter(e => e > 0);
          const minStock = stockValues.length > 0 ? Math.min(...stockValues) : null;
          const estoqueAvisar = minStock !== null && minStock <= 3;

          return (
            <div key={produto.id}
              className={`product-item ${produto.destaque ? 'item-destaque' : ''} ${allSizesOut ? 'item-esgotado' : ''}`}
              style={{ '--i': Math.min(index, 11) }}>

              <ProductCard3D onClick={() => handleClique(produto)}>
                <LazyImage src={`${API_URL}/api/produtos/${produto.id}/thumb`} alt={produto.nome} />

              {/* Badges */}
              {promoAtiva && (
                <span className="badge-promo">
                  <Percent size={10} /> {t('home.promo')} {produto.promoLabel}
                  {produto.promo_fim && <PromoCountdown fim={produto.promo_fim} />}
                </span>
              )}
              {!!produto.destaque && <span className="badge-destaque"><Pin size={10} /></span>}
              {allSizesOut && <span className="badge-esgotado">{t('home.sold_out')}</span>}
              {!allSizesOut && estoqueAvisar && (
                <span className="badge-estoque-baixo"><AlertTriangle size={9} /> úItimas {minStock} und.</span>
              )}

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
                  onClick={(e) => { e.stopPropagation(); if (!allSizesOut) handleClique(produto); }}>
                  {allSizesOut ? t('home.sold_out') : t('home.add_to_cart')}
                </button>
              </div>
              </ProductCard3D>
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
            t={t}
          />
        )}
      </AnimatePresence>
    </>
  );
}

export default Home;
