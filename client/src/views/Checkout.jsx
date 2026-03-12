import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Package, Tag, Truck } from 'lucide-react';

import { API_URL } from '../config';

const Checkout = ({ cart, setCart, onClienteLogin }) => {

  const navigate = useNavigate();
  const { t } = useI18n();
  const [formData, setFormData] = useState({ email: '', nome: '', cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErro, setCepErro] = useState('');
  const [consentLgpd, setConsentLgpd] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [pedidoId, setPedidoId] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  // Cupom (A6)
  const [cupomCode, setCupomCode] = useState('');
  const [cupomData, setCupomData] = useState(null);
  const [cupomLoading, setCupomLoading] = useState(false);
  const [cupomError, setCupomError] = useState('');

  const [freteConfig, setFreteConfig] = useState({ ativo: true, valor: 29.90, gratis_acima: 299.90 });

  useEffect(() => {
    fetch(`${API_URL}/api/frete-config`)
      .then(r => r.json())
      .then(data => setFreteConfig(data))
      .catch(() => {});
  }, []);

  const subtotal = cart.reduce((acc, item) => acc + parseFloat(item.precoFinal ?? item.preco) * item.qtd, 0);

  const freteValor = !freteConfig.ativo || subtotal >= freteConfig.gratis_acima ? 0 : freteConfig.valor;
  const faltaParaGratis = Math.max(0, freteConfig.gratis_acima - subtotal);

  let desconto = 0;
  if (cupomData) {
    if (cupomData.tipo === 'porcentagem') desconto = subtotal * (cupomData.valor / 100);
    else desconto = Math.min(cupomData.valor, subtotal);
  }
  const total = Math.max(0, subtotal + freteValor - desconto);

  const buscarCep = async (cep) => {
    const clean = cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    setCepLoading(true);
    setCepErro('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) { setCepErro('CEP n\u00e3o encontrado'); return; }
      setFormData(prev => ({
        ...prev,
        logradouro: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        estado: data.uf || ''
      }));
    } catch { setCepErro('Erro ao buscar CEP'); }
    finally { setCepLoading(false); }
  };

  const validarCupom = async () => {
    if (!cupomCode.trim()) return;
    setCupomLoading(true);
    setCupomError('');
    setCupomData(null);
    try {
      const res = await fetch(`${API_URL}/api/validar-cupom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: cupomCode.trim().toUpperCase(), subtotal })
      });
      const data = await res.json();
      if (data.valid) {
        setCupomData(data.cupom);
      } else {
        setCupomError(data.message || t('checkout.error_coupon_invalid'));
      }
    } catch { setCupomError(t('checkout.error_coupon_network')); }
    finally { setCupomLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setEnviando(true);
    setErrMsg('');

    try {
      const res = await fetch(`${API_URL}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          nome: formData.nome,
          endereco: [formData.logradouro, formData.numero, formData.complemento, formData.bairro, formData.cidade + (formData.estado ? ' - ' + formData.estado : ''), `CEP ${formData.cep}`].filter(Boolean).join(', '),
          carrinho: cart,
          total,
          cupomCodigo: cupomData?.codigo || null
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrMsg(data.error || t('checkout.error_order'));
        return;
      }
      if (data.success) {
        setPedidoId(data.pedidoId);
        setSucesso(true);
        setCart([]);

        // Salvar cliente no localStorage para login persistente
        const enderecoString = [formData.logradouro, formData.numero, formData.complemento, formData.bairro, formData.cidade + (formData.estado ? ' - ' + formData.estado : ''), `CEP ${formData.cep}`].filter(Boolean).join(', ');
        const clienteData = data.cliente || {
          email: formData.email,
          nome: formData.nome,
          endereco: enderecoString
        };
        localStorage.setItem('retrowave_cliente', JSON.stringify(clienteData));
        if (onClienteLogin) onClienteLogin(clienteData);
      }
    } catch (err) {
      setErrMsg(t('checkout.error_network'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {sucesso && (
          <motion.div
            className="success-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <Check size={48} strokeWidth={1} />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.25 }}
            >
              {t('checkout.success_title')}
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.2 }}
            >
              {t('checkout.success_order')} #{pedidoId}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.25 }}
              style={{ display: 'flex', gap: '12px', marginTop: '24px' }}
            >
              <Link to="/meus-pedidos" className="success-btn primary">
                <Package size={14} />
                {t('checkout.view_order')}
              </Link>
              <Link to="/" className="success-btn secondary">
                {t('checkout.continue_shopping')}
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="checkout-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h2>{t('checkout.title')}</h2>

        {cart.length === 0 && !sucesso ? (
          <div style={{ textAlign: 'center', opacity: 0.3, padding: '60px 0', fontSize: '0.75rem', letterSpacing: '3px' }}>
            {t('checkout.empty_cart')}
          </div>
        ) : (
          <form className="checkout-form" onSubmit={handleSubmit}>
            <input
              className="checkout-input"
              type="email"
              placeholder={t('checkout.email')}
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              className="checkout-input"
              type="text"
              placeholder={t('checkout.name') || 'Nome completo'}
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
            />

            {/* CEP + auto-fill */}
            <div className="checkout-cep-row">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  className="checkout-input"
                  type="text"
                  placeholder="CEP"
                  required
                  maxLength={9}
                  style={{ flex: 1 }}
                  value={formData.cep}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g,'').replace(/(\d{5})(\d)/,'$1-$2').slice(0,9);
                    setFormData({ ...formData, cep: v });
                  }}
                  onBlur={(e) => buscarCep(e.target.value)}
                />
                {cepLoading && <span style={{ fontSize: '0.65rem', opacity: 0.6 }}>buscando...</span>}
              </div>
              {cepErro && <span style={{ fontSize: '0.65rem', color: '#ff4444', letterSpacing: 1 }}>{cepErro}</span>}
            </div>

            <input
              className="checkout-input"
              type="text"
              placeholder="Logradouro (Rua, Av.)"
              required
              value={formData.logradouro}
              onChange={(e) => setFormData({ ...formData, logradouro: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
              <input
                className="checkout-input"
                type="text"
                placeholder="Número"
                required
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              />
              <input
                className="checkout-input"
                type="text"
                placeholder="Complemento (opcional)"
                value={formData.complemento}
                onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
              />
            </div>
            <input
              className="checkout-input"
              type="text"
              placeholder="Bairro"
              required
              value={formData.bairro}
              onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <input
                className="checkout-input"
                type="text"
                placeholder="Cidade"
                required
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
              />
              <input
                className="checkout-input"
                type="text"
                placeholder="Estado"
                required
                maxLength={2}
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
              />
            </div>

            {freteConfig.ativo && (
              <div className="checkout-frete-info">
                <Truck size={13} />
                {faltaParaGratis <= 0
                  ? <span className="frete-gratis-badge">Frete grátis!</span>
                  : <span>Frete: <strong>R$ {freteConfig.valor.toFixed(2)}</strong> — frete grátis acima de R$ {freteConfig.gratis_acima.toFixed(2)}</span>
                }
              </div>
            )}

            <div className="checkout-cupom-row">
              <div className="checkout-cupom-input-wrap">
                <Tag size={14} />
                <input className="checkout-cupom-input" type="text" placeholder={t('checkout.coupon_placeholder')}
                  value={cupomCode} onChange={(e) => setCupomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), validarCupom())} />
                <button type="button" className="checkout-cupom-btn" onClick={validarCupom} disabled={cupomLoading || !cupomCode.trim()}>
                  {cupomLoading ? '...' : t('checkout.coupon_apply')}
                </button>
              </div>
              {cupomError && <span className="checkout-cupom-error">{cupomError}</span>}
              {cupomData && <span className="checkout-cupom-success">{t('checkout.coupon_applied')}: {cupomData.tipo === 'porcentagem' ? `${cupomData.valor}% OFF` : `R$ ${cupomData.valor.toFixed(2)} OFF`}</span>}
            </div>

            <div className="checkout-summary">
              {cart.map((item, i) => (
                <div key={i} className="checkout-summary-item">
                  <span>{item.nome} {item.tamanho ? `(${item.tamanho})` : ''} × {item.qtd}</span>
                  <span>R$ {(parseFloat(item.precoFinal || item.preco) * item.qtd).toFixed(2)}</span>
                </div>
              ))}
              {cupomData && desconto > 0 && (
                <div className="checkout-summary-item checkout-desconto">
                  <span>{t('checkout.discount').toUpperCase()} ({cupomData.codigo})</span>
                  <span>- R$ {desconto.toFixed(2)}</span>
                </div>
              )}
              <div className="checkout-summary-item">
                <span>{t('checkout.shipping') || 'FRETE'}</span>
                <span>{freteValor === 0 ? (t('checkout.shipping_free') || 'GRÁTIS') : `R$ ${freteValor.toFixed(2)}`}</span>
              </div>
              <div className="checkout-total">
                <span>{t('checkout.total')}</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="checkout-lgpd">
              <label className="lgpd-checkbox">
                <input
                  type="checkbox"
                  checked={consentLgpd}
                  onChange={(e) => setConsentLgpd(e.target.checked)}
                  required
                />
                <span className="lgpd-checkmark" />
                <span className="lgpd-text" dangerouslySetInnerHTML={{ __html: t('checkout.lgpd_consent') }} />
              </label>
            </div>

            {errMsg && (
              <div style={{ color: '#ff4444', fontSize: '0.7rem', letterSpacing: '1px', padding: '8px 0', textAlign: 'center' }}>
                {errMsg}
              </div>
            )}

            <button
              type="submit"
              className="checkout-submit"
              disabled={enviando || cart.length === 0 || !consentLgpd}
            >
              {enviando ? t('checkout.processing') : t('checkout.submit')}
            </button>
          </form>
        )}
      </motion.div>
    </>
  );
}

export default Checkout;
