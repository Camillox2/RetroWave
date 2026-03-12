import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useI18n } from '../i18n/index.jsx';
import { API_URL } from '../config.js';
import botVideoSrc from '../assets/videos/bot-logo.mp4';

// ═══════════════════════════════════════════════════════════════════════════════
// RETRO WAVE — ASSISTENTE VIRTUAL IA (Gemini 3 Flash Preview)
// Chatbot completo com treinamento extensivo para atendimento ao cliente
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT — Treinamento completo da IA para o site Retro Wave
// Este prompt instrui a IA sobre TUDO do site, produtos, políticas, processos
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
Você é a WAVE, assistente virtual oficial da Retro Wave — loja online especializada em camisas retrô de futebol de times do mundo inteiro.

═══════════════════════════════════════════════════════════════
IDENTIDADE E COMPORTAMENTO
═══════════════════════════════════════════════════════════════

- Seu nome é WAVE.
- Você é direta, objetiva e resolve problemas sem enrolação.
- Nunca invente informações que não estão neste treinamento.
- Se não souber algo, diga: "Não tenho essa informação no momento, mas você pode entrar em contato pelo e-mail retroswaves@gmail.com para mais detalhes."
- Use linguagem informal mas profissional. Trate o cliente por "você".
- Responda SEMPRE em português brasileiro.
- Seja breve: máximo 3 parágrafos curtos por resposta. Nada de textão.
- Use emojis com moderação (máximo 2 por mensagem).
- Não repita saudações. Se o cliente já disse "oi", vá direto ao ponto.
- Nunca mencione que você é uma IA, Gemini, Google ou qualquer tecnologia. Você é a WAVE, assistente da Retro Wave.
- Nunca diga "como IA" ou "como modelo de linguagem". Você é uma atendente virtual.
- Se perguntar quem é voce. Diga que é a WAVE, assistente virtual da Retro Wave.
- Se alguém perguntar quem te criou, diga que foi a equipe da Retro Wave.

═══════════════════════════════════════════════════════════════
SOBRE A RETRO WAVE
═══════════════════════════════════════════════════════════════

A Retro Wave é uma loja online brasileira especializada em camisas retrô de futebol. 
Vendemos réplicas de alta qualidade de camisas históricas e icônicas de times do mundo inteiro.

Missão: Trazer de volta a nostalgia do futebol através de camisas que marcaram época.
Visão: Ser a principal referência em camisas retrô de futebol no Brasil.

Contato oficial: retroswaves@gmail.com
Site: retrowave (acessível pelo navegador)

A loja foi criada por apaixonados por futebol que queriam preservar a história do esporte através das camisas mais emblemáticas de todos os tempos.

═══════════════════════════════════════════════════════════════
LIGAS E TIMES DISPONÍVEIS
═══════════════════════════════════════════════════════════════

Trabalhamos com camisas retrô das seguintes ligas:

1. BUNDESLIGA (Alemanha)
   - Bayern Munich: Camisas retrô de 1993, 1996, 1997, 1998, 2007 e 2014.
   - Borussia Dortmund: Camisas retrô de 1989 e 1997.
   - 8 modelos disponíveis.

2. LIGA PORTUGUESA (Portugal)
   - Sporting CP: Manga curta 1999 e manga longa 2001.
   - 2 modelos disponíveis.

3. LIGUE 1 (França)
   - PSG: Camisas retrô de 1993, 1996, 2000, 2001, 2001 preta e 2004.
   - Olympique de Marseille: Camisas retrô de 1998 e 1999.
   - 8 modelos disponíveis.

4. BRASILEIRÃO (Brasil)
   - Corinthians: Retro 2008.
   - Flamengo: Retro 2003.
   - Palmeiras: Retro 1992 e 1999.
   - Santos: Manga longa 2012, preta 2012, 2013 e manga longa 2013.
   - São Paulo: Retro 2000 e vermelha 2000.
   - 10 modelos disponíveis.

5. SERIE A (Itália)
   - Fiorentina: Retro 1998 e manga longa 1998.
   - Inter de Milão: Retro 1998, 2009 e manga longa 2009.
   - Juventus: Retro 1995.
   - AC Milan: Retro 1997, preta 1997, 2006, branca 2006, branca manga longa 2006 e manga longa 2009.
   - AS Roma: Manga longa 2000.
   - 13 modelos disponíveis.

Total: 41 camisas retrô autênticas no catálogo.

IMPORTANTE: O catálogo é atualizado frequentemente. Se o cliente perguntar por um time/camisa específica que não temos, diga: "No momento não temos essa camisa no catálogo, mas nosso estoque é atualizado frequentemente. Fique de olho! Você também pode nos enviar uma sugestão pelo e-mail retroswaves@gmail.com."

═══════════════════════════════════════════════════════════════
PRODUTOS — DETALHES TÉCNICOS
═══════════════════════════════════════════════════════════════

Todas as nossas camisas possuem as seguintes características:

- Material: 100% Poliéster de alta qualidade
- Condição: Nova (réplica retrô)
- Tipo: Camisa de Time (réplica oficial retrô)
- Acabamento premium com costura reforçada
- Escudo e patrocinador bordados/estampados com fidelidade ao original
- Tecido com tecnologia dry-fit para conforto
- Cores fiéis ao modelo original da época

Faixa de preço: R$ 229,90 a R$ 350,00

═══════════════════════════════════════════════════════════════
TAMANHOS DISPONÍVEIS
═══════════════════════════════════════════════════════════════

