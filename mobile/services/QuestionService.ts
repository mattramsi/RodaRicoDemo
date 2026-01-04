import { AuthService } from './AuthService';

export interface Question {
  id: number;
  pergunta: string;
  pontos: number;
}

export interface AnswerResponse {
  correct: boolean;
  pontos: number;
}

const API_BASE_URL = 'https://rodarico.app.br/api';

// Perguntas Mock para testes
const MOCK_QUESTIONS: Question[] = [
  {
    id: 1,
    pergunta: "Qual é a cor do fio que deve ser cortado primeiro em um circuito padrão?",
    pontos: 100,
  },
  {
    id: 2,
    pergunta: "Quantos segundos restam no temporizador quando o LED verde acende?",
    pontos: 150,
  },
  {
    id: 3,
    pergunta: "Qual é o código de 4 dígitos exibido no display da bomba?",
    pontos: 200,
  },
  {
    id: 4,
    pergunta: "Em qual sequência os LEDs piscam: vermelho, azul ou verde primeiro?",
    pontos: 100,
  },
  {
    id: 5,
    pergunta: "Quantos fios existem conectados ao módulo principal?",
    pontos: 150,
  },
  {
    id: 6,
    pergunta: "Qual é o símbolo impresso na carcaça da bomba?",
    pontos: 100,
  },
  {
    id: 7,
    pergunta: "Qual botão deve ser pressionado: A, B ou C?",
    pontos: 200,
  },
  {
    id: 8,
    pergunta: "Qual é a frequência em Hz mostrada no medidor?",
    pontos: 150,
  },
];

export class QuestionService {
  private static isMockMode: boolean = false;

  static enableMockMode() {
    console.log('[QuestionService] Modo mock ATIVADO');
    this.isMockMode = true;
  }

  static disableMockMode() {
    console.log('[QuestionService] Modo mock DESATIVADO');
    this.isMockMode = false;
  }

  static async getRandomQuestions(count: number = 5): Promise<Question[]> {
    // MODO MOCK: Retornar perguntas mock
    if (this.isMockMode) {
      console.log('[QuestionService] Modo Mock - Retornando perguntas mock');
      
      // Embaralhar perguntas
      const shuffled = [...MOCK_QUESTIONS].sort(() => Math.random() - 0.5);
      
      // Retornar quantidade solicitada
      const selected = shuffled.slice(0, Math.min(count, shuffled.length));
      
      console.log(`[QuestionService] Mock: ${selected.length} perguntas selecionadas`);
      return selected;
    }

    // MODO REAL: Buscar da API
    const token = await AuthService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    // Remover "Bearer " se presente
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    const response = await fetch(`${API_BASE_URL}/perguntas/random/${count}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await AuthService.refreshToken();
        if (refreshed) {
          return this.getRandomQuestions(count);
        }
      }
      throw new Error(`Failed to fetch questions: ${response.statusText}`);
    }

    const questions: Question[] = await response.json();
    return questions;
  }

  static async answerQuestion(
    perguntaId: number,
    pergunta: string,
    resposta: string,
    pontos: number
  ): Promise<AnswerResponse> {
    // MODO MOCK: Simular resposta
    if (this.isMockMode) {
      console.log('[QuestionService] Modo Mock - Simulando resposta');
      
      // Simular delay de rede
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 70% de chance de estar correto
      const isCorrect = Math.random() > 0.3;
      
      const mockResponse: AnswerResponse = {
        correct: isCorrect,
        pontos: isCorrect ? pontos : 0,
      };
      
      console.log('[QuestionService] Mock: Resposta simulada:', mockResponse);
      return mockResponse;
    }

    // MODO REAL: Enviar para API
    const token = await AuthService.getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    // Remover "Bearer " se presente
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    const requestBody = {
      pergunta,
      resposta,
      pontos,
    };

    console.log('[QuestionService] Enviando resposta HTTP POST:', {
      url: `${API_BASE_URL}/perguntas/answer/${perguntaId}`,
      body: requestBody,
    });

    const response = await fetch(`${API_BASE_URL}/perguntas/answer/${perguntaId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        const refreshed = await AuthService.refreshToken();
        if (refreshed) {
          return this.answerQuestion(perguntaId, pergunta, resposta, pontos);
        }
      }
      const errorText = await response.text();
      console.error('[QuestionService] Erro ao responder:', errorText);
      throw new Error(`Failed to answer question: ${response.statusText} - ${errorText}`);
    }

    const result: AnswerResponse = await response.json();
    console.log('[QuestionService] Resposta HTTP recebida:', result);
    return result;
  }
}

