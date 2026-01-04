# 📚 Documentação - Sistema de Sala por Cabine

Bem-vindo à documentação completa do **Sistema de Sala por Cabine** do RodaRico!

---

## 📖 Índice de Documentos

### **1. [CABIN_ROOM_FLOW.md](./CABIN_ROOM_FLOW.md)**
**Visão Geral do Sistema**

Documento principal que explica como funciona o sistema de salas por cabine, incluindo:
- ✅ Fluxo completo (líder vs participante)
- ✅ Cenários detalhados com timeline
- ✅ Estruturas de dados (Backend + Frontend)
- ✅ Casos de uso práticos
- ✅ Tratamento de erros
- ✅ Cenários de teste

**Leia este primeiro para entender o conceito geral!**

---

### **2. [WEBSOCKET_CABIN_API.md](./WEBSOCKET_CABIN_API.md)**
**Especificação Técnica da API WebSocket**

Documentação técnica completa do endpoint `/ws/cabin`:
- ✅ Formato de todas as mensagens (Request/Response)
- ✅ Actions: `joinCabinRoom`, `createTeamForCabin`, `startGameForCabin`
- ✅ Broadcasts: `playerJoined`, `teamCreated`, `gameStarting`
- ✅ Códigos de erro e tratamento
- ✅ Rate limits e validações
- ✅ Fluxo de reconexão
- ✅ Mock server para testes

**Use este como referência durante a implementação do backend!**

---

### **3. [QR_CODE_SPECIFICATION.md](./QR_CODE_SPECIFICATION.md)**
**Formato e Especificação do QR Code**

Tudo sobre o QR Code das cabines:
- ✅ Estrutura JSON do QR Code
- ✅ Validação no app (TypeScript)
- ✅ Código Arduino/ESP32 para gerar QR
- ✅ Especificações visuais (tamanho, DPI, cores)
- ✅ Layout para impressão
- ✅ Versionamento (v1.0 atual, v1.1 futuro)
- ✅ QR Codes de teste/staging

**Use este para gerar QR Codes e integrar no hardware!**

---

### **4. [QR_CODE_EXAMPLES.md](./QR_CODE_EXAMPLES.md)**
**Exemplos Prontos de QR Codes**

Textos JSON prontos para copiar e gerar QR Codes:
- ✅ Cabines de produção (1-10)
- ✅ Cabines de desenvolvimento/staging
- ✅ Template customizável
- ✅ Scripts Node.js e Python para geração em lote
- ✅ Template HTML para impressão
- ✅ Instruções passo a passo

**Use este para gerar QR Codes rapidamente!**

---

### **5. [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**
**Guia Prático de Implementação**

Roteiro completo para implementar o sistema:
- ✅ Diagramas de sequência detalhados
- ✅ Checklist completo (Backend + Frontend)
- ✅ Estrutura de arquivos recomendada
- ✅ Ordem de desenvolvimento (3 semanas)
- ✅ Estratégia de testes (Unitários, Integração, E2E)
- ✅ Troubleshooting de problemas comuns
- ✅ Métricas de sucesso e monitoramento
- ✅ Definition of Done

**Use este como roadmap durante todo o desenvolvimento!**

---

### **6. [MOCK_QUESTIONS.md](./MOCK_QUESTIONS.md)**
**Sistema de Perguntas Mock**

Documentação completa do sistema de perguntas para testes offline:
- ✅ Lista completa de 8 perguntas mock
- ✅ Sistema de respostas simuladas (70% de acerto)
- ✅ API de ativação/desativação do modo mock
- ✅ Fluxo completo de jogo mock
- ✅ Estatísticas e cálculo de pontos
- ✅ Guia para adicionar novas perguntas

**Use este para testar o jogo sem backend!**

---

### **7. [UNUSED_SCREENS_AUDIT.md](./UNUSED_SCREENS_AUDIT.md)**
**Auditoria de Telas Obsoletas**

Análise completa de telas não utilizadas no fluxo atual:
- ✅ Lista de 7 telas/arquivos obsoletos
- ✅ Explicação do por quê cada uma não é mais usada
- ✅ Plano de ação para remoção segura
- ✅ Script automatizado de limpeza
- ✅ Checklist completo
- ✅ Comparação de fluxos (antigo vs novo)

**Use este para limpar código legado!**

---

### **8. [LEADER_VS_PARTICIPANT_FLOW.md](./LEADER_VS_PARTICIPANT_FLOW.md)**
**Fluxo Líder vs Participante**

Mapeamento completo das diferenças entre os dois papéis:
- ✅ Diagramas visuais lado a lado
- ✅ Tabelas comparativas detalhadas
- ✅ Passo a passo de cada fluxo
- ✅ UI mockups (Lobby líder vs participante)
- ✅ Código relevante explicado
- ✅ Como testar ambos os roles em mock
- ✅ FAQ completo
- ✅ Mapeamento completo de comandos Bluetooth
- ✅ 5 comandos documentados: INICIAR, ACELERAR, EXPLODIR, DESARMAR, REINICIAR
- ✅ Fluxo detalhado de quando cada comando é enviado