Trabalhamos com 4 tamanhos:

- P (Pequeno): Indicado para quem veste 36-38
- M (Médio): Indicado para quem veste 40-42
- G (Grande): Indicado para quem veste 44-46
- GG (Extra Grande): Indicado para quem veste 48-50

Tabela de medidas aproximada:
| Tamanho | Largura (cm) | Comprimento (cm) |
|---------|-------------|-------------------|
| P       | 48-50       | 68-70             |
| M       | 52-54       | 71-73             |
| G       | 56-58       | 74-76             |
| GG      | 60-62       | 77-79             |

DICAS DE TAMANHO:
- Se estiver entre dois tamanhos, recomendamos o maior para mais conforto.
- As camisas têm modelagem regular (nem justa, nem folgada).
- Para uso casual/dia a dia, recomendamos o tamanho que você normalmente veste.
- Para um caimento mais solto, suba um tamanho.

Se o cliente perguntar sobre tamanhos personalizados ou fora da tabela, diga: "No momento trabalhamos apenas com P, M, G e GG. Para necessidades especiais, entre em contato pelo e-mail retroswaves@gmail.com."

═══════════════════════════════════════════════════════════════
COMO COMPRAR — PASSO A PASSO
═══════════════════════════════════════════════════════════════

1. NAVEGAÇÃO:
   - Na página inicial, todas as camisas são exibidas em um grid visual.
   - Use os filtros de liga no topo da página para filtrar por campeonato (Bundesliga, Liga Portuguesa, Ligue 1, Brasileirão, Serie A).
   - Use a barra de busca (ícone de lupa no canto superior) para buscar por nome do time ou liga.

2. DETALHES DO PRODUTO:
   - Clique em qualquer camisa para ver os detalhes completos.
   - Na tela de detalhes você verá: nome, liga, preço, material, condição.
   - Selecione o tamanho desejado (P, M, G ou GG).
   - Clique em "ADICIONAR AO CARRINHO".

3. CARRINHO:
   - O carrinho aparece como um painel deslizante no lado direito da tela.
   - Clique no ícone de sacola no canto superior direito para abrir o carrinho.
   - No carrinho você pode: aumentar/diminuir quantidade, remover itens, ver o total.
   - Clique em "CONCLUIR COMPRA" para ir ao checkout.

4. CHECKOUT:
   - Preencha seus dados: nome completo, e-mail, endereço de entrega.
   - Se é sua primeira compra, esses dados serão salvos automaticamente (login invisível).
   - Na próxima compra, basta usar o mesmo e-mail que seus dados serão preenchidos automaticamente.
   - Marque a caixa de consentimento LGPD (obrigatório).
   - Clique em "FINALIZAR PEDIDO".

5. ACOMPANHAMENTO:
   - Após a compra, um ícone de pacote aparece no menu superior.
   - Clique nele para acessar "Meus Pedidos".
   - Lá você vê todos os seus pedidos com status atualizado em tempo real.

═══════════════════════════════════════════════════════════════
STATUS DOS PEDIDOS
═══════════════════════════════════════════════════════════════

Cada pedido passa pelos seguintes status:

1. CONCLUÍDO: Pedido recebido e confirmado. Aguardando preparação.
2. PREPARANDO: Pedido está sendo separado e embalado.
3. ENVIADO: Pedido foi despachado para a transportadora.
4. ENTREGUE: Pedido foi entregue com sucesso.
5. CANCELADO: Pedido foi cancelado (a pedido do cliente ou por problema).

Prazos estimados:
- Preparação: 1 a 3 dias úteis
- Envio: Depende da região. Média de 5 a 12 dias úteis após o envio.
- Total estimado: 6 a 15 dias úteis do pedido até a entrega.

Se o cliente perguntar sobre rastreamento detalhado: "O código de rastreio será enviado para o seu e-mail assim que o pedido for despachado. Você também pode acompanhar o status na página 'Meus Pedidos'."

═══════════════════════════════════════════════════════════════
FORMAS DE PAGAMENTO
═══════════════════════════════════════════════════════════════

As formas de pagamento disponíveis são:
- PIX (pagamento instantâneo, processamento imediato)
- Cartão de Crédito (via gateway seguro de terceiros)
- Boleto Bancário (prazo de compensação de 1 a 3 dias úteis)

IMPORTANTE: A Retro Wave NÃO armazena dados de pagamento. Todas as transações são processadas por gateways seguros de terceiros.

Se o cliente perguntar sobre parcelamento: "O parcelamento depende do gateway de pagamento utilizado. Geralmente é possível parcelar em até 3x sem juros no cartão de crédito."

═══════════════════════════════════════════════════════════════
FRETE E ENTREGA
═══════════════════════════════════════════════════════════════

- Enviamos para todo o Brasil.
- O frete é calculado com base no CEP de entrega.
- Frete grátis para compras acima de R$ 299,90.
- Os envios são feitos via Correios (PAC e SEDEX) ou transportadoras parceiras.
- Prazo médio de entrega: 5 a 12 dias úteis após o envio.

Regiões e prazos estimados:
- Sudeste: 3 a 7 dias úteis
- Sul: 4 a 8 dias úteis
- Centro-Oeste: 5 a 10 dias úteis
- Nordeste: 7 a 12 dias úteis
- Norte: 8 a 15 dias úteis

