import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, Pencil, Trash2, ChevronLeft, Upload, Star, ArrowUp, ArrowDown, Image, Eye, EyeOff, Pin, Percent, Calendar, Settings, Megaphone, ShoppingBag, Search, Copy, Download, Check as CheckIcon, Tag, MessageSquare, GripVertical, Filter, Mail } from 'lucide-react';
import { AreaChart, Area, BarChart as RChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { API_URL } from '../config';

const LIGAS = ['BUNDESLIGA', 'LIGA PORTUGUESA', 'LIGUE 1', 'BRASILEIRÃO', 'SERIE A'];
const PRODUCTS_PER_PAGE = 20;

// Hook debounce
function useDebounce(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Memoized Product Card
const AdminProductCard = React.memo(function AdminProductCard({
  product, batchMode, isSelected, onOpen, onToggleSelect, onToggleDestaque, onDuplicate, onDelete
}) {
  const esgotado = [product.estoque_p, product.estoque_m, product.estoque_g, product.estoque_gg].every(e => e === 0);
  return (
    <div
      className={`produto-card-admin ${product.destaque ? 'card-destaque' : ''} ${batchMode && isSelected ? 'card-selected' : ''} ${esgotado ? 'card-esgotado' : ''}`}
      onClick={() => batchMode ? onToggleSelect(product.id) : onOpen(product.id)}
    >
      {batchMode && (
        <div className={`batch-checkbox ${isSelected ? 'checked' : ''}`} onClick={(e) => { e.stopPropagation(); onToggleSelect(product.id); }}>
          {isSelected && <CheckIcon size={10} />}
        </div>
      )}
      <AdminThumb produtoId={product.id} nome={product.nome} />
      <div className="produto-card-badge">{product.imgCount} foto{product.imgCount !== 1 ? 's' : ''}</div>
      {!!product.destaque && <div className="produto-card-pin-badge" title="Produto em destaque"><Pin size={10} /></div>}
      {product.promo_desconto > 0 && <div className="produto-card-promo-badge"><Percent size={10} /> PROMO</div>}
      {esgotado && <div className="produto-card-esgotado-badge">ESGOTADO</div>}
      <div className="produto-card-info">
        <span className="produto-card-liga">{product.liga}</span>
        <h4>{product.nome}</h4>
        <span className="produto-card-price">R$ {parseFloat(product.preco).toFixed(2)}</span>
        <div className="produto-card-metrics"><span>{product.cliques} cliques</span><span>{product.vendas} vendas</span></div>
      </div>
      <div className="produto-card-actions">
        <button title="Destaque" className={product.destaque ? 'active-destaque' : ''} onClick={(e) => { e.stopPropagation(); onToggleDestaque(product.id); }}><Pin size={14} /></button>
        <button title="Duplicar" onClick={(e) => { e.stopPropagation(); onDuplicate(product.id); }}><Copy size={14} /></button>
        <button onClick={(e) => { e.stopPropagation(); onOpen(product.id); }}><Pencil size={14} /></button>
        <button className="delete" onClick={(e) => { e.stopPropagation(); onDelete(product.id); }}><Trash2 size={14} /></button>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════
// COMPRESS IMAGE (O5)
// ═══════════════════════════════════════
function compressImage(file, maxWidth = 1200, quality = 0.75) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth; }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Thumbnail com IntersectionObserver + shimmer
const AdminThumb = React.memo(function AdminThumb({ produtoId, nome }) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { rootMargin: '300px 0px', threshold: 0.01 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={ref} className="produto-card-thumb">
      {!loaded && <div className="shimmer-thumb-inner" />}
      {inView && (
        <img
          src={`${API_URL}/api/produtos/${produtoId}/thumb`}
          alt={nome}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          style={{ opacity: loaded ? 1 : 0, position: loaded ? 'relative' : 'absolute' }}
        />
      )}
    </div>
  );
});

// Mini preview
function ProductPreviewCard({ product }) {
  const preco = parseFloat(product.preco) || 0;
  const hoje = new Date().toISOString().split('T')[0];
  const promoAtiva = product.promo_desconto && product.promo_inicio && product.promo_fim &&
                     product.promo_inicio <= hoje && product.promo_fim >= hoje;
  let precoFinal = preco;
  let promoLabel = null;
  if (promoAtiva) {
    if (product.promo_tipo === 'porcentagem') {
      precoFinal = preco * (1 - parseFloat(product.promo_desconto) / 100);
      promoLabel = `-${parseFloat(product.promo_desconto).toFixed(0)}%`;
    } else {
      precoFinal = preco - parseFloat(product.promo_desconto);
      promoLabel = `-R$${parseFloat(product.promo_desconto).toFixed(0)}`;
    }
  }
  return (
    <div className="preview-card-mini">
      <div className="preview-card-img">
        {product.imagem ? <img src={product.imagem} alt={product.nome} /> : <div className="preview-card-placeholder"><Image size={24} /></div>}
        {promoAtiva && <span className="preview-badge-promo">PROMO {promoLabel}</span>}
        {!!product.destaque && <span className="preview-badge-destaque"><Pin size={10} /> DESTAQUE</span>}
      </div>
      <div className="preview-card-info">
        <span className="preview-liga">{product.liga || 'LIGA'}</span>
        <h4>{product.nome || 'NOME DO PRODUTO'}</h4>
        {promoAtiva ? (
          <div className="preview-preco-promo">
            <span className="preview-preco-old">R$ {preco.toFixed(2)}</span>
            <span className="preview-preco-new">R$ {precoFinal.toFixed(2)}</span>
          </div>
        ) : (
          <span className="preview-preco">R$ {preco.toFixed(2)}</span>
        )}
        <button className="preview-btn"><ShoppingBag size={12} /> ADICIONAR</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// CSV EXPORT (A3)
// ═══════════════════════════════════════
function exportCSV(data, filename, columns) {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row => columns.map(c => {
    let val = c.getter ? c.getter(row) : row[c.key];
    if (val === null || val === undefined) val = '';
    val = String(val).replace(/"/g, '""');
    return `"${val}"`;
  }).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
}

// ═══════════════════════════════════════
// PDF EXPORT
// ═══════════════════════════════════════
async function exportPDF(data, filename, columns, title) {
  const { default: jsPDF } = await import('jspdf');
  await import('jspdf-autotable');
  const doc = new jsPDF('l', 'mm', 'a4');
  doc.setFontSize(14);
  doc.text(title || filename.toUpperCase(), 14, 18);
  doc.setFontSize(8);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, 24);
  doc.autoTable({
    startY: 30,
    head: [columns.map(c => c.label)],
    body: data.map(row => columns.map(c => {
      const val = c.getter ? c.getter(row) : row[c.key];
      return val !== null && val !== undefined ? String(val) : '';
    })),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });
  doc.save(`${filename}_${new Date().toISOString().split('T')[0]}.pdf`);
}

function AdminDashboard() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!sessionStorage.getItem('rw_admin_token'));
  const [loginData, setLoginData] = useState({ usuario: '', senha: '' });
  const [loginError, setLoginError] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'dashboard';
  const setActiveTab = (tab) => setSearchParams({ tab });

  const [stats, setStats] = useState({
    receitaTotal: 0, despesasTotal: 0, totalPedidos: 0,
    totalClientes: 0, totalVisitantes: 0, totalCliquesGeral: 0,
    taxaConversao: '0.0', maisClicadas: [], maisVendidas: []
  });
  const [produtos, setProdutos] = useState([]);
  const [produtosLoading, setProdutosLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);
  const [despesas, setDespesas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [searchAdmin, setSearchAdmin] = useState('');

  // Product Editor
  const [editingProduct, setEditingProduct] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Site Config
  const [siteConfig, setSiteConfig] = useState({});
  const [configSaving, setConfigSaving] = useState(false);
  const [bannerPreview, setBannerPreview] = useState(false);

  // Forms
  const [novaDespesa, setNovaDespesa] = useState({ descricao: '', valor: '', data_despesa: '' });
  const [editingDespesa, setEditingDespesa] = useState(null);

  // Cupons (A6)
  const [cupons, setCupons] = useState([]);
  const [novoCupom, setNovoCupom] = useState({ codigo: '', tipo: 'porcentagem', valor: '', minimo: '', usos_max: '', validade: '' });
  const [editingCupom, setEditingCupom] = useState(null);

  // Avaliações admin (C8)
  const [avaliacoes, setAvaliacoes] = useState([]);

  // Newsletter
  const [nlSubscribers, setNlSubscribers] = useState([]);
  const [nlAssunto, setNlAssunto] = useState('');
  const [nlConteudo, setNlConteudo] = useState('');
  const [nlEnviando, setNlEnviando] = useState(false);

  // AI Assistant for Newsletter
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // Batch actions (A9)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchMode, setBatchMode] = useState(false);

  // Charts (A2)
  const [chartData, setChartData] = useState([]);

  // Metrics period (A8)
  const [metricPeriod, setMetricPeriod] = useState('all');
  const [periodStats, setPeriodStats] = useState(null);
  const [customRange, setCustomRange] = useState({ inicio: '', fim: '' });

  // Drag-and-drop (A7)
  const dragItem = useRef(null);
  const dragOver = useRef(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, msg: '', onConfirm: null });
  const openConfirm = (msg, onConfirm) => setConfirmModal({ open: true, msg, onConfirm });
  const closeConfirm = () => setConfirmModal({ open: false, msg: '', onConfirm: null });

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Fetch autenticado para rotas admin
  const adminFetch = async (url, options = {}) => {
    const token = sessionStorage.getItem('rw_admin_token');
    const headers = { ...options.headers, 'x-admin-token': token };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      sessionStorage.removeItem('rw_admin_token');
      setIsLoggedIn(false);
      throw new Error('Sessão expirada');
    }
    return res;
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem('rw_admin_token', data.token);
        setIsLoggedIn(true);
      } else setLoginError('CREDENCIAIS INVÁLIDAS');
    } catch {
      setLoginError('ERRO DE CONEXÃO');
    }
  };

  // Track which data sets have been loaded to avoid redundant fetches
  const loadedRef = useRef({ stats: false, produtos: false, despesas: false, pedidos: false, config: false, cupons: false, avaliacoes: false, chart: false, newsletter: false });

  useEffect(() => {
    if (!isLoggedIn) return;
    loadData(activeTab, false);
  }, [isLoggedIn, activeTab]);

  // Reset UI state when tab changes via URL
  useEffect(() => {
    setVisibleCount(PRODUCTS_PER_PAGE);
    setSelectedIds(new Set());
    setBatchMode(false);
  }, [activeTab]);

  const loadData = (tab, force = true) => {
    const loaded = loadedRef.current;

    if (force || !loaded.stats) {
      adminFetch(`${API_URL}/api/admin/stats`).then(r => r.json()).then(d => { setStats(d); loaded.stats = true; }).catch(() => {});
    }

    if (tab === 'dashboard' || tab === 'produtos') {
      if (force || !loaded.produtos) {
        setProdutosLoading(true);
        adminFetch(`${API_URL}/api/admin/produtos?limit=500`).then(r => r.json()).then(d => { setProdutos(d.produtos || d); setProdutosLoading(false); loaded.produtos = true; }).catch(() => setProdutosLoading(false));
      }
    }
    if (tab === 'despesas' || tab === 'dashboard') {
      if (force || !loaded.despesas) {
        adminFetch(`${API_URL}/api/admin/despesas`).then(r => r.json()).then(d => { setDespesas(d); loaded.despesas = true; }).catch(() => {});
      }
    }
    if (tab === 'pedidos' || tab === 'dashboard') {
      if (force || !loaded.pedidos) {
        adminFetch(`${API_URL}/api/admin/pedidos`).then(r => r.json()).then(d => { setPedidos(d); loaded.pedidos = true; }).catch(() => {});
      }
    }
    if (tab === 'banner' || tab === 'config') {
      if (force || !loaded.config) {
        adminFetch(`${API_URL}/api/admin/config`).then(r => r.json()).then(d => { setSiteConfig(d); loaded.config = true; }).catch(() => {});
      }
    }
    if (tab === 'cupons') {
      if (force || !loaded.cupons) {
        adminFetch(`${API_URL}/api/admin/cupons`).then(r => r.json()).then(d => { setCupons(d); loaded.cupons = true; }).catch(() => {});
      }
    }
    if (tab === 'avaliacoes') {
      if (force || !loaded.avaliacoes) {
        adminFetch(`${API_URL}/api/admin/avaliacoes`).then(r => r.json()).then(d => { setAvaliacoes(d); loaded.avaliacoes = true; }).catch(() => {});
      }
    }
    if (tab === 'dashboard') {
      if (force || !loaded.chart) {
        adminFetch(`${API_URL}/api/admin/stats/historico?dias=30`).then(r => r.json()).then(d => { setChartData(d); loaded.chart = true; }).catch(() => {});
      }
    }
    if (tab === 'newsletter') {
      if (force || !loaded.newsletter) {
        adminFetch(`${API_URL}/api/admin/newsletter`).then(r => r.json()).then(d => { setNlSubscribers(d); loaded.newsletter = true; }).catch(() => {});
      }
    }
  };

  // ── PRODUCT EDITOR ──
  const openProductEditor = async (produtoId) => {
    try {
      const res = await adminFetch(`${API_URL}/api/admin/produtos/${produtoId}`);
      const data = await res.json();
      setEditingProduct({ ...data, _imageChanged: false });
      setIsCreating(false);
      setShowPreview(false);
    } catch {
      showToast('Erro ao carregar produto');
    }
  };

  const openNewProduct = () => {
    setEditingProduct({
      nome: '', liga: 'BRASILEIRÃO', preco: '', descricao: '', imagem: '', imagens: [],
      destaque: 0, promo_desconto: '', promo_tipo: 'porcentagem', promo_inicio: '', promo_fim: '',
      estoque_p: -1, estoque_m: -1, estoque_g: -1, estoque_gg: -1
    });
    setIsCreating(true);
    setShowPreview(false);
  };

  const closeEditor = () => { setEditingProduct(null); setIsCreating(false); setShowPreview(false); };

  // Image upload with compression (O5)
  const handleImageUpload = async (e, isMain = false) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      const base64 = await compressImage(file, 1200, 0.78);
      if (isMain) {
        setEditingProduct(prev => ({ ...prev, imagem: base64, _imageChanged: true }));
      } else if (isCreating) {
        setEditingProduct(prev => ({
          ...prev,
          imagens: [...prev.imagens, { id: Date.now() + Math.random(), imagem: base64, ordem: prev.imagens.length, _local: true }]
        }));
      } else {
        try {
          const res = await adminFetch(`${API_URL}/api/admin/produtos/${editingProduct.id}/imagens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagem: base64 })
          });
          const data = await res.json();
          setEditingProduct(prev => ({
            ...prev,
            imagens: [...prev.imagens, { id: data.id, imagem: base64, ordem: data.ordem }]
          }));
        } catch {
          showToast('Erro ao enviar imagem');
        }
      }
    }
    e.target.value = '';
  };

  const deleteExtraImage = async (imgId, isLocal) => {
    if (isLocal) {
      setEditingProduct(prev => ({ ...prev, imagens: prev.imagens.filter(i => i.id !== imgId) }));
      return;
    }
    try {
      await adminFetch(`${API_URL}/api/admin/imagens/${imgId}`, { method: 'DELETE' });
      setEditingProduct(prev => ({ ...prev, imagens: prev.imagens.filter(i => i.id !== imgId) }));
    } catch {
      showToast('Erro ao deletar imagem');
    }
  };

  // Drag-and-drop gallery (A7)
  const handleDragStart = (index) => { dragItem.current = index; };
  const handleDragEnter = (index) => { dragOver.current = index; };
  const handleDragEnd = () => {
    if (dragItem.current === null || dragOver.current === null) return;
    setEditingProduct(prev => {
      const imgs = [...prev.imagens];
      const dragged = imgs.splice(dragItem.current, 1)[0];
      imgs.splice(dragOver.current, 0, dragged);
      return { ...prev, imagens: imgs.map((img, i) => ({ ...img, ordem: i })) };
    });
    dragItem.current = null;
    dragOver.current = null;
  };

  const setAsMainImage = (imgBase64) => {
    setEditingProduct(prev => ({ ...prev, imagem: imgBase64 }));
    showToast('Imagem principal atualizada');
  };

  // Drag-drop file upload handler
  const handleFileDrop = async (e) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (!files.length) return;
    for (const file of files) {
      const base64 = await compressImage(file, 1200, 0.78);
      if (isCreating) {
        setEditingProduct(prev => ({
          ...prev,
          imagens: [...prev.imagens, { id: Date.now() + Math.random(), imagem: base64, ordem: prev.imagens.length, _local: true }]
        }));
      } else {
        try {
          const res = await adminFetch(`${API_URL}/api/admin/produtos/${editingProduct.id}/imagens`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imagem: base64 })
          });
          const data = await res.json();
          setEditingProduct(prev => ({
            ...prev,
            imagens: [...prev.imagens, { id: data.id, imagem: base64, ordem: data.ordem }]
          }));
        } catch {
          showToast('Erro ao enviar imagem');
        }
      }
    }
    showToast(`${files.length} imagem(ns) adicionada(s)`);
  };

  const saveProduct = async () => {
    if (!editingProduct.nome || !editingProduct.liga || !editingProduct.preco) {
      showToast('Preencha nome, liga e preço');
      return;
    }
    setSaving(true);
    try {
      if (isCreating) {
        const body = {
          nome: editingProduct.nome, liga: editingProduct.liga, preco: parseFloat(editingProduct.preco),
          imagem: editingProduct.imagem, descricao: editingProduct.descricao || null,
          imagensExtras: editingProduct.imagens.map(img => img.imagem),
          destaque: editingProduct.destaque ? 1 : 0,
          promo_desconto: editingProduct.promo_desconto || null,
          promo_tipo: editingProduct.promo_tipo || 'porcentagem',
          promo_inicio: editingProduct.promo_inicio || null,
          promo_fim: editingProduct.promo_fim || null,
          estoque_p: editingProduct.estoque_p ?? -1, estoque_m: editingProduct.estoque_m ?? -1,
          estoque_g: editingProduct.estoque_g ?? -1, estoque_gg: editingProduct.estoque_gg ?? -1,
        };
        const res = await adminFetch(`${API_URL}/api/admin/produtos`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const data = await res.json();
        if (data.success) { showToast('Produto criado!'); closeEditor(); loadData('produtos'); }
      } else {
        const body = {
          nome: editingProduct.nome, liga: editingProduct.liga, preco: parseFloat(editingProduct.preco),
          descricao: editingProduct.descricao || null, destaque: editingProduct.destaque ? 1 : 0,
          promo_desconto: editingProduct.promo_desconto || null,
          promo_tipo: editingProduct.promo_tipo || 'porcentagem',
          promo_inicio: editingProduct.promo_inicio || null,
          promo_fim: editingProduct.promo_fim || null,
          estoque_p: editingProduct.estoque_p ?? -1, estoque_m: editingProduct.estoque_m ?? -1,
          estoque_g: editingProduct.estoque_g ?? -1, estoque_gg: editingProduct.estoque_gg ?? -1,
        };
        if (editingProduct._imageChanged) body.imagem = editingProduct.imagem;
        await adminFetch(`${API_URL}/api/admin/produtos/${editingProduct.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const ordens = editingProduct.imagens.filter(i => !i._local).map(i => ({ id: i.id, ordem: i.ordem }));
        if (ordens.length > 0) {
          await adminFetch(`${API_URL}/api/admin/produtos/${editingProduct.id}/imagens/reorder`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ordens })
          });
        }
        showToast('Produto salvo!');
        closeEditor();
        loadData('produtos');
      }
    } catch (err) {
      showToast('Erro ao salvar');
    }
    setSaving(false);
  };

  const deleteProduto = async (id) => {
    openConfirm('Deletar este produto?', async () => {
      await adminFetch(`${API_URL}/api/admin/produtos/${id}`, { method: 'DELETE' });
      showToast('Produto deletado');
      loadData('produtos');
    });
  };

  // Duplicate product (A4)
  const duplicateProduct = async (id, e) => {
    e.stopPropagation();
    try {
      const res = await adminFetch(`${API_URL}/api/admin/produtos/${id}/duplicar`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { showToast('Produto duplicado!'); loadData('produtos'); }
    } catch { showToast('Erro ao duplicar'); }
  };

  const toggleDestaque = async (id, e) => {
    e.stopPropagation();
    await adminFetch(`${API_URL}/api/admin/produtos/${id}/destaque`, { method: 'PUT' });
    loadData('produtos');
  };

  // Batch actions (A9)
  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const batchDelete = async () => {
    const count = selectedIds.size;
    openConfirm(`Deletar ${count} produtos?`, async () => {
      for (const id of selectedIds) {
        await adminFetch(`${API_URL}/api/admin/produtos/${id}`, { method: 'DELETE' }).catch(() => {});
      }
      setSelectedIds(new Set());
      setBatchMode(false);
      showToast(`${count} produtos deletados`);
      loadData('produtos');
    });
  };

  const batchToggleDestaque = async () => {
    for (const id of selectedIds) {
      await adminFetch(`${API_URL}/api/admin/produtos/${id}/destaque`, { method: 'PUT' }).catch(() => {});
    }
    setSelectedIds(new Set());
    setBatchMode(false);
    showToast('Destaque atualizado');
    loadData('produtos');
  };

  // Site Config save
  const saveConfig = async () => {
    setConfigSaving(true);
    try {
      await adminFetch(`${API_URL}/api/admin/config`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(siteConfig)
      });
      showToast('Configurações salvas!');
    } catch { showToast('Erro ao salvar configurações'); }
    setConfigSaving(false);
  };

  const handleBannerImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const base64 = await compressImage(file, 1920, 0.82);
    setSiteConfig(prev => ({ ...prev, banner_imagem: base64 }));
    e.target.value = '';
  };

  // CRUD Despesas
  const handleDespesaSubmit = async (e) => {
    e.preventDefault();
    const url = editingDespesa ? `${API_URL}/api/admin/despesas/${editingDespesa.id}` : `${API_URL}/api/admin/despesas`;
    const method = editingDespesa ? 'PUT' : 'POST';
    try {
      const res = await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editingDespesa || novaDespesa) });
      if (!res.ok) throw new Error('Erro ao salvar');
      setNovaDespesa({ descricao: '', valor: '', data_despesa: '' });
      setEditingDespesa(null);
      loadData('despesas');
    } catch {
      showToast('Erro ao salvar despesa');
    }
  };

  const deleteDespesa = async (id) => {
    openConfirm('Deletar despesa?', async () => {
      await adminFetch(`${API_URL}/api/admin/despesas/${id}`, { method: 'DELETE' });
      loadData('despesas');
    });
  };

  const updatePedidoStatus = async (pedidoId, novoStatus) => {
    await adminFetch(`${API_URL}/api/admin/pedidos/${pedidoId}/status`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novoStatus })
    });
    loadData('pedidos');
  };

  // Cupons CRUD (A6)
  const handleCupomSubmit = async (e) => {
    e.preventDefault();
    const data = editingCupom || novoCupom;
    const url = editingCupom ? `${API_URL}/api/admin/cupons/${editingCupom.id}` : `${API_URL}/api/admin/cupons`;
    const method = editingCupom ? 'PUT' : 'POST';
    try {
      const res = await adminFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.error) { showToast(result.error); return; }
      setNovoCupom({ codigo: '', tipo: 'porcentagem', valor: '', minimo: '', usos_max: '', validade: '' });
      setEditingCupom(null);
      showToast(editingCupom ? 'Cupom atualizado!' : 'Cupom criado!');
      loadData('cupons');
    } catch { showToast('Erro ao salvar cupom'); }
  };

  const deleteCupom = async (id) => {
    openConfirm('Deletar cupom?', async () => {
      await adminFetch(`${API_URL}/api/admin/cupons/${id}`, { method: 'DELETE' });
      loadData('cupons');
    });
  };

  // Avaliações admin (C8)
  const toggleAprovacao = async (id) => {
    await adminFetch(`${API_URL}/api/admin/avaliacoes/${id}/aprovar`, { method: 'PUT' });
    loadData('avaliacoes');
  };

  const deleteAvaliacao = async (id) => {
    openConfirm('Deletar avaliação?', async () => {
      await adminFetch(`${API_URL}/api/admin/avaliacoes/${id}`, { method: 'DELETE' });
      loadData('avaliacoes');
    });
  };

  // Newsletter actions
  const deleteSubscriber = async (id) => {
    openConfirm('Remover inscrito?', async () => {
      await adminFetch(`${API_URL}/api/admin/newsletter/${id}`, { method: 'DELETE' });
      loadData('newsletter');
    });
  };

  const enviarNewsletter = async (e) => {
    e.preventDefault();
    if (!nlAssunto.trim() || !nlConteudo.trim()) return;
    const activeCount = nlSubscribers.filter(s => s.ativo).length;
    openConfirm(`Enviar email para ${activeCount} inscrito(s)?`, async () => {
      await doEnviarNewsletter();
    });
  };

  const doEnviarNewsletter = async () => {
    setNlEnviando(true);
    try {
      const res = await adminFetch(`${API_URL}/api/admin/newsletter/enviar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assunto: nlAssunto, conteudo: nlConteudo })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Email enviado para ${data.enviados} inscrito(s)${data.erros > 0 ? ` (${data.erros} erro(s))` : ''}`);
        setNlAssunto('');
        setNlConteudo('');
      } else {
        showToast(data.error || 'Erro ao enviar');
      }
    } catch { showToast('Erro ao enviar newsletter'); }
    setNlEnviando(false);
  }; // end doEnviarNewsletter

  // AI Assistant for newsletter
  const AI_SYSTEM = `Você é um assistente de marketing da Retro Wave, loja de camisas retrô de futebol.
Ajude o administrador a:
- Escrever assuntos e conteúdos de email marketing
- Criar promoções e campanhas
- Sugerir ideias de newsletter
- Melhorar textos existentes
Seja direto e criativo. Responda sempre em português brasileiro.
Quando sugerir um email, separe claramente ASSUNTO: e CONTEÚDO: em linhas separadas.
Use tom profissional mas envolvente para fãs de futebol.
IMPORTANTE: NUNCA use formatação markdown como *, **, #, ## ou qualquer marcação. Escreva texto puro e limpo, pronto para ser enviado por email. Sem asteriscos, sem hashtags, sem bullets com *.`;

  const stripMarkdown = (text) => {
    return text
      .replace(/#{1,6}\s?/g, '')
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^[-*+]\s/gm, '• ')
      .replace(/^\d+\.\s/gm, '')
      .trim();
  };

  const sendAiMessage = useCallback(async (text) => {
    if (!text.trim() || aiLoading) return;
    const userMsg = { role: 'user', text: text.trim() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiLoading(true);
    try {
      const geminiMsgs = [
        { role: 'user', parts: [{ text: AI_SYSTEM }] },
        { role: 'model', parts: [{ text: 'Entendido! Sou o assistente de marketing da Retro Wave. Como posso ajudar?' }] }
      ];
      const recent = [...aiMessages, userMsg].slice(-20);
      for (const msg of recent) {
        geminiMsgs.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.text }] });
      }
      const res = await fetch(`${API_URL}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: geminiMsgs }) });
      const data = await res.json();
      if (res.ok && data.reply) {
        setAiMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
      } else {
        setAiMessages(prev => [...prev, { role: 'assistant', text: 'Erro ao gerar resposta. Tente novamente.' }]);
      }
    } catch {
      setAiMessages(prev => [...prev, { role: 'assistant', text: 'Erro de conexão com a IA.' }]);
    }
    setAiLoading(false);
  }, [aiMessages, aiLoading]);

  const aiQuickPrompts = [
    'Escreva um email de promoção de 20% para camisas retrô',
    'Sugira 5 assuntos criativos de newsletter',
    'Crie um email anunciando novas camisas da SERIE A',
    'Escreva um email de boas-vindas para novos inscritos'
  ];

  // Metrics period filter (A8)
  const loadPeriodStats = async (period) => {
    setMetricPeriod(period);
    if (period === 'all') { setPeriodStats(null); return; }
    let inicio, fim = new Date().toISOString().split('T')[0];
    const d = new Date();
    if (period === 'hoje') { inicio = fim; }
    else if (period === 'semana') { d.setDate(d.getDate() - 7); inicio = d.toISOString().split('T')[0]; }
    else if (period === 'mes') { d.setDate(d.getDate() - 30); inicio = d.toISOString().split('T')[0]; }
    else if (period === 'custom') { inicio = customRange.inicio; fim = customRange.fim; if (!inicio || !fim) return; }
    try {
      const res = await adminFetch(`${API_URL}/api/admin/stats/periodo?inicio=${inicio}&fim=${fim}`);
      setPeriodStats(await res.json());
    } catch { setPeriodStats(null); }
  };

  // Filter products by search (A1) — debounced
  const debouncedSearch = useDebounce(searchAdmin, 200);
  const filteredProdutos = useMemo(() => {
    if (!debouncedSearch.trim()) return produtos;
    const q = debouncedSearch.toLowerCase();
    return produtos.filter(p => p.nome.toLowerCase().includes(q) || p.liga.toLowerCase().includes(q));
  }, [produtos, debouncedSearch]);

  // Stable callbacks for product card
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleToggleDestaque = useCallback(async (id) => {
    await adminFetch(`${API_URL}/api/admin/produtos/${id}/destaque`, { method: 'PUT' });
    loadData('produtos');
  }, []);

  const handleDuplicate = useCallback(async (id) => {
    try {
      const res = await adminFetch(`${API_URL}/api/admin/produtos/${id}/duplicar`, { method: 'POST' });
      const data = await res.json();
      if (data.success) { showToast('Produto duplicado!'); loadData('produtos'); }
    } catch { showToast('Erro ao duplicar'); }
  }, []);

  const handleDeleteProduto = useCallback(async (id) => {
    openConfirm('Deletar este produto?', async () => {
      await adminFetch(`${API_URL}/api/admin/produtos/${id}`, { method: 'DELETE' });
      showToast('Produto deletado');
      loadData('produtos');
    });
  }, []);

  // ── LOGIN SCREEN ──
  if (!isLoggedIn) {
    return (
      <motion.div className="admin-login" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        <div className="admin-login-box">
          <h2>ADMIN</h2>
          {loginError && <p className="error-msg">{loginError}</p>}
          <form className="checkout-form" onSubmit={handleLogin}>
            <input className="checkout-input" type="text" placeholder="USUÁRIO" value={loginData.usuario} onChange={(e) => setLoginData({ ...loginData, usuario: e.target.value })} required />
            <input className="checkout-input" type="password" placeholder="SENHA" value={loginData.senha} onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })} required />
            <button type="submit" className="checkout-submit">ENTRAR</button>
          </form>
        </div>
      </motion.div>
    );
  }

  // ── PRODUCT EDITOR OVERLAY ──
  const renderProductEditor = () => {
    if (!editingProduct) return null;
    return (
      <div className="editor-overlay" onClick={closeEditor}>
        <div className="editor-panel" onClick={e => e.stopPropagation()}>
          <div className="editor-header">
            <button className="editor-back" onClick={closeEditor}>
              <ChevronLeft size={18} /> <span>VOLTAR</span>
            </button>
            <h2>{isCreating ? 'NOVO PRODUTO' : 'EDITAR PRODUTO'}</h2>
            <div className="editor-header-actions">
              <button className="editor-preview-toggle" onClick={() => setShowPreview(p => !p)} title={showPreview ? 'Ocultar prévia' : 'Ver prévia'}>
                {showPreview ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button className="editor-save-btn" onClick={saveProduct} disabled={saving}>
                {saving ? 'SALVANDO...' : 'SALVAR'}
              </button>
            </div>
          </div>

          {/* Preview Card */}
          <AnimatePresence>
            {showPreview && (
              <motion.div className="editor-preview-panel" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                <div className="editor-preview-label"><Eye size={12} /> PRÉVIA DO CARD NA LOJA</div>
                <ProductPreviewCard product={editingProduct} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="editor-body">
            {/* Images */}
            <div className="editor-images">
              <h3>IMAGEM PRINCIPAL</h3>
              <div className="editor-main-image">
                {editingProduct.imagem ? (
                  <img src={editingProduct.imagem} alt="Principal" />
                ) : (
                  <div className="editor-image-placeholder"><Image size={32} /><span>SEM IMAGEM</span></div>
                )}
                <label className="editor-upload-overlay">
                  <Upload size={18} /><span>TROCAR</span>
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} hidden />
                </label>
              </div>

              <div className="editor-extras-header">
                <h3>GALERIA ({editingProduct.imagens.length} fotos)</h3>
                <label className="editor-add-img-btn">
                  <Plus size={14} /><span>ADICIONAR</span>
                  <input type="file" accept="image/*" multiple onChange={(e) => handleImageUpload(e, false)} hidden />
                </label>
              </div>

              {/* Drag-and-drop gallery (A7) */}
              <div
                className={`editor-gallery ${isDraggingFiles ? 'editor-gallery-dropzone' : ''}`}
                onDragOver={(e) => { e.preventDefault(); if (e.dataTransfer.types.includes('Files')) setIsDraggingFiles(true); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingFiles(false); }}
                onDrop={handleFileDrop}
              >
                {isDraggingFiles && (
                  <div className="editor-drop-overlay">
                    <Upload size={24} />
                    <span>SOLTAR IMAGENS AQUI</span>
                  </div>
                )}
                {editingProduct.imagens.length === 0 && !isDraggingFiles && (
                  <div className="editor-no-images">Arraste imagens aqui ou clique em Adicionar.</div>
                )}
                {editingProduct.imagens.map((img, i) => (
                  <div
                    key={img.id}
                    className="editor-gallery-item"
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragEnter={() => handleDragEnter(i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    <span className="editor-gallery-grip"><GripVertical size={14} /></span>
                    <span className="editor-gallery-order">{i + 1}</span>
                    <img src={img.imagem} alt={`Foto ${i + 1}`} />
                    <div className="editor-gallery-actions">
                      <button title="Definir como principal" onClick={() => setAsMainImage(img.imagem)}><Star size={14} /></button>
                      <button title="Remover" className="editor-gallery-delete" onClick={() => deleteExtraImage(img.id, img._local)}><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Details */}
            <div className="editor-details">
              <h3>INFORMAÇÕES DO PRODUTO</h3>
              <div className="editor-field">
                <label>NOME</label>
                <input type="text" value={editingProduct.nome} onChange={(e) => setEditingProduct(prev => ({ ...prev, nome: e.target.value }))} placeholder="Ex: BAYERN MUNICH RETRO 1997" />
              </div>
              <div className="editor-row">
                <div className="editor-field">
                  <label>LIGA</label>
                  <select value={editingProduct.liga} onChange={(e) => setEditingProduct(prev => ({ ...prev, liga: e.target.value }))}>
                    <option value="">Selecionar</option>
                    {LIGAS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="editor-field">
                  <label>PREÇO (R$)</label>
                  <input type="number" step="0.01" value={editingProduct.preco} onChange={(e) => setEditingProduct(prev => ({ ...prev, preco: e.target.value }))} placeholder="289.90" />
                </div>
              </div>
              <div className="editor-field">
                <label>DESCRIÇÃO</label>
                <textarea value={editingProduct.descricao || ''} onChange={(e) => setEditingProduct(prev => ({ ...prev, descricao: e.target.value }))} placeholder="Camisa retrô original, material premium em poliéster 100%..." rows={4} />
              </div>

              {/* ── ESTOQUE POR TAMANHO (A5) ── */}
              <div className="editor-section-divider">
                <ShoppingBag size={14} /> ESTOQUE POR TAMANHO
              </div>
              <p style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: 8 }}>-1 = ilimitado, 0 = esgotado</p>
              <div className="editor-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                {['P', 'M', 'G', 'GG'].map(tam => (
                  <div className="editor-field" key={tam}>
                    <label>TAM {tam}</label>
                    <input type="number" min={-1} value={editingProduct[`estoque_${tam.toLowerCase()}`] ?? -1}
                      onChange={(e) => setEditingProduct(prev => ({ ...prev, [`estoque_${tam.toLowerCase()}`]: parseInt(e.target.value) || -1 }))} />
                  </div>
                ))}
              </div>

              {/* ── DESTAQUE ── */}
              <div className="editor-section-divider"><Pin size={14} /> DESTAQUE</div>
              <div className="editor-toggle-row" onClick={() => setEditingProduct(prev => ({ ...prev, destaque: prev.destaque ? 0 : 1 }))}>
                <div className={`editor-toggle ${editingProduct.destaque ? 'active' : ''}`}><div className="editor-toggle-knob" /></div>
                <span>{editingProduct.destaque ? 'PRODUTO EM DESTAQUE — Aparece primeiro no grid' : 'PRODUTO NORMAL'}</span>
              </div>

              {/* ── PROMOÇÃO ── */}
              <div className="editor-section-divider"><Percent size={14} /> PROMOÇÃO</div>
              <div className="editor-row">
                <div className="editor-field">
                  <label>DESCONTO</label>
                  <input type="number" step="0.01" min="0" value={editingProduct.promo_desconto || ''} onChange={(e) => setEditingProduct(prev => ({ ...prev, promo_desconto: e.target.value }))} placeholder="Ex: 30" />
                </div>
                <div className="editor-field">
                  <label>TIPO</label>
                  <select value={editingProduct.promo_tipo || 'porcentagem'} onChange={(e) => setEditingProduct(prev => ({ ...prev, promo_tipo: e.target.value }))}>
                    <option value="porcentagem">% Porcentagem</option>
                    <option value="fixo">R$ Valor fixo</option>
                  </select>
                </div>
              </div>
              <div className="editor-row">
                <div className="editor-field">
                  <label><Calendar size={12} /> INÍCIO</label>
                  <input type="date" value={editingProduct.promo_inicio ? editingProduct.promo_inicio.split('T')[0] : ''} onChange={(e) => setEditingProduct(prev => ({ ...prev, promo_inicio: e.target.value }))} />
                </div>
                <div className="editor-field">
                  <label><Calendar size={12} /> FIM</label>
                  <input type="date" value={editingProduct.promo_fim ? editingProduct.promo_fim.split('T')[0] : ''} onChange={(e) => setEditingProduct(prev => ({ ...prev, promo_fim: e.target.value }))} />
                </div>
              </div>
              {editingProduct.promo_desconto && (
                <div className="editor-promo-hint">
                  {editingProduct.promo_tipo === 'porcentagem'
                    ? `O preço com desconto será R$ ${(parseFloat(editingProduct.preco || 0) * (1 - parseFloat(editingProduct.promo_desconto || 0) / 100)).toFixed(2)}`
                    : `O preço com desconto será R$ ${(parseFloat(editingProduct.preco || 0) - parseFloat(editingProduct.promo_desconto || 0)).toFixed(2)}`
                  }
                </div>
              )}

              {!isCreating && (
                <div className="editor-stats">
                  <div className="editor-stat"><span className="editor-stat-label">CLIQUES</span><span className="editor-stat-value">{editingProduct.cliques || 0}</span></div>
                  <div className="editor-stat"><span className="editor-stat-label">VENDAS</span><span className="editor-stat-value">{editingProduct.vendas || 0}</span></div>
                  <div className="editor-stat"><span className="editor-stat-label">CRIADO EM</span><span className="editor-stat-value">{editingProduct.created_at ? new Date(editingProduct.created_at).toLocaleDateString('pt-BR') : '—'}</span></div>
                </div>
              )}

              {!isCreating && (
                <div className="editor-danger">
                  <button onClick={() => openConfirm('Deletar produto?', async () => { await adminFetch(`${API_URL}/api/admin/produtos/${editingProduct.id}`, { method: 'DELETE' }); showToast('Produto deletado'); closeEditor(); loadData('produtos'); })} className="editor-delete-btn"><Trash2 size={14} /> DELETAR PRODUTO</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── BANNER TAB ──
  const renderBannerTab = () => (
    <div className="admin-config-section">
      <div className="config-section-header">
        <h3><Megaphone size={16} /> BANNER HERO</h3>
        <button className="editor-preview-toggle" onClick={() => setBannerPreview(p => !p)} title={bannerPreview ? 'Ocultar prévia' : 'Ver prévia do banner'}>
          {bannerPreview ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>

      <AnimatePresence>
        {bannerPreview && (
          <motion.div className="banner-preview-container" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="editor-preview-label"><Eye size={12} /> PRÉVIA DO BANNER NO SITE</div>
            <div className="banner-preview-card">
              {siteConfig.banner_imagem && <img src={siteConfig.banner_imagem} alt="Banner" className="banner-preview-bg" />}
              <div className="banner-preview-overlay">
                <h2>{siteConfig.banner_titulo || 'TÍTULO DO BANNER'}</h2>
                <p>{siteConfig.banner_subtitulo || 'Subtítulo do banner'}</p>
                {siteConfig.banner_link && <span className="banner-preview-cta">VER COLEÇÃO →</span>}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="config-form">
        <div className="editor-toggle-row" onClick={() => setSiteConfig(prev => ({ ...prev, banner_ativo: prev.banner_ativo === '1' ? '0' : '1' }))}>
          <div className={`editor-toggle ${siteConfig.banner_ativo === '1' ? 'active' : ''}`}><div className="editor-toggle-knob" /></div>
          <span>{siteConfig.banner_ativo === '1' ? 'BANNER ATIVO — Aparece no topo do site' : 'BANNER DESATIVADO'}</span>
        </div>

        <div className="editor-field">
          <label>TÍTULO</label>
          <input type="text" value={siteConfig.banner_titulo || ''} onChange={(e) => setSiteConfig(prev => ({ ...prev, banner_titulo: e.target.value }))} placeholder="Ex: NOVA COLEÇÃO RETRO 2025" />
        </div>
        <div className="editor-field">
          <label>SUBTÍTULO</label>
          <input type="text" value={siteConfig.banner_subtitulo || ''} onChange={(e) => setSiteConfig(prev => ({ ...prev, banner_subtitulo: e.target.value }))} placeholder="Ex: Camisas exclusivas com 30% OFF" />
        </div>
        <div className="editor-field">
          <label>LINK (opcional)</label>
          <input type="text" value={siteConfig.banner_link || ''} onChange={(e) => setSiteConfig(prev => ({ ...prev, banner_link: e.target.value }))} placeholder="Ex: /liga/BRASILEIRÃO" />
        </div>
        <div className="editor-field">
          <label>IMAGEM DO BANNER</label>
          <div className="banner-image-upload">
            {siteConfig.banner_imagem ? (
              <div className="banner-image-preview">
                <img src={siteConfig.banner_imagem} alt="Banner" />
                <label className="editor-upload-overlay"><Upload size={18} /><span>TROCAR</span><input type="file" accept="image/*" onChange={handleBannerImageUpload} hidden /></label>
              </div>
            ) : (
              <label className="banner-upload-placeholder"><Upload size={24} /><span>ENVIAR IMAGEM</span><input type="file" accept="image/*" onChange={handleBannerImageUpload} hidden /></label>
            )}
          </div>
        </div>

        <button className="config-save-btn" onClick={saveConfig} disabled={configSaving}>
          {configSaving ? 'SALVANDO...' : 'SALVAR BANNER'}
        </button>
      </div>
    </div>
  );

  // ── CONFIG TAB ──
  const renderConfigTab = () => (
    <div className="admin-config-section">
      <h3><Settings size={16} /> CONFIGURAÇÕES DO SITE</h3>
      <div className="config-form">
        <div className="editor-field">
          <label>NOME DA LOJA</label>
          <input type="text" value={siteConfig.nome_loja || ''} onChange={(e) => setSiteConfig(prev => ({ ...prev, nome_loja: e.target.value }))} placeholder="RETRO WAVE" />
        </div>
        <div className="editor-field">
          <label>TEXTO DO FOOTER</label>
          <textarea value={siteConfig.footer_texto || ''} onChange={(e) => setSiteConfig(prev => ({ ...prev, footer_texto: e.target.value }))} placeholder="Camisas retrô de futebol com design exclusivo..." rows={3} />
        </div>
        <div className="editor-row">
          <div className="editor-field">
            <label>INSTAGRAM</label>
            <input type="text" value={siteConfig.instagram || ''} onChange={(e) => setSiteConfig(prev => ({ ...prev, instagram: e.target.value }))} placeholder="@retrowavecamisas" />
          </div>
        </div>
        <button className="config-save-btn" onClick={saveConfig} disabled={configSaving}>
          {configSaving ? 'SALVANDO...' : 'SALVAR CONFIGURAÇÕES'}
        </button>
      </div>
    </div>
  );

  // Chart tooltip custom
  const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '10px 14px', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
        <p style={{ color: '#fff', fontWeight: 700, marginBottom: 4 }}>{label}</p>
        {payload.map((e, i) => (
          <p key={i} style={{ color: e.color, margin: '2px 0' }}>{e.name}: {e.name === 'Receita' ? `R$ ${parseFloat(e.value).toFixed(2)}` : e.value}</p>
        ))}
      </div>
    );
  };

  // ── DASHBOARD ──
  const lucro = parseFloat(stats.receitaTotal) - parseFloat(stats.despesasTotal);
  const despesaForm = editingDespesa || novaDespesa;
  const setDespesaForm = editingDespesa ? setEditingDespesa : setNovaDespesa;
  const cupomForm = editingCupom || novoCupom;
  const setCupomForm = editingCupom ? setEditingCupom : setNovoCupom;

  const displayStats = periodStats || {
    receita: stats.receitaTotal, despesas: stats.despesasTotal,
    pedidos: stats.totalPedidos, visitantes: stats.totalVisitantes, cliques: stats.totalCliquesGeral
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <AnimatePresence>
        {toast && (
          <motion.div className="admin-toast" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Modal */}
      <AnimatePresence>
        {confirmModal.open && (
          <motion.div className="confirm-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeConfirm}>
            <motion.div className="confirm-modal-box" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }} onClick={e => e.stopPropagation()}>
              <p className="confirm-modal-msg">{confirmModal.msg}</p>
              <div className="confirm-modal-actions">
                <button className="confirm-modal-cancel" onClick={closeConfirm}>CANCELAR</button>
                <button className="confirm-modal-ok" onClick={() => { closeConfirm(); confirmModal.onConfirm?.(); }}>CONFIRMAR</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {renderProductEditor()}

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>DASHBOARD</h1>
          <button className="dashboard-logout" onClick={() => { sessionStorage.removeItem('rw_admin_token'); setIsLoggedIn(false); }}>
            <LogOut size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> SAIR
          </button>
        </div>

        <div className="admin-tabs" style={{ display: 'none' }}>
          {['dashboard', 'produtos', 'banner', 'config', 'despesas', 'pedidos', 'cupons', 'avaliacoes'].map(tab => (
            <button key={tab} className={`admin-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => { setActiveTab(tab); setVisibleCount(PRODUCTS_PER_PAGE); setSelectedIds(new Set()); setBatchMode(false); }}>
              {tab === 'avaliacoes' ? 'REVIEWS' : tab.toUpperCase()}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <>
            {/* Period filter (A8) */}
            <div className="metrics-period-bar">
              <Filter size={12} />
              {['all', 'hoje', 'semana', 'mes', 'custom'].map(p => (
                <button key={p} className={`period-btn ${metricPeriod === p ? 'active' : ''}`} onClick={() => loadPeriodStats(p)}>
                  {p === 'all' ? 'TOTAL' : p === 'custom' ? 'CUSTOM' : p.toUpperCase()}
                </button>
              ))}
              {metricPeriod === 'custom' && (
                <div className="period-custom-inputs">
                  <input type="date" value={customRange.inicio} onChange={e => setCustomRange(prev => ({ ...prev, inicio: e.target.value }))} />
                  <input type="date" value={customRange.fim} onChange={e => setCustomRange(prev => ({ ...prev, fim: e.target.value }))} />
                  <button className="period-btn active" onClick={() => loadPeriodStats('custom')}>FILTRAR</button>
                </div>
              )}
            </div>

            <div className="metrics-grid">
              <div className="metric-card"><span className="metric-label">RECEITA BRUTA</span><span className="metric-value">R$ {parseFloat(displayStats.receita || displayStats.receitaTotal || 0).toFixed(2)}</span><span className="metric-sub">{displayStats.pedidos || displayStats.totalPedidos || 0} pedidos</span></div>
              <div className="metric-card"><span className="metric-label">DESPESAS</span><span className="metric-value">R$ {parseFloat(displayStats.despesas || displayStats.despesasTotal || 0).toFixed(2)}</span></div>
              <div className="metric-card highlight"><span className="metric-label">LUCRO LÍQUIDO</span><span className="metric-value">R$ {(parseFloat(displayStats.receita || displayStats.receitaTotal || 0) - parseFloat(displayStats.despesas || displayStats.despesasTotal || 0)).toFixed(2)}</span></div>
              <div className="metric-card"><span className="metric-label">VISITANTES / CLIQUES</span><span className="metric-value">{displayStats.visitantes || displayStats.totalVisitantes || 0}</span><span className="metric-sub">{displayStats.cliques || displayStats.totalCliquesGeral || 0} cliques</span></div>
            </div>

            {/* CSV & PDF Exports */}
            <div className="export-bar">
              <Download size={12} />
              <button onClick={() => exportCSV(pedidos, 'pedidos', [
                { label: 'ID', key: 'id' }, { label: 'Cliente', key: 'nome' }, { label: 'Email', key: 'email' },
                { label: 'Total', getter: r => parseFloat(r.total).toFixed(2) }, { label: 'Status', key: 'status' },
                { label: 'Data', getter: r => new Date(r.created_at).toLocaleDateString('pt-BR') }
              ])}>PEDIDOS CSV</button>
              <button onClick={() => exportCSV(despesas, 'despesas', [
                { label: 'ID', key: 'id' }, { label: 'Descrição', key: 'descricao' },
                { label: 'Valor', getter: r => parseFloat(r.valor).toFixed(2) },
                { label: 'Data', getter: r => r.data_despesa ? new Date(r.data_despesa).toLocaleDateString('pt-BR') : '' }
              ])}>DESPESAS CSV</button>
              <button onClick={() => exportCSV(produtos, 'produtos', [
                { label: 'ID', key: 'id' }, { label: 'Nome', key: 'nome' }, { label: 'Liga', key: 'liga' },
                { label: 'Preço', getter: r => parseFloat(r.preco).toFixed(2) }, { label: 'Cliques', key: 'cliques' },
                { label: 'Vendas', key: 'vendas' }, { label: 'Estoque P', key: 'estoque_p' }, { label: 'Estoque M', key: 'estoque_m' },
                { label: 'Estoque G', key: 'estoque_g' }, { label: 'Estoque GG', key: 'estoque_gg' }
              ])}>PRODUTOS CSV</button>
              <span style={{ opacity: 0.15 }}>|</span>
              <button onClick={() => exportPDF(pedidos, 'pedidos', [
                { label: 'ID', key: 'id' }, { label: 'Cliente', key: 'nome' }, { label: 'Email', key: 'email' },
                { label: 'Total', getter: r => parseFloat(r.total).toFixed(2) }, { label: 'Status', key: 'status' },
                { label: 'Data', getter: r => new Date(r.created_at).toLocaleDateString('pt-BR') }
              ], 'RELATÓRIO DE PEDIDOS')}>PEDIDOS PDF</button>
              <button onClick={() => exportPDF(despesas, 'despesas', [
                { label: 'ID', key: 'id' }, { label: 'Descrição', key: 'descricao' },
                { label: 'Valor', getter: r => parseFloat(r.valor).toFixed(2) },
                { label: 'Data', getter: r => r.data_despesa ? new Date(r.data_despesa).toLocaleDateString('pt-BR') : '' }
              ], 'RELATÓRIO DE DESPESAS')}>DESPESAS PDF</button>
              <button onClick={() => exportPDF(produtos, 'produtos', [
                { label: 'ID', key: 'id' }, { label: 'Nome', key: 'nome' }, { label: 'Liga', key: 'liga' },
                { label: 'Preço', getter: r => parseFloat(r.preco).toFixed(2) }, { label: 'Cliques', key: 'cliques' },
                { label: 'Vendas', key: 'vendas' }
              ], 'RELATÓRIO DE PRODUTOS')}>PRODUTOS PDF</button>
            </div>

            {/* Charts (A2) */}
            {chartData.length > 0 && (
              <div className="dashboard-charts">
                <div className="chart-card">
                  <h4>RECEITA — ÚLTIMOS 30 DIAS</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData.map(d => ({ ...d, dia: d.dia?.substring(5) || '' }))}>
                      <defs>
                        <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#fff" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="receita" stroke="#fff" fill="url(#gradReceita)" strokeWidth={2} name="Receita" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h4>VISITANTES & PEDIDOS</h4>
                  <ResponsiveContainer width="100%" height={200}>
                    <RChart data={chartData.map(d => ({ ...d, dia: d.dia?.substring(5) || '' }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="dia" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                      <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.4)' }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="visitantes" fill="rgba(255,255,255,0.25)" name="Visitantes" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="pedidos" fill="#fff" name="Pedidos" radius={[3, 3, 0, 0]} />
                    </RChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="dashboard-columns">
              <div className="dashboard-section">
                <h3>TOP 5 — MAIS CLICADAS</h3>
                {(stats.maisClicadas || []).map((p, i) => (
                  <div key={p.id} className="ranking-item"><span className="rank">{i+1}</span><span className="name">{p.nome}</span><span className="value">{p.cliques} CLIQUES</span></div>
                ))}
                {(!stats.maisClicadas || stats.maisClicadas.length === 0) && <div style={{ opacity: 0.3, fontSize: '0.7rem', padding: '20px 0' }}>SEM DADOS</div>}
              </div>
              <div className="dashboard-section">
                <h3>TOP 5 — MAIS VENDIDAS</h3>
                {(stats.maisVendidas || []).map((p, i) => (
                  <div key={p.id} className="ranking-item"><span className="rank">{i+1}</span><span className="name">{p.nome}</span><span className="value">{p.vendas} VENDAS</span></div>
                ))}
                {(!stats.maisVendidas || stats.maisVendidas.length === 0) && <div style={{ opacity: 0.3, fontSize: '0.7rem', padding: '20px 0' }}>SEM DADOS</div>}
              </div>
            </div>
          </>
        )}

        {activeTab === 'produtos' && (
          <div>
            <div className="produtos-header">
              <h3>{filteredProdutos.length} PRODUTOS {searchAdmin ? 'ENCONTRADOS' : 'CADASTRADOS'}</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Batch mode toggle (A9) */}
                <button className={`batch-toggle-btn ${batchMode ? 'active' : ''}`} onClick={() => { setBatchMode(m => !m); setSelectedIds(new Set()); }} title="Modo seleção em lote">
                  <CheckIcon size={14} /> LOTE
                </button>
                <button className="new-product-btn" onClick={openNewProduct}><Plus size={14} /> NOVO PRODUTO</button>
              </div>
            </div>

            {/* Search bar (A1) */}
            <div className="admin-search-bar">
              <Search size={14} />
              <input type="text" placeholder="BUSCAR PRODUTO POR NOME OU LIGA..." value={searchAdmin} onChange={e => setSearchAdmin(e.target.value)} />
              {searchAdmin && <button onClick={() => setSearchAdmin('')} style={{ background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: 4 }}>✕</button>}
            </div>

            {/* Batch action bar (A9) */}
            {batchMode && selectedIds.size > 0 && (
              <div className="batch-action-bar">
                <span>{selectedIds.size} selecionado(s)</span>
                <button onClick={batchToggleDestaque}><Pin size={12} /> TOGGLE DESTAQUE</button>
                <button className="delete" onClick={batchDelete}><Trash2 size={12} /> DELETAR</button>
                <button onClick={() => setSelectedIds(new Set())}>LIMPAR</button>
              </div>
            )}

            {produtosLoading ? (
              <div className="produtos-grid">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="produto-card-admin produto-card-shimmer">
                    <div className="shimmer-thumb" />
                    <div className="shimmer-info"><div className="shimmer-line shimmer-liga" /><div className="shimmer-line shimmer-nome" /><div className="shimmer-line shimmer-preco" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="produtos-grid">
                  {filteredProdutos.slice(0, visibleCount).map(p => (
                    <AdminProductCard
                      key={p.id}
                      product={p}
                      batchMode={batchMode}
                      isSelected={selectedIds.has(p.id)}
                      onOpen={openProductEditor}
                      onToggleSelect={handleToggleSelect}
                      onToggleDestaque={handleToggleDestaque}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDeleteProduto}
                    />
                  ))}
                </div>
                {visibleCount < filteredProdutos.length && (
                  <button className="load-more-btn" onClick={() => setVisibleCount(v => Math.min(v + PRODUCTS_PER_PAGE, filteredProdutos.length))}>
                    CARREGAR MAIS ({filteredProdutos.length - visibleCount} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'banner' && renderBannerTab()}
        {activeTab === 'config' && renderConfigTab()}

        {activeTab === 'despesas' && (
          <div>
            <form className="admin-form" onSubmit={handleDespesaSubmit}>
              <input placeholder="Descrição" value={despesaForm.descricao} onChange={(e) => { const v = e.target.value; setDespesaForm(prev => ({ ...prev, descricao: v })); }} required />
              <input type="number" step="0.01" placeholder="Valor" value={despesaForm.valor} onChange={(e) => { const v = e.target.value; setDespesaForm(prev => ({ ...prev, valor: v })); }} required />
              <input type="date" value={despesaForm.data_despesa} onChange={(e) => { const v = e.target.value; setDespesaForm(prev => ({ ...prev, data_despesa: v })); }} required />
              <button type="submit">{editingDespesa ? 'SALVAR' : 'CADASTRAR DESPESA'}</button>
              {editingDespesa && <button type="button" onClick={() => setEditingDespesa(null)} style={{ background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--text-color)' }}>CANCELAR</button>}
            </form>
            <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>ID</th><th>DESCRIÇÃO</th><th>VALOR</th><th>DATA</th><th>AÇÕES</th></tr></thead>
              <tbody>
                {despesas.map(d => (
                  <tr key={d.id}><td>{d.id}</td><td>{d.descricao}</td><td>R$ {parseFloat(d.valor).toFixed(2)}</td><td>{d.data_despesa ? new Date(d.data_despesa).toLocaleDateString('pt-BR') : '-'}</td>
                    <td><button className="action-btn" onClick={() => setEditingDespesa(d)}>EDITAR</button><button className="action-btn delete" onClick={() => deleteDespesa(d.id)}>DELETAR</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === 'pedidos' && (
          <div>
            <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>PEDIDO</th><th>CLIENTE</th><th>EMAIL</th><th>TOTAL</th><th>STATUS</th><th>DATA</th><th>AÇÃO</th></tr></thead>
              <tbody>
                {pedidos.map(p => (
                  <tr key={p.id}><td>#{p.id}</td><td>{p.nome || '—'}</td><td>{p.email || '—'}</td><td>R$ {parseFloat(p.total).toFixed(2)}</td>
                    <td><span className={`pedido-status ${p.status}`}>{p.status}</span></td>
                    <td>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                    <td><select value={p.status} onChange={(e) => updatePedidoStatus(p.id, e.target.value)} className="status-select">
                      <option value="concluido">Confirmado</option><option value="preparando">Preparando</option><option value="enviado">Enviado</option><option value="entregue">Entregue</option><option value="cancelado">Cancelado</option>
                    </select></td>
                  </tr>
                ))}
                {pedidos.length === 0 && <tr><td colSpan="7" style={{ textAlign: 'center', opacity: 0.3, padding: '30px' }}>SEM PEDIDOS</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* CUPONS TAB (A6) */}
        {activeTab === 'cupons' && (
          <div>
            <form className="admin-form" onSubmit={handleCupomSubmit}>
              <input placeholder="CÓDIGO (ex: RETRO10)" value={cupomForm.codigo} onChange={e => { const v = e.target.value.toUpperCase(); setCupomForm(prev => ({ ...prev, codigo: v })); }} required style={{ textTransform: 'uppercase' }} />
              <select value={cupomForm.tipo} onChange={e => { const v = e.target.value; setCupomForm(prev => ({ ...prev, tipo: v })); }}>
                <option value="porcentagem">% Porcentagem</option>
                <option value="fixo">R$ Fixo</option>
              </select>
              <input type="number" step="0.01" placeholder="Valor desconto" value={cupomForm.valor} onChange={e => { const v = e.target.value; setCupomForm(prev => ({ ...prev, valor: v })); }} required />
              <input type="number" step="0.01" placeholder="Mínimo pedido (0=sem)" value={cupomForm.minimo} onChange={e => { const v = e.target.value; setCupomForm(prev => ({ ...prev, minimo: v })); }} />
              <input type="number" placeholder="Usos máx (0=ilimitado)" value={cupomForm.usos_max} onChange={e => { const v = e.target.value; setCupomForm(prev => ({ ...prev, usos_max: v })); }} />
              <input type="date" value={cupomForm.validade || ''} onChange={e => { const v = e.target.value; setCupomForm(prev => ({ ...prev, validade: v })); }} title="Validade" />
              <button type="submit">{editingCupom ? 'SALVAR' : 'CRIAR CUPOM'}</button>
              {editingCupom && <button type="button" onClick={() => setEditingCupom(null)} style={{ background: 'transparent', border: '1px solid var(--accent-color)', color: 'var(--text-color)' }}>CANCELAR</button>}
            </form>
            <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>CÓDIGO</th><th>TIPO</th><th>VALOR</th><th>MÍNIMO</th><th>USOS</th><th>VALIDADE</th><th>ATIVO</th><th>AÇÕES</th></tr></thead>
              <tbody>
                {cupons.map(c => (
                  <tr key={c.id}>
                    <td><strong style={{ letterSpacing: 2 }}>{c.codigo}</strong></td>
                    <td>{c.tipo === 'porcentagem' ? '%' : 'R$'}</td>
                    <td>{parseFloat(c.valor).toFixed(2)}</td>
                    <td>R$ {parseFloat(c.minimo).toFixed(2)}</td>
                    <td>{c.usos_atuais}/{c.usos_max || '∞'}</td>
                    <td>{c.validade ? new Date(c.validade).toLocaleDateString('pt-BR') : 'Sem limite'}</td>
                    <td><span className={c.ativo ? 'badge-ativo' : 'badge-inativo'}>{c.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                    <td>
                      <button className="action-btn" onClick={() => setEditingCupom(c)}>EDITAR</button>
                      <button className="action-btn delete" onClick={() => deleteCupom(c.id)}>DELETAR</button>
                    </td>
                  </tr>
                ))}
                {cupons.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', opacity: 0.3, padding: '30px' }}>NENHUM CUPOM</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* AVALIAÇÕES TAB (C8) */}
        {activeTab === 'avaliacoes' && (
          <div>
            <h3 style={{ marginBottom: 16, fontSize: '0.75rem', letterSpacing: 3 }}><MessageSquare size={14} /> AVALIAÇÕES DE CLIENTES</h3>
            <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>PRODUTO</th><th>CLIENTE</th><th>NOTA</th><th>COMENTÁRIO</th><th>STATUS</th><th>AÇÕES</th></tr></thead>
              <tbody>
                {avaliacoes.map(a => (
                  <tr key={a.id}>
                    <td>{a.produto_nome || `#${a.produto_id}`}</td>
                    <td>{a.nome}<br/><small style={{ opacity: 0.5 }}>{a.email}</small></td>
                    <td>{'★'.repeat(a.nota)}{'☆'.repeat(5 - a.nota)}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.comentario || '—'}</td>
                    <td><span className={a.aprovada ? 'badge-ativo' : 'badge-inativo'}>{a.aprovada ? 'APROVADA' : 'PENDENTE'}</span></td>
                    <td>
                      <button className="action-btn" onClick={() => toggleAprovacao(a.id)}>{a.aprovada ? 'REPROVAR' : 'APROVAR'}</button>
                      <button className="action-btn delete" onClick={() => deleteAvaliacao(a.id)}>DELETAR</button>
                    </td>
                  </tr>
                ))}
                {avaliacoes.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', opacity: 0.3, padding: '30px' }}>NENHUMA AVALIAÇÃO</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* NEWSLETTER TAB */}
        {activeTab === 'newsletter' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: '0.75rem', letterSpacing: 3 }}><Mail size={14} /> NEWSLETTER — ENVIAR EMAIL EM MASSA</h3>
              <button className={`action-btn ${aiOpen ? 'active-destaque' : ''}`} onClick={() => setAiOpen(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6rem' }}>
                ✨ ASSISTENTE IA
              </button>
            </div>

            {/* AI Assistant Panel */}
            {aiOpen && (
              <div className="admin-ai-panel" style={{ marginBottom: 20, border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.6rem', letterSpacing: 2, fontWeight: 700 }}>✨ ASSISTENTE DE MARKETING IA</span>
                  <button className="action-btn" onClick={() => { setAiMessages([]); setAiInput(''); }} style={{ fontSize: '0.55rem' }}>LIMPAR</button>
                </div>
                <div style={{ maxHeight: 280, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aiMessages.length === 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {aiQuickPrompts.map((p, i) => (
                        <button key={i} className="chat-quick-btn" style={{ fontSize: '0.55rem' }} onClick={() => sendAiMessage(p)}>{p}</button>
                      ))}
                    </div>
                  )}
                  {aiMessages.map((msg, i) => (
                    <div key={i} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', padding: '8px 12px', borderRadius: 10, fontSize: '0.65rem', lineHeight: 1.5, background: msg.role === 'user' ? 'var(--text-color)' : 'rgba(255,255,255,0.06)', color: msg.role === 'user' ? 'var(--bg-color)' : 'var(--text-color)', whiteSpace: 'pre-wrap' }}>
                      {msg.text}
                      {msg.role === 'assistant' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <button className="action-btn" style={{ fontSize: '0.5rem' }} onClick={() => {
                            const clean = stripMarkdown(msg.text);
                            const lines = clean.split('\n');
                            const assuntoLine = lines.find(l => l.toLowerCase().includes('assunto'));
                            if (assuntoLine) {
                              setNlAssunto(assuntoLine.replace(/^.*?:\s*/, '').trim());
                            } else {
                              setNlAssunto(lines[0].trim());
                            }
                          }}>USAR ASSUNTO</button>
                          <button className="action-btn" style={{ fontSize: '0.5rem' }} onClick={() => {
                            const clean = stripMarkdown(msg.text);
                            const lines = clean.split('\n');
                            const conteudoIdx = lines.findIndex(l => l.toLowerCase().includes('conteúdo') || l.toLowerCase().includes('conteudo'));
                            if (conteudoIdx >= 0) {
                              setNlConteudo(lines.slice(conteudoIdx + 1).join('\n').trim());
                            } else {
                              setNlConteudo(clean);
                            }
                          }}>USAR COMO CONTEÚDO</button>
                        </div>
                      )}
                    </div>
                  ))}
                  {aiLoading && <div style={{ fontSize: '0.6rem', opacity: 0.5 }}>Gerando...</div>}
                </div>
                <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: 8 }}>
                  <input placeholder="Peça ideias, textos, promoções..." value={aiInput} onChange={e => setAiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendAiMessage(aiInput); }} style={{ flex: 1, background: 'var(--accent-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '8px 12px', fontSize: '0.65rem', borderRadius: 6 }} />
                  <button className="action-btn" disabled={!aiInput.trim() || aiLoading} onClick={() => sendAiMessage(aiInput)}>ENVIAR</button>
                </div>
              </div>
            )}

            <form className="admin-form" onSubmit={enviarNewsletter} style={{ marginBottom: 24 }}>
              <input placeholder="ASSUNTO DO EMAIL" value={nlAssunto} onChange={e => setNlAssunto(e.target.value)} required />
              <textarea placeholder="CONTEÚDO DO EMAIL (texto simples, quebras de linha serão mantidas)" value={nlConteudo} onChange={e => setNlConteudo(e.target.value)} required style={{ minHeight: 120, resize: 'vertical', fontFamily: 'var(--font-family)', fontSize: '0.7rem', padding: '12px', background: 'var(--accent-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} />
              <button type="submit" disabled={nlEnviando}>{nlEnviando ? 'ENVIANDO...' : `ENVIAR PARA ${nlSubscribers.filter(s => s.ativo).length} INSCRITO(S)`}</button>
            </form>

            <h4 style={{ marginBottom: 12, fontSize: '0.65rem', letterSpacing: 2, opacity: 0.5 }}>INSCRITOS ({nlSubscribers.length})</h4>
            <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead><tr><th>EMAIL</th><th>NOME</th><th>DATA</th><th>STATUS</th><th>AÇÕES</th></tr></thead>
              <tbody>
                {nlSubscribers.map(s => (
                  <tr key={s.id}>
                    <td>{s.email}</td>
                    <td>{s.nome || '—'}</td>
                    <td>{new Date(s.created_at).toLocaleDateString('pt-BR')}</td>
                    <td><span className={s.ativo ? 'badge-ativo' : 'badge-inativo'}>{s.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                    <td><button className="action-btn delete" onClick={() => deleteSubscriber(s.id)}>REMOVER</button></td>
                  </tr>
                ))}
                {nlSubscribers.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.3, padding: '30px' }}>NENHUM INSCRITO</td></tr>}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default AdminDashboard;
