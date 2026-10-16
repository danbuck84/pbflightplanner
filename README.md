# PB Flight Planner

Aplicação web moderna para **Planejamento Operacional de Voo (VFR & IFR — Padrão DECEA)**, cálculo de navegação por trechos, combustível e reservas regulamentares, circuito de tráfego, ponto ideal de descida (TOD), pista em uso, nível de transição e **fraseologia dinâmica**, desenvolvida para simulação aérea.

## Principais Funcionalidades

- **1. Informações do Voo & Meteorologia (METAR / TAF)**:
  - Busca automática de METAR e TAF ao vivo, extraindo direção/velocidade do vento e QNH automaticamente.
  - Edição manual livre para voos com meteorologia customizada no simulador.
  - Base integrada com **2.506 aeródromos brasileiros** (busca por ICAO, nome ou município).
- **2 a 5. Aeronave, Peso e Balanceamento, Regra de Voo e Cartas Aéreas**:
  - Catálogo global de **Aeronaves Base** (gerenciado pelo Admin) + cadastro de **Prefixos Particulares por Piloto** (ex.: `PR-DAN`) salvos na conta do usuário.
  - Cálculo automático de **Peso Bruto de Decolagem (GW)** em função de tripulantes, carga, peso vazio e combustível total com reservas.
  - Checklist de cartas aéreas dinâmico (`WAC, VAC, ADC, PDC, REA/H` para VFR e `ERC, ADC, PDC, SID, STAR` para IFR) com links diretos para a **AISWEB**.
- **6. Planejamento de Rota (Tabela Inteligente)**:
  - Cálculo trigonométrico completo do triângulo de velocidades (Proa Magnética, correção de deriva e Ground Speed / VS).
  - Estimativa de TAS e Número Mach por faixa de altitude ISA.
  - Validação automática da Regra Semicircular (`PAR` / `ÍMPAR`), corredores visuais (`REA/H`) e Altitude de Transição (`TA`).
  - Cálculo de combustível (kg, L, gal, lbs), reservas legais (+30 min VFR Diurno / +45 min VFR Noturno ou IFR + 10% contingência) e divisão por tanque (Asa).
  - Geração com 1 clique da **Rota ATC (`DCT ...`)** e **Item 18 (`OPR/... /PER ... /RMK ...`)** para vPilot / VATSIM / IVAO.
- **7. Circuito de Tráfego, TOD, Pista em Uso, QNH/TL e Arco DME**:
  - Cálculo de altitude do circuito de tráfego (padrão por propulsão ou carta VAC).
  - Cálculo de **Top of Descent (TOD)** em tempo e distância (NM).
  - Determinação automática da **Pista em Uso** a partir do vento magnético e declinação.
  - Cálculo automático do **Nível de Transição (TL)** segundo a tabela oficial do DECEA.
  - Calculadora de antecipação de curva para entrada em **Arco DME**.
- **Fraseologia 100% Dinâmica**:
  - Script completo em 8 etapas (Tráfego, Solo, Torre, Controle e Centro) preenchido automaticamente com os dados reais do planejamento ativo.

## Desenvolvimento Local

```bash
npm install
npm run dev
```

## Build para Produção (Netlify)

```bash
npm run build
```