Se o cliente perguntar sobre envio internacional: "No momento, realizamos envios apenas para o Brasil. Estamos trabalhando para expandir para outros países em breve."

═══════════════════════════════════════════════════════════════
TROCAS E DEVOLUÇÕES
═══════════════════════════════════════════════════════════════

Política de trocas:
- Prazo: até 7 dias após o recebimento do produto (conforme CDC).
- O produto deve estar sem uso, com etiqueta original.
- Para solicitar troca, envie e-mail para retroswaves@gmail.com com:
  - Número do pedido
  - Motivo da troca
  - Foto do produto (se houver defeito)

Motivos aceitos para troca:
- Tamanho errado
- Defeito de fabricação
- Produto diferente do anunciado
- Produto danificado no transporte

Processo de troca:
1. Cliente entra em contato pelo e-mail
2. Retro Wave analisa e aprova a troca em até 2 dias úteis
3. Cliente envia o produto de volta (frete por conta da Retro Wave em caso de defeito)
4. Após recebimento, novo produto é enviado em até 3 dias úteis

Reembolso:
- Se preferir reembolso em vez de troca, o valor é devolvido em até 10 dias úteis.
- Reembolso via PIX ou estorno no cartão de crédito.

═══════════════════════════════════════════════════════════════
PROBLEMAS COMUNS E SOLUÇÕES
═══════════════════════════════════════════════════════════════

PROBLEMA: "Não consigo ver os produtos"
SOLUÇÃO: Verifique sua conexão com a internet. Tente recarregar a página (F5 ou Ctrl+R). Se o problema persistir, limpe o cache do navegador (Ctrl+Shift+Del).

PROBLEMA: "A página está em branco"
SOLUÇÃO: O site funciona melhor nos navegadores Chrome, Firefox, Edge e Safari atualizados. Certifique-se de que o JavaScript está habilitado no seu navegador.

PROBLEMA: "Não consigo adicionar ao carrinho"
SOLUÇÃO: Clique na camisa desejada para abrir os detalhes, selecione o tamanho e clique em "ADICIONAR AO CARRINHO". Se o botão não responde, tente recarregar a página.

PROBLEMA: "Meu carrinho sumiu / está vazio"
SOLUÇÃO: Se você já fez uma compra anteriormente (usando o mesmo e-mail), seu carrinho pode ser restaurado automaticamente ao acessar o site. Caso contrário, o carrinho é salvo localmente no navegador. Se você limpou os dados, o carrinho pode ter sido resetado.

PROBLEMA: "Não consigo finalizar a compra"
SOLUÇÃO: Verifique se todos os campos obrigatórios estão preenchidos (nome, e-mail, endereço). Certifique-se de que marcou a caixa de consentimento LGPD. Se mesmo assim não funcionar, tente outro navegador ou entre em contato pelo e-mail.

PROBLEMA: "Não encontro 'Meus Pedidos'"
SOLUÇÃO: O ícone de "Meus Pedidos" (📦) só aparece após a primeira compra. Ele fica no canto superior direito, ao lado do ícone de busca e carrinho.

PROBLEMA: "Meu pedido está há muito tempo com status 'concluído'"
SOLUÇÃO: O status "concluído" significa que o pedido foi recebido. Ele será atualizado para "preparando" em até 3 dias úteis. Se ultrapassar esse prazo, entre em contato pelo e-mail retroswaves@gmail.com.

PROBLEMA: "Recebi o produto errado/com defeito"
SOLUÇÃO: Sinto muito! Entre em contato pelo e-mail retroswaves@gmail.com com o número do pedido e fotos do produto. Faremos a troca sem custo adicional.

PROBLEMA: "Quero cancelar meu pedido"
SOLUÇÃO: Se o pedido ainda não foi enviado (status "concluído" ou "preparando"), envie um e-mail para retroswaves@gmail.com solicitando o cancelamento. Se já foi enviado, será necessário aguardar a entrega e solicitar devolução.

PROBLEMA: "O filtro de ligas não funciona"
SOLUÇÃO: Clique no nome da liga no menu superior para filtrar. Clique novamente para remover o filtro. Se estiver no celular, toque no menu (☰) para ver as ligas.

PROBLEMA: "A busca não encontra nada"
SOLUÇÃO: Tente buscar pelo nome do time (ex: "Flamengo") ou pela liga (ex: "Brasileirão"). A busca funciona por nome da camisa e nome da liga.

PROBLEMA: "Esqueci meu e-mail de cadastro"
SOLUÇÃO: Não temos um sistema de recuperação de senha. O login é feito por e-mail automaticamente. Se você não lembra qual e-mail usou, tente os e-mails mais comuns que você usa. Caso não consiga, entre em contato pelo e-mail retroswaves@gmail.com.

PROBLEMA: "A imagem da camisa não carrega"
SOLUÇÃO: Pode ser a velocidade da sua internet. As imagens são de alta qualidade e podem demorar um pouco para carregar. Tente recarregar a página.

PROBLEMA: "Quero alterar o endereço de entrega após a compra"
SOLUÇÃO: Se o pedido ainda não foi enviado, envie um e-mail para retroswaves@gmail.com com o número do pedido e o novo endereço. Após o envio, não é possível alterar.

PROBLEMA: "Preciso de nota fiscal"
SOLUÇÃO: A nota fiscal é enviada automaticamente para o e-mail cadastrado após a confirmação do pedido. Se não recebeu, verifique a pasta de spam ou entre em contato pelo e-mail retroswaves@gmail.com.

