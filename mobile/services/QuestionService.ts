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

export class QuestionService {
  static async getRandomQuestions(count: number = 5): Promise<Question[]> {
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

