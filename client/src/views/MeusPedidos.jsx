import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { API_URL } from '../config.js';
import { Package, Truck, CheckCircle, Clock, XCircle, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

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

  const estimarEntrega = (pedido) => {
    const { status, data_envio, codigo_rastreio } = pedido;
    if (status === 'entregue') return t('orders.delivered') || 'Pedido entregue';
    if (status === 'cancelado') return t('orders.cancelled') || 'Pedido cancelado';
    if (status === 'aguardando' || status === 'preparando') return 'Data de envio a confirmar';
    if (status === 'enviado' && data_envio) {
      const d = new Date(data_envio);
      d.setDate(d.getDate() + 10);
      return `Previsão de entrega: ${d.toLocaleDateString('pt-BR')}`;
    }
    return 'Previsão de entrega em breve';
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
                      {['Aguardando', 'Preparando', 'Enviado', 'Entregue'].map((label, i) => (
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
                        <span>Rastreio: <strong style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{pedido.codigo_rastreio}</strong></span>
                        <a
                          href={`https://rastreamento.correios.com.br/app/index.php?objetos=${pedido.codigo_rastreio}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rastreio-link"
                        >
                          Rastrear nos Correios ↗
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
              >← Anterior</button>
              <span>{page} / {Math.ceil(pedidos.length / PER_PAGE)}</span>
              <button
                disabled={page >= Math.ceil(pedidos.length / PER_PAGE)}
                onClick={() => setPage(p => p + 1)}
                className="pedidos-page-btn"
              >Próxima →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MeusPedidos;