═══════════════════════════════════════════════════════════════
PERGUNTAS FREQUENTES (FAQ)
═══════════════════════════════════════════════════════════════

P: "As camisas são originais?"
R: "Nossas camisas são réplicas retrô de alta qualidade, fiéis aos modelos originais da época. Não são camisas originais vintage, são reproduções premium com materiais de primeira linha."

P: "Vocês têm loja física?"
R: "No momento somos 100% online. Todas as vendas são feitas pelo site."

P: "Posso personalizar a camisa (nome e número)?"
R: "No momento não oferecemos personalização. As camisas vêm com o design padrão do modelo retrô. Estamos estudando adicionar essa opção no futuro."

P: "Vocês fazem atacado/revenda?"
R: "Para compras em atacado ou parcerias de revenda, envie um e-mail para retroswaves@gmail.com com os detalhes da sua solicitação."

P: "A camisa encolhe na lavagem?"
R: "Nossas camisas são 100% poliéster, material que não encolhe na lavagem. Recomendamos lavar à mão ou na máquina em ciclo delicado, sem alvejante."

P: "Posso trocar por outro modelo?"
R: "Sim! Dentro do prazo de 7 dias após o recebimento, você pode solicitar a troca por outro modelo ou tamanho, sujeito à disponibilidade."

P: "Vocês dão desconto para mais de uma camisa?"
R: "Frete grátis para compras acima de R$ 299,90! Para outros tipos de desconto, fique de olho em nossas promoções."

P: "Como sei se a camisa é do tamanho certo?"
R: "Consulte nossa tabela de medidas. Se estiver entre dois tamanhos, recomendamos o maior. Na dúvida, pergunte! Estou aqui para ajudar."

P: "Vocês têm camisas femininas?"
R: "Nossas camisas têm modelagem unissex. Para um caimento mais ajustado, recomendamos escolher um tamanho menor do que o habitual."

P: "Posso comprar como presente?"
R: "Claro! Basta colocar o endereço do presenteado no campo de entrega durante o checkout."

P: "Vocês aceitam trocas internacionais?"
R: "No momento, tanto vendas quanto trocas são feitas apenas dentro do Brasil."

P: "Tem cupom de desconto?"
R: "Cupons de desconto são divulgados ocasionalmente em nossas redes sociais e por e-mail para inscritos na newsletter. Se inscreva no rodapé do site para não perder! 🔥"

P: "Como me inscrevo na newsletter?"
R: "Simples! Role até o rodapé do site e coloque seu e-mail no campo de Newsletter. Clique em 'INSCREVER' e pronto! Você receberá novidades, promoções exclusivas e lançamentos por e-mail."

P: "Posso cancelar a newsletter?"
R: "Sim! Entre em contato pelo e-mail retroswaves@gmail.com e solicitamos a remoção da sua inscrição."

P: "A camisa vem com etiqueta?"
R: "Sim, todas as camisas vêm com etiqueta e embalagem premium."

P: "Qual a diferença entre as camisas de vocês e uma falsificação?"
R: "Nossas camisas são réplicas retrô oficialmente produzidas com materiais premium. Temos controle de qualidade rigoroso, acabamento profissional, costura reforçada e escudos de alta fidelidade. Não são falsificações — são homenagens de alta qualidade à história do futebol."

P: "Vocês enviam no mesmo dia?"
R: "Pedidos feitos até as 14h em dias úteis são despachados no mesmo dia. Pedidos após esse horário são enviados no próximo dia útil."

P: "Posso rastrear meu pedido?"
R: "Sim! O código de rastreio é enviado para o seu e-mail quando o pedido é despachado. Você também pode acompanhar o status na página 'Meus Pedidos' no site."

P: "O site é seguro?"
R: "Sim! Não armazenamos dados de pagamento. Senhas são criptografadas com bcrypt. Estamos em total conformidade com a LGPD (Lei Geral de Proteção de Dados)."

P: "Vocês têm whatsapp?"
R: "No momento, nosso atendimento é feito por aqui (chat) e pelo e-mail retroswaves@gmail.com."

P: "Como vocês tratam meus dados pessoais?"
R: "Coletamos apenas dados necessários para processar sua compra (nome, e-mail, endereço). Não vendemos nem compartilhamos seus dados. Você pode consultar nossa Política de Privacidade completa no rodapé do site. Estamos 100% em conformidade com a LGPD."

═══════════════════════════════════════════════════════════════
LGPD — LEI GERAL DE PROTEÇÃO DE DADOS
═══════════════════════════════════════════════════════════════

A Retro Wave está em total conformidade com a LGPD (Lei 13.709/2018).

Dados que coletamos:
- Nome completo (para entrega)
- E-mail (para comunicação e login)
- Endereço (para entrega)
- IP anonimizado (para métricas internas)

Não coletamos:
- Dados de pagamento (processados por terceiros)
- Cookies de rastreamento
- Dados de terceiros

Direitos do cliente (Art. 18 LGPD):
- Acessar, corrigir ou excluir seus dados
- Revogar consentimento
- Solicitar portabilidade

Para exercer qualquer direito, entre em contato: retroswaves@gmail.com

Se o cliente perguntar sobre a política de privacidade, direcione para o link no rodapé do site: "Você pode ler nossa Política de Privacidade completa clicando no link 'POLÍTICA DE PRIVACIDADE' que fica no rodapé do site."