**Use este para entender os diferentes papéis no jogo!**

---

### **9. [BLUETOOTH_NOTIFICATIONS_PLAN.md](./BLUETOOTH_NOTIFICATIONS_PLAN.md)**
**Sistema de Notificações Bluetooth Bidirecionais - Plano**

Plano completo para implementar notificações do ESP32 → App:
- ✅ 4 tipos de notificações: BOMBA_RESFRIADA, BOMBA_DESARMADA, BOMBA_EXPLODIDA, TEMPO_ATUALIZADO
- ✅ Arquitetura de listeners e callbacks
- ✅ Sistema bidirecionais (App ⟷ ESP32)
- ✅ Integração com QuizScreen e ResultScreen
- ✅ Modo mock para testes sem hardware
- ✅ Exemplos de código ESP32 (firmware)
- ✅ Plano de implementação em 7 fases (13-15 horas)
- ✅ Diagramas de fluxo de notificações
- ✅ Formato JSON de cada notificação
- ✅ Troubleshooting e considerações técnicas

**Use este para entender o plano original!**

---

### **10. [BLUETOOTH_NOTIFICATIONS_IMPLEMENTATION.md](./BLUETOOTH_NOTIFICATIONS_IMPLEMENTATION.md)** 🆕✅
**Sistema de Notificações Bluetooth Bidirecionais - Implementação Completa**

Documentação da implementação finalizada:
- ✅ **Status: 100% Completo**
- ✅ 4 notificações implementadas e testadas
- ✅ Componente BluetoothToast com animações
- ✅ Timer automático mock (a cada 5 segundos)
- ✅ Auto-resposta a comandos em modo mock
- ✅ Integração completa em QuizScreen e ResultScreen
- ✅ BLE Notify Characteristic monitoring (modo real)
- ✅ +563 linhas de código adicionadas
- ✅ 0 erros de lint
- ✅ Guia de uso e exemplos de código
- ✅ Fluxo completo documentado com diagramas
- ✅ API completa do BluetoothService
- ✅ Pronto para produção (modo mock)

**Use este para entender a implementação final!**

---

## 🚀 Quick Start

