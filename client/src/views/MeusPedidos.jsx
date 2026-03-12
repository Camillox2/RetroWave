import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API_URL } from '../config.js';
import { Package, Truck, CheckCircle, Clock, XCircle, LogOut, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

const STATUS_CONFIG = {
  aguardando: { label: 'AGUARDANDO ENVIO', icon: Clock, step: 1 },
  concluido: { label: 'PEDIDO CONFIRMADO', icon: CheckCircle, step: 1 },
  preparando: { label: 'PREPARANDO', icon: Clock, step: 2 },
  enviado: { label: 'ENVIADO', icon: Truck, step: 3 },
  entregue: { label: 'ENTREGUE', icon: Package, step: 4 },
  cancelado: { label: 'CANCELADO', icon: XCircle, step: 0 },
};

const PER_PAGE = 10;

function MeusPedidos({ cliente, onLogout }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expandedPedido, setExpandedPedido] = useState(null);
  const [page, setPage] = useState(1);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchPedidos = useCallback(() => {
    if (!cliente?.email) return;
    fetch(`${API_URL}/api/cliente/pedidos?email=${encodeURIComponent(cliente.email)}`)
      .then(r => r.json())
      .then(data => {
        setPedidos(Array.isArray(data) ? data : []);
        setLoading(false);
        setFetchError(false);
        setLastRefresh(new Date());
      })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, [cliente?.email]);

  useEffect(() => {
    if (!cliente?.email) {
      navigate('/');
      return;
    }
    fetchPedidos();
  }, [cliente, navigate, fetchPedidos]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!cliente?.email) return;
    const interval = setInterval(fetchPedidos, 30000);
    return () => clearInterval(interval);
  }, [cliente?.email, fetchPedidos]);

  if (loading) {
    return (
      <div className="pedidos-page">
        <div className="pedidos-loading">{t('orders.loading')}</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="pedidos-page">
        <div className="pedidos-empty">
          <Package size={40} strokeWidth={1} />
          <p>{t('orders.error') || 'Erro ao carregar pedidos. Verifique sua conexão.'}</p>
        </div>
      </div>
    );
  }

  const estimarEntrega = (pedido) => {
    const { status, data_envio, codigo_rastreio } = pedido;
    if (status === 'entregue') return t('orders.delivered') || 'Pedido entregue';
    if (status === 'cancelado') return t('orders.cancelled') || 'Pedido cancelado';
    if (status === 'aguardando' || status === 'preparando') return t('orders.delivery_to_confirm');
    if (status === 'enviado' && data_envio) {
      const d = new Date(data_envio);
      d.setDate(d.getDate() + 10);
      return t('orders.delivery_estimate').replace('{date}', d.toLocaleDateString('pt-BR'));
    }
    return t('orders.delivery_soon');
  };

  return (
    <div className="pedidos-page">
      <div className="pedidos-header">
        <div>
          <h1>{t('orders.title')}</h1>
          <p className="pedidos-cliente-info">
            {cliente.nome} — {cliente.email}
            {lastRefresh && <span style={{ opacity: 0.3, marginLeft: 12, fontSize: '0.55rem' }}>⟳ {lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="pedidos-refresh-btn" onClick={fetchPedidos} title="Atualizar pedidos">
            <RefreshCw size={14} />
          </button>
          <button className="pedidos-logout" onClick={onLogout}>
            <LogOut size={14} />
            {t('orders.logout')}
          </button>
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="pedidos-empty">
          <Package size={40} strokeWidth={1} />
          <p>{t('orders.empty')}</p>
        </div>
      ) : (
        <div className="pedidos-list">
          {pedidos.slice((page - 1) * PER_PAGE, page * PER_PAGE).map(pedido => {
            const statusInfo = STATUS_CONFIG[pedido.status] || STATUS_CONFIG.concluido;
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedPedido === pedido.id;
            const isCancelled = pedido.status === 'cancelado';

            return (
              <div key={pedido.id} className={`pedido-card ${isCancelled ? 'cancelled' : ''}`}>
                {/* Header do pedido */}
                <div
                  className="pedido-card-header"
                  onClick={() => setExpandedPedido(isExpanded ? null : pedido.id)}
                >
                  <div className="pedido-card-left">
                    <span className="pedido-numero">{t('orders.order')} #{pedido.id}</span>
                    <span className="pedido-data">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="pedido-card-right">
                    <span className={`pedido-status-badge ${pedido.status}`}>
                      <StatusIcon size={12} />
                      {t(`orders.status_${pedido.status}`)}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Tracking visual */}
                {!isCancelled && (
                  <div className="tracking-bar">
                    <div className="tracking-progress" style={{ width: `${(statusInfo.step / 4) * 100}%` }} />
                    <div className="tracking-steps">
                      {[t('orders.track_waiting'), t('orders.track_preparing'), t('orders.track_shipped'), t('orders.track_delivered')].map((label, i) => (
                        <div
                          key={label}
                          className={`tracking-step ${(i + 1) <= statusInfo.step ? 'active' : ''}`}
                        >
                          <div className="tracking-dot" />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="pedido-card-details">
                    <div className="pedido-entrega">
                      <Truck size={14} />
                      <span>{estimarEntrega(pedido)}</span>
                    </div>
                    {pedido.codigo_rastreio && (
                      <div className="pedido-rastreio">
                        <Package size={14} />
                        <span>{t('orders.tracking_label')} <strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{pedido.codigo_rastreio}</strong></span>
                        <a
                          href={`https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(pedido.codigo_rastreio)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rastreio-link"
                        >
                          {t('orders.tracking_link')} ↗
                        </a>
                      </div>
                    )}

                    <div className="pedido-itens-list">
                      <h4>{t('orders.order_items')}</h4>
                      {(pedido.itens || []).map((item, i) => (
                        <div key={i} className="pedido-item-row">
                          <div className="pedido-item-info">
                            <span className="pedido-item-nome">{item.nome}</span>
                            <span className="pedido-item-liga">{item.liga}{item.tamanho ? ` — ${t('orders.size_abbr')} ${item.tamanho}` : ''}</span>
                          </div>
                          <div className="pedido-item-valores">
                            <span className="pedido-item-qtd">×{item.quantidade}</span>
                            <span className="pedido-item-preco">
                              R$ {(parseFloat(item.preco_unitario) * item.quantidade).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pedido-total-row">
                      <span>{t('orders.total').toUpperCase()}</span>
                      <span>R$ {parseFloat(pedido.total).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {pedidos.length > PER_PAGE && (
            <div className="pedidos-pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="pedidos-page-btn"
              >← {t('orders.page_prev').replace('← ', '')}</button>
              <span>{page} / {Math.ceil(pedidos.length / PER_PAGE)}</span>
              <button
                disabled={page >= Math.ceil(pedidos.length / PER_PAGE)}
                onClick={() => setPage(p => p + 1)}
                className="pedidos-page-btn"
              >{t('orders.page_next').replace(' →', '')} →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MeusPedidos;