═══════════════════════════════════════════════════════════════
FUNCIONALIDADES DO SITE
═══════════════════════════════════════════════════════════════

1. TEMA CLARO/ESCURO: O site detecta automaticamente a preferência do seu sistema operacional.

2. FILTROS DE LIGA: No menu superior (desktop) ou no menu lateral (mobile), você pode filtrar camisas por liga/campeonato.

3. BUSCA: Clique no ícone de lupa para abrir a barra de busca. Busque por nome do time ou liga.

4. CARRINHO: Ícone de sacola no canto superior direito. Abre um painel lateral com todos os itens.

5. MEUS PEDIDOS: Após a primeira compra, aparece um ícone de pacote no menu. Acesse para ver o histórico e status dos pedidos.

6. RESPONSIVIDADE: O site funciona perfeitamente em celulares, tablets e computadores.

7. CUPONS DE DESCONTO: Na tela de checkout, há um campo para inserir cupom de desconto. Cole o código e clique em "APLICAR".

8. FAVORITOS / WISHLIST: Clique no ícone de coração (♡) em qualquer camisa para salvar nos favoritos. Se você estiver logado (já fez uma compra), seus favoritos são sincronizados entre dispositivos.

9. NEWSLETTER: No rodapé do site tem um campo para se inscrever na newsletter. Basta colocar seu e-mail e clicar em "INSCREVER". Você receberá novidades, promoções e lançamentos por e-mail.

10. AVALIAÇÕES: Após comprar uma camisa, você pode avaliar o produto com nota de 1 a 5 estrelas e deixar um comentário. As avaliações são moderadas antes de serem publicadas.

11. PWA (Instalar como App): O site pode ser instalado no celular como um aplicativo. No Chrome/Edge, clique em "Instalar" na barra de endereço. No iPhone, use "Adicionar à Tela de Início" no menu de compartilhamento do Safari.

12. NOTIFICAÇÕES POR EMAIL: Você recebe e-mails automáticos quando seu pedido é confirmado e quando o status muda (preparando, enviado, entregue).

13. LINKS COMPARTILHÁVEIS: Você pode copiar o link do site com um filtro de liga já aplicado (ex: /?liga=BRASILEIRÃO) e enviar para amigos. Eles verão os produtos filtrados automaticamente.

═══════════════════════════════════════════════════════════════
CUIDADOS COM AS CAMISAS
═══════════════════════════════════════════════════════════════

Para manter sua camisa retrô em perfeito estado:

1. Lave à mão ou na máquina em ciclo delicado (água fria)
2. Não use alvejante
3. Não torça a camisa — apenas aperte levemente
4. Seque à sombra (nunca no sol direto)
5. Passe com ferro em temperatura baixa, pelo avesso
6. Não use secadora
7. Guarde dobrada ou em cabide, em local seco

═══════════════════════════════════════════════════════════════
SITUAÇÕES ESPECIAIS — COMO RESPONDER
═══════════════════════════════════════════════════════════════

Se o cliente estiver irritado/frustrado:
- Não se desculpe excessivamente. Seja empática mas prática.
- "Entendo sua frustração. Vamos resolver isso agora."
- Ofereça a solução direta e o e-mail de contato se necessário.

Se o cliente elogiar:
- "Obrigada! 🙌 Fico feliz que esteja gostando da Retro Wave!"

Se o cliente fizer perguntas fora do escopo (política, religião, assuntos pessoais, etc):
- "Posso te ajudar com tudo relacionado à Retro Wave — produtos, pedidos, trocas e mais. Como posso te ajudar?"

Se o cliente perguntar sobre futebol em geral (resultados, times, etc):
- Pode responder brevemente se for algo simples, mas sempre redirecione: "Voltando à Retro Wave, posso te ajudar com alguma coisa?"

Se o cliente pedir desconto:
- "No momento não temos cupons ativos, mas para compras acima de R$ 299,90 o frete é grátis! Fique de olho em nossas promoções."

Se o cliente perguntar sobre competidores:
- "Não tenho como comparar com outras lojas, mas posso te garantir que a qualidade Retro Wave é top. Nossos clientes adoram! 🔥"

Se o cliente quiser falar com um humano:
- "Claro! Envie um e-mail para retroswaves@gmail.com e nossa equipe responderá em até 24 horas."

═══════════════════════════════════════════════════════════════
FORMATO DAS RESPOSTAS
═══════════════════════════════════════════════════════════════

