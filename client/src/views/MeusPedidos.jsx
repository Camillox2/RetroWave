import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, Clock, XCircle, LogOut, ChevronDown, ChevronUp } from 'lucide-react';

const API = 'http://localhost:3001';

const STATUS_CONFIG = {
  concluido: { label: 'PEDIDO CONFIRMADO', icon: CheckCircle, step: 1 },
  preparando: { label: 'PREPARANDO', icon: Clock, step: 2 },
  enviado: { label: 'ENVIADO', icon: Truck, step: 3 },
  entregue: { label: 'ENTREGUE', icon: Package, step: 4 },
  cancelado: { label: 'CANCELADO', icon: XCircle, step: 0 },
};

function MeusPedidos({ cliente, onLogout }) {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPedido, setExpandedPedido] = useState(null);

  useEffect(() => {
    if (!cliente?.email) {
      navigate('/');
      return;
    }

    fetch(`${API}/api/cliente/pedidos?email=${encodeURIComponent(cliente.email)}`)
      .then(r => r.json())
      .then(data => {
        setPedidos(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cliente, navigate]);

  if (loading) {
    return (
      <div className="pedidos-page">
        <div className="pedidos-loading">CARREGANDO PEDIDOS...</div>
      </div>
    );
  }

  const estimarEntrega = (createdAt, status) => {
    const data = new Date(createdAt);
    if (status === 'entregue') return 'ENTREGUE';
    if (status === 'cancelado') return 'CANCELADO';
    data.setDate(data.getDate() + 12);
    return `PREVISÃO: ${data.toLocaleDateString('pt-BR')}`;
  };

  return (
    <div className="pedidos-page">
      <div className="pedidos-header">
        <div>
          <h1>MEUS PEDIDOS</h1>
          <p className="pedidos-cliente-info">
            {cliente.nome} — {cliente.email}
          </p>
        </div>
        <button className="pedidos-logout" onClick={onLogout}>
          <LogOut size={14} />
          SAIR DA CONTA
        </button>
      </div>

      {pedidos.length === 0 ? (
        <div className="pedidos-empty">
          <Package size={40} strokeWidth={1} />
          <p>NENHUM PEDIDO ENCONTRADO</p>
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
                    <span className="pedido-numero">PEDIDO #{pedido.id}</span>
                    <span className="pedido-data">
                      {new Date(pedido.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </span>
                  </div>

                  <div className="pedido-card-right">
                    <span className={`pedido-status-badge ${pedido.status}`}>
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </span>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Tracking visual */}
                {!isCancelled && (
                  <div className="tracking-bar">
                    <div className="tracking-progress" style={{ width: `${(statusInfo.step / 4) * 100}%` }} />
                    <div className="tracking-steps">
                      {['Confirmado', 'Preparando', 'Enviado', 'Entregue'].map((label, i) => (
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
                      <h4>ITENS DO PEDIDO</h4>
                      {(pedido.itens || []).map((item, i) => (
                        <div key={i} className="pedido-item-row">
                          <div className="pedido-item-info">
                            <span className="pedido-item-nome">{item.nome}</span>
                            <span className="pedido-item-liga">{item.liga}{item.tamanho ? ` — TAM ${item.tamanho}` : ''}</span>
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
                      <span>TOTAL</span>
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
