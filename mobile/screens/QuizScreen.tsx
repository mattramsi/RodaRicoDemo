import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { bluetoothService } from '../services/BluetoothService';
import { useGame } from '../context/GameContext';
import { wsService } from '../services/WebSocketService';
import type { Question } from '../services/QuestionService';

interface QuizScreenProps {
  onFinish: (result: 'success' | 'fail') => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ onFinish }) => {
  const {
    questions,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    addAnswer,
    answers,
    timeRemaining,
    setTimeRemaining,
    setGameState,
    setGameResult,
    team,
    cabineId,
    partidaId,
    setAllWrong,
    setScore,
  } = useGame();

  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  // Armazenar respostas localmente para garantir sincronização
  const localAnswersRef = useRef<Array<{ perguntaId: number; respostaUsuario: string; isCorrect: boolean }>>([]);
  const answerListenerRef = useRef<(() => void) | null>(null);

  const currentQuestion: Question | undefined = questions[currentQuestionIndex];

  useEffect(() => {
    console.log('[Quiz] Screen montado', {
      questionsLength: questions.length,
      currentQuestionIndex,
      hasCurrentQuestion: !!currentQuestion,
    });

    // Resetar respostas locais quando o screen é montado
    localAnswersRef.current = [];

    // Aguardar perguntas se não estiverem disponíveis ainda
    if (!questions || questions.length === 0) {
      console.log('[Quiz] Aguardando perguntas...');
      return;
    }

    // Start timer apenas quando tiver perguntas
    timerRef.current = setInterval(() => {
      // Use functional update pattern
      setTimeRemaining((prev) => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          handleTimeOut();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (answerListenerRef.current) {
        answerListenerRef.current();
        answerListenerRef.current = null;
      }
    };
  }, [questions.length]);

  const handleTimeOut = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    try {
      await bluetoothService.sendCommand('EXPLODIR');
    } catch (error) {
      console.error('Failed to send EXPLODIR:', error);
    }

    setGameState('finished');
    setGameResult('fail');
    onFinish('fail');
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion || !answer.trim()) {
      Alert.alert('Erro', 'Digite uma resposta');
      return;
    }

    if (!partidaId) {
      Alert.alert('Erro', 'ID da partida não disponível');
      return;
    }

    setLoading(true);

    // Remover listener anterior se existir
    if (answerListenerRef.current) {
      answerListenerRef.current();
      answerListenerRef.current = null;
    }

    try {
      // Capturar valores atuais antes de criar o listener (para evitar problemas de closure)
      const currentPerguntaId = currentQuestion.id;
      const currentAnswerText = answer.trim();
      const currentIndex = currentQuestionIndex;

      // Listener para resposta do WebSocket
      answerListenerRef.current = wsService.onMessage('*', (response) => {
        console.log('[Quiz] Mensagem recebida:', JSON.stringify(response, null, 2));
        
        // Ignorar mensagem de conexão
        if (response.action === 'connected') {
          console.log('[Quiz] Ignorando mensagem de conexão');
          return;
        }

        // Verificar resposta de answerPergunta (servidor retorna singular)
        if ((response.action === 'answerPergunta' || response.action === 'answerPerguntas') && 
            response.success === true && 
            response.data) {
          
          const responseData = response.data;
          const isCorrect = responseData.correct === true;
          const pontos = responseData.pontos || (isCorrect ? currentQuestion.pontos : 0);

          console.log('[Quiz] ✅ Resposta de answerPergunta recebida:', {
            perguntaId: currentPerguntaId,
            resposta: currentAnswerText,
            isCorrect,
            pontos,
            timeId: team?.id,
            timeNome: team?.nome,
            partidaId: partidaId,
          });

          // Limpar listener imediatamente
          if (answerListenerRef.current) {
            answerListenerRef.current();
            answerListenerRef.current = null;
          }

          // Update score (pontos acumulados)
          setScore((prev: number) => prev + (isCorrect ? pontos : 0));

          // Adicionar resposta ao contexto e ao array local
          const answerData = {
            perguntaId: currentPerguntaId,
            respostaUsuario: currentAnswerText,
            isCorrect,
          };
          
          addAnswer(answerData);
          localAnswersRef.current = [...localAnswersRef.current, answerData];

          if (!isCorrect) {
            // Enviar ACELERAR se errou
            try {
              bluetoothService.sendCommand('ACELERAR');
            } catch (error) {
              console.error('Failed to send ACELERAR:', error);
            }
          }

          setLoading(false);

          // Move to next question usando o índice capturado
          if (currentIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentIndex + 1);
            setAnswer('');
          } else {
            // All questions answered - usar array local para garantir sincronização
            const currentAnswers = localAnswersRef.current;
            
            console.log('[Quiz] Todas as respostas (local):', currentAnswers.map(a => ({
              perguntaId: a.perguntaId,
              isCorrect: a.isCorrect
            })));
            
            // Contar respostas corretas e erradas
            const wrongAnswers = currentAnswers.filter((a) => a.isCorrect === false);
            const correctAnswers = currentAnswers.filter((a) => a.isCorrect === true);
            
            console.log('[Quiz] Respostas corretas:', correctAnswers.length);
            console.log('[Quiz] Respostas erradas:', wrongAnswers.length);
            console.log('[Quiz] Total de perguntas:', questions.length);
            console.log('[Quiz] Total de respostas:', currentAnswers.length);
            
            // Verificar se todas as respostas foram erradas
            // Se TODAS as respostas estão erradas → fail
            if (correctAnswers.length === 0 && currentAnswers.length === questions.length) {
              console.log('[Quiz] ❌ Todas as respostas estão erradas → FALHA');
              setAllWrong(true);
              try {
                bluetoothService.sendCommand('EXPLODIR');
              } catch (error) {
                console.error('Failed to send EXPLODIR:', error);
              }
              setGameState('finished');
              setGameResult('fail');
              onFinish('fail');
            } else if (correctAnswers.length > 0) {
              // Se pelo menos uma está correta → success
              console.log('[Quiz] ✅ Pelo menos uma resposta está correta → SUCESSO');
              console.log('[Quiz] Detalhes:', {
                totalRespostas: currentAnswers.length,
                corretas: correctAnswers.length,
                erradas: wrongAnswers.length,
                todasCorretas: correctAnswers.length === questions.length
              });
              setGameState('disarming');
              setGameResult('success'); // IMPORTANTE: Definir resultado como sucesso
              onFinish('success');
            } else {
              // Fallback: se não temos respostas suficientes, considerar como erro
              console.log('[Quiz] ⚠️ Número de respostas não corresponde ao número de perguntas');
              setGameState('finished');
              setGameResult('fail');
              onFinish('fail');
            }
          }
        }
      });

      // Enviar resposta via WebSocket
      const answerMessage = {
        action: 'answerPerguntas' as const,
        data: {
          perguntaId: currentQuestion.id,
          answer: answer.trim(),
          partidaId: partidaId!,
        },
      };
      
      console.log('[Quiz] Enviando resposta via WebSocket:', JSON.stringify(answerMessage, null, 2));
      console.log('[Quiz] Detalhes:', {
        perguntaId: currentQuestion.id,
        pergunta: currentQuestion.pergunta,
        answer: answer.trim(),
        partidaId: partidaId,
        timeId: team?.id,
        timeNome: team?.nome,
      });

      if (!partidaId) {
        Alert.alert('Erro', 'ID da partida não disponível');
        setLoading(false);
        if (answerListenerRef.current) {
          answerListenerRef.current();
          answerListenerRef.current = null;
        }
        return;
      }

      wsService.send(answerMessage);

      // Timeout de segurança (se não receber resposta em 5 segundos)
      setTimeout(() => {
        if (answerListenerRef.current) {
          console.log('[Quiz] Timeout ao receber resposta, tentando continuar...');
          if (answerListenerRef.current) {
            answerListenerRef.current();
            answerListenerRef.current = null;
          }
          setLoading(false);
          Alert.alert('Timeout', 'Não recebemos resposta do servidor. Tente novamente.');
        }
      }, 5000);

    } catch (error) {
      console.error('[Quiz] Erro ao enviar resposta:', error);
      if (answerListenerRef.current) {
        answerListenerRef.current();
        answerListenerRef.current = null;
      }
      Alert.alert('Erro', `Falha ao enviar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Se não há perguntas carregadas ou índice inválido
  if (!questions || questions.length === 0 || !currentQuestion) {
    console.log('[Quiz] Aguardando perguntas...', {
      questionsLength: questions?.length || 0,
      currentQuestionIndex,
      hasCurrentQuestion: !!currentQuestion,
    });
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Carregando perguntas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timer}>{formatTime(timeRemaining)}</Text>
        <Text style={styles.progress}>
          {currentQuestionIndex + 1} / {questions.length}
        </Text>
      </View>

      {/* Informações do time e partida */}
      {(team || partidaId) && (
        <View style={styles.infoSection}>
          {team && (
            <Text style={styles.infoText}>Time: {team.nome}</Text>
          )}
          {partidaId && (
            <Text style={styles.infoText}>Partida ID: {partidaId}</Text>
          )}
        </View>
      )}

      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{currentQuestion.pergunta}</Text>
        <Text style={styles.points}>Pontos: {currentQuestion.pontos}</Text>
      </View>

      <View style={styles.answerSection}>
        <TextInput
          style={styles.answerInput}
          placeholder="Digite sua resposta"
          placeholderTextColor="#9ca3af"
          value={answer}
          onChangeText={setAnswer}
          editable={!loading}
          autoCapitalize="none"
        />

        <Pressable
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmitAnswer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Responder</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1320',
    paddingTop: 64,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  timer: {
    color: '#ef4444',
    fontSize: 32,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  progress: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  questionCard: {
    backgroundColor: '#111827',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  questionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  points: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '500',
  },
  answerSection: {
    flex: 1,
  },
  answerInput: {
    backgroundColor: '#111827',
    color: '#fff',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  loadingText: {
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
    fontSize: 16,
  },
  infoSection: {
    backgroundColor: '#111827',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoText: {
    color: '#9ca3af',
    fontSize: 14,
    fontWeight: '500',
  },
});