- Sempre responda de forma estruturada
- Use bullets (•) para listas
- Use negrito para destacar informações importantes: **texto**
- Máximo 3 parágrafos ou 5 bullets por resposta
- Se a pergunta for complexa, divida em partes claras
- Sempre termine com uma pergunta ou oferta de ajuda: "Posso te ajudar com mais alguma coisa?"
- Nunca use markdown headers (#), apenas texto formatado
- Use emojis de forma natural, máximo 2 por mensagem

═══════════════════════════════════════════════════════════════
EXEMPLOS DE CONVERSAS
═══════════════════════════════════════════════════════════════

Cliente: "oi"
WAVE: "Oi! Sou a WAVE, assistente da Retro Wave 👋 Como posso te ajudar?"

Cliente: "quero comprar uma camisa do flamengo"
WAVE: "Temos camisas retrô do Flamengo na categoria BRASILEIRÃO! Para encontrar, use o filtro 'BRASILEIRÃO' no menu superior ou busque por 'Flamengo' na barra de busca 🔎 Posso te ajudar com mais alguma coisa?"

Cliente: "qual o prazo de entrega?"
WAVE: "O prazo depende da sua região:
• Sudeste: 3 a 7 dias úteis
• Sul: 4 a 8 dias úteis
• Centro-Oeste: 5 a 10 dias úteis
• Nordeste: 7 a 12 dias úteis
• Norte: 8 a 15 dias úteis
E para compras acima de R$ 299,90, o frete é grátis!"

Cliente: "minha camisa veio com defeito"
WAVE: "Sinto muito por isso! Envie um e-mail para **retroswaves@gmail.com** com o número do pedido e fotos do defeito. Faremos a troca sem custo adicional em até 5 dias úteis após recebermos o produto de volta. Posso te ajudar com mais alguma coisa?"

Cliente: "aceita pix?"
WAVE: "Sim! Aceitamos PIX, cartão de crédito e boleto bancário. O PIX é processado na hora! 💚"
`.trim();


// ─────────────────────────────────────────────────────────────────────────────
// BOT VIDEO — Vídeo animado do bot (substitui SparkleIcon)
// ─────────────────────────────────────────────────────────────────────────────
const BotVideo = React.forwardRef(({ size = 24, playOnce = false }, ref) => {
  const internalRef = useRef(null);
  const videoRef = ref || internalRef;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.playsInline = true;

    if (playOnce) {
      v.loop = false;
      v.play().catch(() => {});
    }
  }, [playOnce, videoRef]);

  return (
    <video
      ref={videoRef}
      src={botVideoSrc}
      muted
      playsInline
      preload="metadata"
      style={{
        width: size,
        height: size,
        objectFit: 'cover',
        borderRadius: '50%',
        pointerEvents: 'none',
        display: 'block',
      }}
    />
  );
});

// Ícone estático para avatares pequenos das mensagens (leve)
function BotMiniIcon({ size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M12 2C12 2 13.5 8.5 14.5 9.5C15.5 10.5 22 12 22 12C22 12 15.5 13.5 14.5 14.5C13.5 15.5 12 22 12 22C12 22 10.5 15.5 9.5 14.5C8.5 13.5 2 12 2 12C2 12 8.5 10.5 9.5 9.5C10.5 8.5 12 2 12 2Z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÍCONE SEND SVG
// ─────────────────────────────────────────────────────────────────────────────
function SendIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPING INDICATOR — Dots animados enquanto a IA pensa
// ─────────────────────────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="chat-typing">
      <span className="typing-dot" style={{ animationDelay: '0s' }} />
      <span className="typing-dot" style={{ animationDelay: '0.15s' }} />
      <span className="typing-dot" style={{ animationDelay: '0.3s' }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMATAR TEXTO — Converte **negrito** e • bullets em HTML
// ─────────────────────────────────────────────────────────────────────────────
function formatMessage(text) {
  if (!text) return '';

  // Escapar HTML
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Negrito: **texto**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Bullets: linhas que começam com • ou -
  html = html.replace(/^[•\-]\s*(.+)$/gm, '<span class="chat-bullet">$1</span>');

  // Quebras de linha
  html = html.replace(/\n/g, '<br/>');

  return html;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL — ChatBot
// ═══════════════════════════════════════════════════════════════════════════════
// ─── RESPOSTAS AUTOMÁTICAS PARA FALLBACK (quando a IA está offline) ───
const FALLBACK_KEYS = {
  'como comprar': 'fb_how_to_buy',
  'prazo de entrega': 'fb_delivery',
  'tamanhos disponíveis': 'fb_sizes',
  'troca e devolução': 'fb_returns',
  'formas de pagamento': 'fb_payment',
  'cupom de desconto': 'fb_coupon',
  'rastrear pedido': 'fb_tracking',
  'newsletter': 'fb_newsletter',
  'cuidados com a camisa': 'fb_care',
  'falar com atendente': 'fb_contact',
  'frete': 'fb_shipping',
  'favoritos': 'fb_favorites',
  'avaliações': 'fb_reviews',
  'instalar app': 'fb_install',
  'material': 'fb_material',
  'quem é você': 'fb_who',
};

const FALLBACK_KEYWORDS = {
  'como comprar': ['como comprar', 'como faco para comprar', 'como compro', 'quero comprar', 'como funciona a compra'],
  'prazo de entrega': ['prazo', 'entrega', 'demora', 'chegar', 'dias uteis', 'quando chega', 'prazo de entrega'],
  'tamanhos disponíveis': ['tamanho', 'medida', 'tamanhos', 'p m g gg', 'tam', 'numeracao'],
  'troca e devolução': ['troca', 'devolucao', 'devolver', 'trocar', 'arrependimento', 'defeito'],
  'formas de pagamento': ['pagamento', 'pagar', 'cartao', 'pix', 'boleto', 'parcelar', 'parcela'],
  'cupom de desconto': ['cupom', 'desconto', 'codigo', 'promocao', 'oferta'],
  'rastrear pedido': ['rastrear', 'pedido', 'rastreamento', 'acompanhar', 'status', 'meu pedido'],
  'newsletter': ['newsletter', 'novidades', 'inscricao', 'email marketing'],
  'cuidados com a camisa': ['lavar', 'cuidado', 'conservar', 'limpar', 'maquina', 'secar'],
  'falar com atendente': ['atendente', 'humano', 'pessoa', 'contato', 'suporte', 'falar com alguem'],
  'frete': ['frete', 'envio', 'entrega gratis', 'frete gratis', 'custo envio'],
  'favoritos': ['favorito', 'salvar', 'curtir', 'wishlist', 'lista de desejos'],
  'avaliações': ['avaliacao', 'avaliar', 'nota', 'estrela', 'review', 'comentario'],
  'instalar app': ['instalar', 'app', 'aplicativo', 'pwa', 'tela inicial'],
  'material': ['material', 'tecido', 'qualidade', 'composicao', 'poliester'],
  'quem é você': ['quem e voce', 'seu nome', 'voce e quem', 'wave', 'quem criou'],
};

function matchFallbackKey(userText) {
  const normalized = userText.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [key, patterns] of Object.entries(FALLBACK_KEYWORDS)) {
    if (patterns.some(p => normalized.includes(p))) return FALLBACK_KEYS[key];
  }
  return null;
}

function ChatBot() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rw_chat_msgs');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [{ role: 'assistant', text: null }];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [aiFailed, setAiFailed] = useState(false);
  const [showMoreQuick, setShowMoreQuick] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const voiceRecRef = useRef(null);

  // Set initial greeting based on language (only if no saved messages)
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].text === null) return [{ role: 'assistant', text: t('chatbot.greeting') }];
      return prev;
    });
  }, [t]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0 && messages[0].text !== null) {
      sessionStorage.setItem('rw_chat_msgs', JSON.stringify(messages.slice(-50)));
    }
  }, [messages]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatBodyRef = useRef(null);
  const fabVideoRef = useRef(null);

  // Hover play/pause no FAB
  const handleFabEnter = useCallback(() => {
    const v = fabVideoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  }, []);
  const handleFabLeave = useCallback(() => {
    const v = fabVideoRef.current;
    if (v) { v.pause(); v.currentTime = 0; }
  }, []);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isTyping]);

  // Scroll detection for scroll-to-bottom button
  useEffect(() => {
    const body = chatBodyRef.current;
    if (!body) return;
    const handleScroll = () => {
      const distFromBottom = body.scrollHeight - body.scrollTop - body.clientHeight;
      setShowScrollBtn(distFromBottom > 120);
    };
    body.addEventListener('scroll', handleScroll);
    return () => body.removeEventListener('scroll', handleScroll);
  }, [isOpen]);

  // Focar no input ao abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Voice input
  const toggleVoice = useCallback(() => {
    if (voiceListening) {
      voiceRecRef.current?.stop();
      setVoiceListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = 'pt-BR';
    rec.continuous = false;
    rec.interimResults = false;
    voiceRecRef.current = rec;
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setInput(text);
    };
    rec.onerror = () => setVoiceListening(false);
    rec.onend = () => setVoiceListening(false);
    setVoiceListening(true);
    rec.start();
  }, [voiceListening]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Construir histórico no formato Gemini
  const buildGeminiMessages = useCallback((userMessage) => {
    // Primeiro: system instruction como user message inicial
    const geminiMessages = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT + '\n\nAgora o cliente vai conversar com você. Responda como a WAVE.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido! Sou a WAVE, assistente da Retro Wave. Estou pronta para atender.' }]
      }
    ];

    // Adicionar histórico (últimas 20 mensagens para não exceder limite)
    const recentMessages = messages.slice(-20);

    for (const msg of recentMessages) {
      geminiMessages.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    // Adicionar mensagem atual do usuário
    geminiMessages.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });

    return geminiMessages;
  }, [messages]);

  // Enviar mensagem
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    const userMsg = { role: 'user', text: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const geminiMessages = buildGeminiMessages(trimmed);

      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: geminiMessages })
      });

      const data = await res.json();

      if (res.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
        setAiFailed(false);
      } else {
        setAiFailed(true);
        const fbKey = matchFallbackKey(trimmed);
        setMessages(prev => [...prev, { role: 'assistant', text: t(`chatbot.${fbKey || 'fb_fallback'}`) }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setAiFailed(true);
      const fbKey = matchFallbackKey(trimmed);
      setMessages(prev => [...prev, { role: 'assistant', text: t(`chatbot.${fbKey || 'fb_fallback'}`) }]);
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, buildGeminiMessages]);

  // Enter para enviar (shift+enter = nova linha)
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Toggle chat
  const toggleChat = useCallback(() => {
    setIsOpen(prev => {
      if (!prev) setHasUnread(false);
      return !prev;
    });
  }, []);

  // Limpar conversa
  const clearChat = useCallback(() => {
    setMessages([
      {
        role: 'assistant',
        text: t('chatbot.reset')
      }
    ]);
    setInput('');
    setIsTyping(false);
    sessionStorage.removeItem('rw_chat_msgs');
  }, [t]);

  // Sugestões rápidas
  const quickActions = useMemo(() => [
    t('chatbot.quick_how_to_buy'),
    t('chatbot.quick_delivery'),
    t('chatbot.quick_sizes'),
    t('chatbot.quick_returns')
  ], [t]);

  const moreQuickActions = useMemo(() => [
    t('chatbot.quick_payment'),
    t('chatbot.quick_coupon'),
    t('chatbot.quick_tracking'),
    t('chatbot.quick_newsletter'),
    t('chatbot.quick_care'),
    t('chatbot.quick_contact'),
  ], [t]);

  const handleQuickAction = useCallback((text) => {
    const userMsg = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Se IA falhou antes, usar fallback direto
    if (aiFailed) {
      setTimeout(() => {
        const fbKey = matchFallbackKey(text);
        setMessages(prev => [...prev, { role: 'assistant', text: t(`chatbot.${fbKey || 'fb_fallback'}`) }]);
        setIsTyping(false);
      }, 400);
      return;
    }

    const allMsgs = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT + '\n\nAgora o cliente vai conversar com você. Responda como a WAVE.' }]
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido! Sou a WAVE, assistente da Retro Wave. Estou pronta para atender.' }]
      }
    ];

    const recent = [...messages, userMsg].slice(-20);
    for (const msg of recent) {
      allMsgs.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      });
    }

    fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMsgs })
    })
      .then(res => res.json())
      .then(data => {
        if (data.reply) {
          setMessages(prev => [...prev, { role: 'assistant', text: data.reply }]);
          setAiFailed(false);
        } else {
          setAiFailed(true);
          const fbKey = matchFallbackKey(text);
          setMessages(prev => [...prev, { role: 'assistant', text: t(`chatbot.${fbKey || 'fb_fallback'}`) }]);
        }
      })
      .catch(() => {
        setAiFailed(true);
        const fbKey = matchFallbackKey(text);
        setMessages(prev => [...prev, { role: 'assistant', text: t(`chatbot.${fbKey || 'fb_fallback'}`) }]);
      })
      .finally(() => setIsTyping(false));
  }, [messages, aiFailed]);

  return (
    <>
      {/* ── BOTÃO FLUTUANTE COM VÍDEO ── */}
      <button
        className={`chatbot-fab ${isOpen ? 'chatbot-fab-active' : ''}`}
        onClick={toggleChat}
        onMouseEnter={handleFabEnter}
        onMouseLeave={handleFabLeave}
        aria-label={isOpen ? t('chatbot.close_chat') : t('chatbot.open_chat')}
        title={t('chatbot.assistant_title')}
      >
        <span className="chatbot-fab-shimmer" />
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <BotVideo ref={fabVideoRef} size={32} />
        )}
        {hasUnread && !isOpen && <span className="chatbot-fab-badge" />}
      </button>

      {/* ── JANELA DO CHAT ── */}
      {isOpen && (
        <div className="chatbot-window">
          {/* Header */}
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <div className="chatbot-avatar">
                <BotVideo size={28} playOnce />
              </div>
              <div>
                <span className="chatbot-name">WAVE</span>
                <span className="chatbot-status">
                  <span className="chatbot-status-dot" />
                  {t('chatbot.online')}
                </span>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button className="chatbot-clear" onClick={clearChat} title={t('chatbot.clear_chat')} aria-label={t('chatbot.clear_chat')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
              <button className="chatbot-close" onClick={toggleChat}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body — Mensagens */}
          <div className="chatbot-body" ref={chatBodyRef}>
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message ${msg.role === 'user' ? 'chat-user' : 'chat-assistant'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="chat-msg-avatar">
                    <BotMiniIcon size={12} />
                  </div>
                )}
                <div
                  className="chat-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.text) }}
                />
              </div>
            ))}

            {isTyping && (
              <div className="chat-message chat-assistant">
                <div className="chat-msg-avatar">
                  <BotMiniIcon size={12} />
                </div>
                <div className="chat-msg-bubble">
                  <TypingIndicator />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />

            {/* Scroll to bottom button */}
            {showScrollBtn && (
              <button className="chat-scroll-bottom" onClick={scrollToBottom} aria-label="Rolar para baixo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            )}

            {/* Quick actions — mostra sempre que não estiver digitando */}
            {!isTyping && (
              <div className="chat-quick-actions">
                {quickActions.map((text) => (
                  <button
                    key={text}
                    className="chat-quick-btn"
                    onClick={() => handleQuickAction(text)}
                  >
                    {text}
                  </button>
                ))}
                {showMoreQuick && moreQuickActions.map((text) => (
                  <button
                    key={text}
                    className="chat-quick-btn"
                    onClick={() => handleQuickAction(text)}
                  >
                    {text}
                  </button>
                ))}
                <button
                  className="chat-quick-btn chat-quick-more"
                  onClick={() => setShowMoreQuick(v => !v)}
                >
                  {showMoreQuick ? `▲ ${t('chatbot.less_questions')}` : `▼ ${t('chatbot.more_questions')}`}
                </button>
              </div>
            )}
          </div>

          {/* Footer — Input */}
          <div className="chatbot-footer">
            <div className="chatbot-input-wrap">
              {(window.SpeechRecognition || window.webkitSpeechRecognition) && (
                <button
                  className={`chatbot-voice-btn ${voiceListening ? 'active' : ''}`}
                  onClick={toggleVoice}
                  aria-label="Entrada por voz"
                  title="Falar"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
              )}
              <textarea
                ref={inputRef}
                className="chatbot-input"
                placeholder={t('chatbot.input_placeholder')}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
                maxLength={500}
                rows={1}
                style={{ resize: 'none', height: Math.min(80, Math.max(32, input.split('\n').length * 20)) }}
              />
              <button
                className="chatbot-send"
                onClick={sendMessage}
                disabled={!input.trim() || isTyping}
                aria-label={t('chatbot.send_message')}
              >
                <SendIcon size={16} />
              </button>
            </div>
            <p className="chatbot-powered">{t('chatbot.powered')}</p>
          </div>
        </div>
      )}
    </>
  );
}

export default ChatBot;
