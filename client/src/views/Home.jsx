import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API_URL } from '../config.js';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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
const FAV_KEY = 'retrowave_favoritos';
const PAGE_LIMIT = 20;

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
// PRODUCT CARD 3D — Slideshow on hover + 3D tilt
// ═══════════════════════════════════════
function ProductCard3D({ children, onClick, productId, imgCount, onSlidePause, onSlideResume }) {
  const wrapRef = useRef(null);
  const cardRef = useRef(null);
  const intervalRef = useRef(null);
  const [slideImages, setSlideImages] = useState([]);
  const [slideIdx, setSlideIdx] = useState(0);
  const [hovering, setHovering] = useState(false);
  const imagesLoaded = useRef(false);
  const pausedRef = useRef(false);

  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setSlideIdx(prev => (prev + 1) % Math.max(slideImages.length, 2));
      }
    }, 1500);
  }, [slideImages.length]);

  const handleMouseMove = useCallback((e) => {
    const wrap = wrapRef.current;
    const card = cardRef.current;
    if (!wrap || !card) return;
    const rect = wrap.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const cx = Math.max(0.05, Math.min(0.95, x));
    const cy = Math.max(0.05, Math.min(0.95, y));
    card.style.setProperty('--rx', `${(cy - 0.5) * -14}deg`);
    card.style.setProperty('--ry', `${(cx - 0.5) * 14}deg`);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setHovering(true);
    if (!imagesLoaded.current && imgCount > 0 && productId) {
      imagesLoaded.current = true;
      fetch(`${API_URL}/api/produtos/${productId}/imagens`)
        .then(r => r.json())
        .then(imgs => {
          const urls = imgs.map(i => `${API_URL}/api/imagens/${i.id}/bin`);
          if (urls.length > 0) {
            const mainThumb = `${API_URL}/api/produtos/${productId}/thumb`;
            setSlideImages([mainThumb, ...urls]);
            // Pré-carregar apenas a primeira imagem extra (não todas)
            if (urls[0]) { const img = new Image(); img.src = urls[0]; }
          }
        })
        .catch(() => {});
    }
    if (slideImages.length > 1 || imgCount > 0) {
      startInterval();
    }
  }, [productId, imgCount, slideImages.length, startInterval]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    pausedRef.current = false;
    setHovering(false);
    setSlideIdx(0);
  }, []);

  const pauseSlide = useCallback(() => { pausedRef.current = true; }, []);
  const resumeSlide = useCallback(() => { pausedRef.current = false; }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Expose pause/resume on DOM element for child buttons
  useEffect(() => {
    const el = wrapRef.current;
    if (el) { el.__pauseSlide = pauseSlide; el.__resumeSlide = resumeSlide; }
  }, [pauseSlide, resumeSlide]);

  return (
    <div
      ref={wrapRef}
      className="product-card-3d-wrap"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <div ref={cardRef} className="product-card-3d">
        {slideImages.length > 1 && hovering && (
          <div className="card-slideshow-overlay">
            {slideImages.map((src, i) => (
              <img key={src} src={src} alt="" loading="lazy" draggable={false}
                className={i === (slideIdx % slideImages.length) ? 'slide-active' : ''} />
            ))}
          </div>
        )}
        {children}
      </div>
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
// BANNER SPARKLE CANVAS
// ═══════════════════════════════════════
function BannerSparkle({ speed = 'medium', effect = 'cometa' }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const speedMap = { superslow: 0.001, slow: 0.003, medium: 0.007, fast: 0.016 };
    const spd = speedMap[speed] || 0.007;

    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const perimPt = (t, w, h) => {
      const d = t * 2 * (w + h);
      if (d < w)          return { x: d, y: 0 };
      if (d < w + h)      return { x: w, y: d - w };
      if (d < 2 * w + h)  return { x: w - (d - w - h), y: h };
      return { x: 0, y: h - (d - 2 * w - h) };
    };

    const sparks = effect === 'faisca'
      ? Array.from({ length: 30 }, () => ({
          t: Math.random(), age: Math.random(), life: 0.5 + Math.random() * 1.5, r: 1.5 + Math.random() * 3,
        }))
      : [];

    let prog = 0;
    let raf;

    const draw = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (effect === 'cometa') {
        [0, 0.5].forEach(off => {
          const ct = (prog + off) % 1;
          for (let i = 0; i < 60; i++) {
            const ft = (ct - (i / 60) * 0.12 + 1) % 1;
            const { x, y } = perimPt(ft, w, h);
            const p = 1 - i / 60;
            ctx.beginPath();
            ctx.arc(x, y, p * 3.5 + 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${Math.round(120 + 135 * p)},${Math.round(60 + 195 * p)},255,${p * 0.9})`;
            ctx.fill();
          }
          const { x: hx, y: hy } = perimPt(ct, w, h);
          const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 18);
          g.addColorStop(0, 'rgba(255,255,255,1)');
          g.addColorStop(0.3, 'rgba(180,120,255,0.8)');
          g.addColorStop(1, 'rgba(80,40,200,0)');
          ctx.beginPath(); ctx.arc(hx, hy, 18, 0, Math.PI * 2);
          ctx.fillStyle = g; ctx.fill();
        });
      } else if (effect === 'pulsar') {
        const p = (Math.sin(prog * Math.PI * 2 * 4) + 1) / 2;
        const alpha = 0.3 + p * 0.7;
        const lw = 3 + p * 8;
        ctx.save();
        ctx.strokeStyle = `rgba(160,80,255,${alpha})`;
        ctx.lineWidth = lw;
        ctx.shadowColor = 'rgba(180,80,255,0.9)';
        ctx.shadowBlur = 20 + p * 25;
        ctx.strokeRect(lw / 2, lw / 2, w - lw, h - lw);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = `rgba(255,150,255,${alpha * 0.6})`;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(255,100,255,0.5)';
        ctx.shadowBlur = 10 * p;
        ctx.strokeRect(10, 10, w - 20, h - 20);
        ctx.restore();
      } else if (effect === 'aurora') {
        for (let i = 0; i < 250; i++) {
          const tp = (prog + i / 250 * 0.6) % 1;
          const { x, y } = perimPt(tp, w, h);
          const hue = ((i / 250) * 240 + prog * 360) % 360;
          const r = Math.max(0.5, 2 + Math.sin((i / 250) * Math.PI * 4 + prog * 10) * 1);
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue},100%,65%,0.75)`;
          ctx.fill();
        }
      } else if (effect === 'faisca') {
        sparks.forEach(s => {
          s.age += spd * 1.5;
          if (s.age > s.life) {
            s.t = Math.random(); s.age = 0; s.life = 0.3 + Math.random() * 1.2; s.r = 1.5 + Math.random() * 3;
          }
          const fade = s.age < s.life * 0.3
            ? s.age / (s.life * 0.3)
            : 1 - (s.age - s.life * 0.3) / (s.life * 0.7);
          const { x, y } = perimPt(s.t, w, h);
          const gr = ctx.createRadialGradient(x, y, 0, x, y, s.r * 5);
          gr.addColorStop(0, `rgba(255,255,255,${fade})`);
          gr.addColorStop(0.4, `rgba(200,140,255,${fade * 0.7})`);
          gr.addColorStop(1, `rgba(80,30,200,0)`);
          ctx.beginPath(); ctx.arc(x, y, s.r * 5, 0, Math.PI * 2);
          ctx.fillStyle = gr; ctx.fill();
        });
      } else if (effect === 'neon') {
        const flicker = 0.88 + Math.random() * 0.12;
        const hue = (prog * 360) % 360;
        ctx.save();
        ctx.strokeStyle = `hsla(${hue},100%,60%,${0.9 * flicker})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = `hsla(${hue},100%,70%,0.9)`;
        ctx.shadowBlur = 18;
        ctx.strokeRect(2, 2, w - 4, h - 4);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = `hsla(${(hue + 40) % 360},100%,80%,${0.5 * flicker})`;
        ctx.lineWidth = 1;
        ctx.shadowColor = `hsla(${(hue + 40) % 360},100%,80%,0.6)`;
        ctx.shadowBlur = 12;
        ctx.strokeRect(5, 5, w - 10, h - 10);
        ctx.restore();
        const { x: hx, y: hy } = perimPt(prog, w, h);
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 25);
        g.addColorStop(0, `rgba(255,255,255,${0.7 * flicker})`);
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.beginPath(); ctx.arc(hx, hy, 25, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }

      prog = (prog + spd) % 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [speed, effect]);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 3 }} />;
}

// ═══════════════════════════════════════
// HERO BANNER
// ═══════════════════════════════════════
function HeroBanner({ config, t }) {
  const navigate = useNavigate();
  if (!config || config.banner_ativo !== '1') return null;
  const hasBgImage = !!config.banner_imagem;

  const rawCint = config.banner_cintilante || '1';
  const CINT_VALID = ['cometa', 'pulsar', 'aurora', 'faisca', 'neon'];
  const cintEffect = (rawCint === 'none' || rawCint === '0') ? null
    : (CINT_VALID.includes(rawCint) ? rawCint : 'cometa');

  return (
    <div className="hero-banner" data-anim={config.banner_animacao || 'flag'}>
      {hasBgImage && <img src={`${API_URL}/api/banner-image`} alt="Banner" className="hero-banner-bg" loading="eager" />}
      {cintEffect && (
        <BannerSparkle speed={config.banner_sparkle_speed || 'medium'} effect={cintEffect} />
      )}
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
  const prefersReduced = useReducedMotion();
  const [selectedSize, setSelectedSize] = useState('M');
  const [extraImages, setExtraImages] = useState([]);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [pinchScale, setPinchScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const panStartOffset = useRef({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const modalWrapRef = useRef(null);
  const modalImgRef = useRef(null);
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

  // Zoom + 3D handlers (C6)
  const handleMouseMove = (e) => {
    const rect = (modalWrapRef.current || e.currentTarget).getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    if (zoomed) {
      setZoomPos({ x: x * 100, y: y * 100 });
    } else {
      const el = modalImgRef.current;
      if (el) {
        const cx = Math.max(0.05, Math.min(0.95, x));
        const cy = Math.max(0.05, Math.min(0.95, y));
        el.style.setProperty('--rx', `${(cy - 0.5) * -16}deg`);
        el.style.setProperty('--ry', `${(cx - 0.5) * 16}deg`);
      }
    }
  };

  const handleMouseLeaveModal = () => {
    setZoomed(false);
    const el = modalImgRef.current;
    if (el) {
      el.style.setProperty('--rx', '0deg');
      el.style.setProperty('--ry', '0deg');
    }
  };

  // Touch pinch-to-zoom handlers
  const getTouchDist = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      pinchStartDist.current = getTouchDist(e.touches);
      pinchStartScale.current = pinchScale;
    } else if (e.touches.length === 1 && pinchScale > 1) {
      isPanning.current = true;
      panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      panStartOffset.current = { ...panOffset };
    }
  }, [pinchScale, panOffset]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDist(e.touches);
      if (pinchStartDist.current === 0) return;
      const newScale = Math.max(1, Math.min(4, pinchStartScale.current * (dist / pinchStartDist.current)));
      setPinchScale(newScale);
      if (newScale <= 1) setPanOffset({ x: 0, y: 0 });
    } else if (e.touches.length === 1 && isPanning.current && pinchScale > 1) {
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setPanOffset({ x: panStartOffset.current.x + dx, y: panStartOffset.current.y + dy });
    }
  }, [pinchScale]);

  const handleTouchEnd = useCallback(() => {
    isPanning.current = false;
    if (pinchScale <= 1.1) { setPinchScale(1); setPanOffset({ x: 0, y: 0 }); }
  }, [pinchScale]);

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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, pointerEvents: 'auto' }}
      exit={{ opacity: 0, pointerEvents: 'none' }}
      transition={{ duration: prefersReduced ? 0 : 0.12 }} onClick={onClose}>
      <motion.div className="product-modal"
        initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotateY: -90, rotateX: 12 }}
        animate={prefersReduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotateY: 0, rotateX: 0 }}
        exit={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.7, rotateY: 40 }}
        transition={prefersReduced ? { duration: 0.1 } : {
          duration: 0.55,
          ease: [0.16, 1, 0.3, 1],
          exit: { duration: 0.12, ease: 'easeIn' }
        }}
        style={prefersReduced ? undefined : { perspective: 1200, transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
        onClick={(e) => e.stopPropagation()}>

        <motion.button className="modal-close" onClick={onClose}
          initial={prefersReduced ? false : { opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={prefersReduced ? { duration: 0 } : { delay: 0.35, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        ><X size={24} /></motion.button>

        {/* Image side — Cinema Reveal */}
        <motion.div className="modal-image-section"
          initial={prefersReduced ? false : { opacity: 0, scale: 1.1, rotateY: 20 }}
          animate={{ opacity: 1, scale: 1, rotateY: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={prefersReduced ? undefined : { transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
        >
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

          {/* Zoom container + 3D effect */}
          <div
            ref={modalWrapRef}
            className="modal-zoom-wrap"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeaveModal}
            onClick={() => setZoomed(z => !z)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              ref={modalImgRef}
              className={`modal-zoom-container ${zoomed ? 'zoomed' : 'modal-3d'}`}
              style={zoomed
                ? { '--zoom-x': `${zoomPos.x}%`, '--zoom-y': `${zoomPos.y}%` }
                : pinchScale > 1
                  ? { transform: `scale(${pinchScale}) translate(${panOffset.x / pinchScale}px, ${panOffset.y / pinchScale}px)`, transition: 'none' }
                  : undefined
              }
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
        </motion.div>

        {/* Details side — Staggered entrance */}
        <motion.div className="modal-details"
          initial={prefersReduced ? false : { opacity: 0, x: 50, rotateY: -12 }}
          animate={{ opacity: 1, x: 0, rotateY: 0 }}
          transition={prefersReduced ? { duration: 0 } : { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={prefersReduced ? undefined : { transformStyle: 'preserve-3d', willChange: 'transform, opacity' }}
        >
          <div>
            <motion.p className="modal-liga"
              initial={prefersReduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: 0.28, duration: 0.3 }}
            >{produto.liga}</motion.p>
            <motion.h2 className="modal-nome"
              initial={prefersReduced ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: 0.32, duration: 0.3 }}
            >{produto.nome}</motion.h2>

            {avgRating && (
              <div className="modal-rating-summary">
                <span className="modal-stars">{'★'.repeat(Math.round(parseFloat(avgRating)))}{'☆'.repeat(5 - Math.round(parseFloat(avgRating)))}</span>
                <span>{avgRating} ({reviews.length})</span>
              </div>
            )}

            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: 0.36, duration: 0.25 }}
            >
            {promoAtiva ? (
              <div className="modal-preco-container">
                <span className="modal-preco-old">R$ {preco.toFixed(2)}</span>
                <span className="modal-preco-promo">R$ {precoFinal.toFixed(2)}</span>
              </div>
            ) : (
              <p className="modal-preco">R$ {preco.toFixed(2)}</p>
            )}
            </motion.div>

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

            <motion.button className="modal-add-btn" disabled={esgotado}
              onClick={() => { if (!esgotado) { onAddToCart(produto, selectedSize); onClose(); } }}
              initial={prefersReduced ? false : { opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={prefersReduced ? { duration: 0 } : { delay: 0.4, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              whileTap={{ scale: 0.97 }}
            >
              <ShoppingBag size={16} />
              {esgotado ? t('home.sold_out') : `${t('home.add_to_cart')} — ${t('home.size').toUpperCase()} ${selectedSize}`}
            </motion.button>

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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════
// HOME
// ═══════════════════════════════════════
function Home({ ligaAtiva, addToCart, searchQuery = '', forceReload = 0, cliente = null, priceRange = [0, 999] }) {
  const { t } = useI18n();
  const [produtos, setProdutos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const sentinelRef = useRef(null);
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

  const fetchPage = useCallback(async (pageNum, liga, query, pr, reset = false) => {
    const params = new URLSearchParams({ page: pageNum, limit: PAGE_LIMIT });
    if (liga) params.set('liga', liga);
    if (query.trim()) params.set('q', query.trim());
    if (pr[0] > 0) params.set('min_price', pr[0]);
    if (pr[1] < 999) params.set('max_price', pr[1]);
    try {
      const res = await fetch(`${API_URL}/api/produtos?${params}`);
      const data = await res.json();
      const arr = Array.isArray(data.produtos) ? data.produtos : [];
      setProdutos(prev => reset ? arr : [...prev, ...arr]);
      setHasMore(!!data.hasMore);
    } catch (e) {
      console.error('Erro ao carregar produtos:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  // Carregamento inicial e reload forçado
  useEffect(() => {
    lastReload.current = forceReload;
    setLoading(true);
    setPage(1);
    fetchPage(1, ligaAtiva, searchQuery, priceRange, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forceReload]);

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; filterRef.current = { liga: ligaAtiva, query: searchQuery, priceRange }; return; }
    const changed = filterRef.current.liga !== ligaAtiva || filterRef.current.query !== searchQuery || filterRef.current.priceRange !== priceRange;
    if (changed) {
      filterRef.current = { liga: ligaAtiva, query: searchQuery, priceRange };
      setPhase('exiting');
      const exitTimer = setTimeout(() => {
        setDisplayFilter({ liga: ligaAtiva, query: searchQuery });
        setPage(1);
        setHasMore(true);
        setLoading(true);
        fetchPage(1, ligaAtiva, searchQuery, priceRange, true);
        setPhase('entering');
        const enterTimer = setTimeout(() => setPhase('visible'), 400);
        return () => clearTimeout(enterTimer);
      }, 280);
      return () => clearTimeout(exitTimer);
    }
  }, [ligaAtiva, searchQuery, priceRange, fetchPage]);

  // Infinite scroll — carrega próxima página quando sentinel entra na tela
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore && !loading) {
        setLoadingMore(true);
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPage(nextPage, ligaAtiva, searchQuery, priceRange, false);
      }
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, page, ligaAtiva, searchQuery, priceRange, fetchPage]);

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

              <ProductCard3D onClick={() => handleClique(produto)} productId={produto.id} imgCount={produto.imgCount || 0}>
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

              {/* Favorite heart */}
              <button className={`card-fav-btn ${isFav ? 'active' : ''}`}
                onMouseEnter={(e) => { const wrap = e.currentTarget.closest('.product-card-3d-wrap'); if (wrap?.__pauseSlide) wrap.__pauseSlide(); }}
                onMouseLeave={(e) => { const wrap = e.currentTarget.closest('.product-card-3d-wrap'); if (wrap?.__resumeSlide) wrap.__resumeSlide(); }}
                onClick={(e) => { e.stopPropagation(); toggleFavorite(produto.id); }}>
                <Heart size={16} fill={isFav ? '#fff' : 'none'} />
              </button>

              {/* Cart button below wishlist */}
              <button className="card-cart-btn" disabled={allSizesOut}
                onMouseEnter={(e) => { const wrap = e.currentTarget.closest('.product-card-3d-wrap'); if (wrap?.__pauseSlide) wrap.__pauseSlide(); }}
                onMouseLeave={(e) => { const wrap = e.currentTarget.closest('.product-card-3d-wrap'); if (wrap?.__resumeSlide) wrap.__resumeSlide(); }}
                onClick={(e) => { e.stopPropagation(); if (!allSizesOut) handleClique(produto); }}>
                <ShoppingBag size={16} />
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
              </div>
              </ProductCard3D>
            </div>
          );
        })}
      </div>

      {/* Sentinel — dispara infinite scroll */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && <div className="loading-more"><div className="spinner-small" /></div>}

      <AnimatePresence mode="wait" onExitComplete={() => {}}>
        {selectedProduct && (
          <ProductModal
            key={selectedProduct.id}
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
