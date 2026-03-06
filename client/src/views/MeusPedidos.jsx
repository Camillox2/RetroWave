import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API_URL } from '../config.js';
import { Package, Truck, CheckCircle, Clock, XCircle, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_CONFIG = {
  concluido: { label: 'PEDIDO CONFIRMADO', icon: CheckCircle, step: 1 },
  preparando: { label: 'PREPARANDO', icon: Clock, step: 2 },
  enviado: { label: 'ENVIADO', icon: Truck, step: 3 },
  entregue: { label: 'ENTREGUE', icon: Package, step: 4 },
  cancelado: { label: 'CANCELADO', icon: XCircle, step: 0 },
};

function MeusPedidos({ cliente, onLogout }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [expandedPedido, setExpandedPedido] = useState(null);

  useEffect(() => {
    if (!cliente?.email) {
      navigate('/');
      return;
    }

    fetch(`${API_URL}/api/cliente/pedidos?email=${encodeURIComponent(cliente.email)}`)
      .then(r => r.json())
      .then(data => {
        setPedidos(data);
        setLoading(false);
      })
      .catch(() => { setFetchError(true); setLoading(false); });
  }, [cliente, navigate]);

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

  const estimarEntrega = (createdAt, status) => {
    const data = new Date(createdAt);
    if (status === 'entregue') return t('orders.delivered');
    if (status === 'cancelado') return t('orders.cancelled');
    data.setDate(data.getDate() + 12);
    return `${t('orders.estimate')}: ${data.toLocaleDateString('pt-BR')}`;
  };

  return (
    <div className="pedidos-page">
      <div className="pedidos-header">
        <div>
          <h1>{t('orders.title')}</h1>
          <p className="pedidos-cliente-info">
            {cliente.nome} — {cliente.email}
          </p>
        </div>
        <button className="pedidos-logout" onClick={onLogout}>
          <LogOut size={14} />
          {t('orders.logout')}
        </button>
      </div>

      {pedidos.length === 0 ? (
        <div className="pedidos-empty">
          <Package size={40} strokeWidth={1} />
          <p>{t('orders.empty')}</p>
        </div>
      ) : (
        <div className="pedidos-list">
          {pedidos.map(pedido => {
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
                      {[t('orders.status_concluido'), t('orders.status_preparando'), t('orders.status_enviado'), t('orders.status_entregue')].map((label, i) => (
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
                      <span>{estimarEntrega(pedido.created_at, pedido.status)}</span>
                    </div>

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
        </div>
      )}
    </div>
  );
}

export default MeusPedidos;