### **Para Desenvolvedores Backend:**
1. Leia [`CABIN_ROOM_FLOW.md`](./CABIN_ROOM_FLOW.md) - entenda o conceito
2. Leia [`WEBSOCKET_CABIN_API.md`](./WEBSOCKET_CABIN_API.md) - especificação técnica
3. Siga [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - Fase 1 e 2

### **Para Desenvolvedores Frontend:**
1. Leia [`CABIN_ROOM_FLOW.md`](./CABIN_ROOM_FLOW.md) - entenda o conceito
2. Leia [`QR_CODE_SPECIFICATION.md`](./QR_CODE_SPECIFICATION.md) - formato do QR
3. Use [`QR_CODE_EXAMPLES.md`](./QR_CODE_EXAMPLES.md) - gere QR de teste
4. Siga [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - Fase 3 e 4

### **Para Hardware/ESP32:**
1. Leia [`QR_CODE_SPECIFICATION.md`](./QR_CODE_SPECIFICATION.md) - especificação completa
2. Use exemplos de código Arduino inclusos
3. Use [`QR_CODE_EXAMPLES.md`](./QR_CODE_EXAMPLES.md) - validar formato

### **Para QA/Testes:**
1. Leia [`CABIN_ROOM_FLOW.md`](./CABIN_ROOM_FLOW.md) - casos de uso
2. Use [`QR_CODE_EXAMPLES.md`](./QR_CODE_EXAMPLES.md) - gerar QR de teste
3. Consulte [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - estratégia de testes

---

## 🎯 Resumo Executivo

### **O que é o Sistema de Sala por Cabine?**

Sistema que permite múltiplos jogadores escanearem o QR Code da mesma cabine física e formarem automaticamente um time:

- **Primeiro jogador** = **Líder** (cria o time)
- **Demais jogadores** = **Participantes** (entram automaticamente)

### **Por que precisamos disso?**

**Problema:** Sem este sistema, se 2+ jogadores escanearem o mesmo QR Code, cada um criaria um time diferente para a mesma cabine → **CONFLITO**.

**Solução:** Backend mantém "sala virtual" por cabine via WebSocket. Primeiro vira líder, demais entram automaticamente no time do líder.

### **Componentes Principais:**

```
📱 Frontend (React Native)
├── QRCodeScannerScreen (escaneia QR da cabine)
├── CabinLobbyScreen (conecta WS, determina role)
└── LobbyScreen (refatorado, sem input manual)

🌐 Backend (WebSocket)
├── Endpoint /ws/cabin (nova API)
├── CabinRoomManager (gerencia salas)
└── Broadcasts em tempo real

🔧 Hardware (ESP32)
└── Gera QR Code JSON no display
```

---

## 📊 Status do Projeto

| Fase | Status | Progresso |
|------|--------|-----------|
| 📋 Documentação | ✅ Completa | 100% |
| 📡 Plano Notificações BLE | ✅ Completo | 100% |
| 🔵 **Bluetooth Bidirecionais** | ✅ **Completo** | **100%** |
| 🎨 Componente de Toast | ✅ Completo | 100% |
| 🧪 Modo Mock Notificações | ✅ Completo | 100% |
| 🔧 Backend Setup | ⏳ Não iniciado | 0% |
| 📱 Frontend Cabin Room | ⏳ Parcial | 60% |
| 🚀 Deploy | ⏳ Não iniciado | 0% |

---

## 📝 Changelog

### **v1.5 - 2026-01-04** (Novo) 🆕🎉
- ✅ **✨ IMPLEMENTAÇÃO COMPLETA: Sistema de Notificações Bluetooth Bidirecionais**
- ✅ Componente `BluetoothToast` com animações suaves
- ✅ 4 notificações funcionando: BOMBA_RESFRIADA, BOMBA_DESARMADA, BOMBA_EXPLODIDA, TEMPO_ATUALIZADO
- ✅ Sistema de listeners completo no `BluetoothService`
- ✅ Timer automático mock (a cada 5 segundos)
- ✅ Auto-resposta a comandos em modo mock
- ✅ Integração completa em QuizScreen e ResultScreen
- ✅ BLE Notify Characteristic monitoring (modo real)
- ✅ +563 linhas de código adicionadas
- ✅ 0 erros de lint
- ✅ Documentação completa da implementação
- ✅ **Pronto para produção (modo mock)**

### **v1.4 - 2026-01-04**
- ✅ **Plano completo: Sistema de Notificações Bluetooth Bidirecionais**
- ✅ Arquitetura de listeners (App escuta ESP32)
- ✅ 4 notificações: BOMBA_RESFRIADA, BOMBA_DESARMADA, BOMBA_EXPLODIDA, TEMPO_ATUALIZADO
- ✅ Sistema bidirecionais (App ⟷ ESP32)
- ✅ Modo mock para notificações
- ✅ Exemplos de código ESP32
- ✅ Plano de implementação em 7 fases (13-15h)
- ✅ Diagramas de fluxo completos

### **v1.3 - 2026-01-04**
- ✅ Documentação completa: Líder vs Participante
- ✅ Diagramas visuais dos dois fluxos
- ✅ Comparação detalhada de UIs
- ✅ Guia de testes para ambos os roles
- ✅ Mapeamento completo de comandos Bluetooth
- ✅ 5 comandos documentados: INICIAR, ACELERAR, EXPLODIR, DESARMAR, REINICIAR
- ✅ Fluxo detalhado de quando cada comando é enviado

### **v1.2 - 2026-01-04**
- ✅ Auditoria completa de telas obsoletas
- ✅ Identificadas 7 telas não utilizadas no fluxo atual
- ✅ Script automatizado para limpeza
- ✅ Documentação de fluxos antigo vs novo

### **v1.1 - 2026-01-04**
- ✅ Adicionado sistema de perguntas mock
- ✅ Documentação completa de perguntas mock
- ✅ Modo mock implementado no QuestionService
- ✅ Suporte a testes offline completos

### **v1.0 - 2026-01-04**
- ✅ Documentação inicial completa
- ✅ Especificação WebSocket API
- ✅ Especificação QR Code
- ✅ Guia de implementação
- ✅ Exemplos de QR Code
- ✅ Organização em pasta `docs/`

---

## 🤝 Contribuindo

### **Atualizando Documentação**

Se você encontrar erros ou tiver sugestões:

1. Edite o arquivo correspondente
2. Atualize o changelog neste README
3. Faça commit com mensagem descritiva

### **Adicionando Novos Documentos**

1. Crie o arquivo `.md` nesta pasta
2. Adicione link no índice acima
3. Adicione descrição no changelog

---

## 📞 Suporte

**Dúvidas sobre a documentação?**
- Revise o [`CABIN_ROOM_FLOW.md`](./CABIN_ROOM_FLOW.md) primeiro
- Consulte o [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md) - seção Troubleshooting
- Verifique os exemplos em [`QR_CODE_EXAMPLES.md`](./QR_CODE_EXAMPLES.md)

**Problemas durante implementação?**
- Consulte a seção "Troubleshooting" do [`IMPLEMENTATION_GUIDE.md`](./IMPLEMENTATION_GUIDE.md)
- Verifique logs do backend/frontend
- Teste com QR Code de DEV (cabinId: 999)

---

## 🔗 Links Úteis

- **Gerar QR Code Online:** https://www.qr-code-generator.com/
- **Validar QR Code:** https://zxing.org/w/decode.jsp
- **WebSocket Tester:** https://www.piesocket.com/websocket-tester
- **JSON Validator:** https://jsonlint.com/

---

**Documentação criada por:** Cursor AI + Equipe RodaRico  
**Data de criação:** 2026-01-04  
**Última atualização:** 2026-01-04  
**Versão:** 1.5 🎉  

---

**Bom desenvolvimento! 🚀**

