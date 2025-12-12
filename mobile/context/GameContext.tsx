import React, { createContext, useContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

export type GameState =
  | 'idle'
  | 'connectingBT'
  | 'ready'
  | 'arming'
  | 'armed'
  | 'answering'
  | 'disarming'
  | 'finished';

export type GameResult = 'success' | 'fail' | null;

export interface Team {
  id: number;
  nome: string;
}

export interface Player {
  id: number;
  nickname: string;
}

export interface Question {
  id: number;
  pergunta: string;
  pontos: number;
}

export interface GameAnswer {
  perguntaId: number;
  respostaUsuario: string;
  isCorrect: boolean;
}

interface GameContextType {
  gameState: GameState;
  gameResult: GameResult;
  team: Team | null;
  players: Player[];
  partidaId: number | null;
  cabineId: number | null;
  questions: Question[];
  currentQuestionIndex: number;
  answers: GameAnswer[];
  score: number;
  timeRemaining: number; // in seconds
  allWrong: boolean;

  setGameState: (state: GameState) => void;
  setGameResult: (result: GameResult) => void;
  setTeam: (team: Team | null) => void;
  setPlayers: (players: Player[]) => void;
  setPartidaId: (id: number | null) => void;
  setCabineId: (id: number | null) => void;
  setQuestions: (questions: Question[]) => void;
  setCurrentQuestionIndex: (index: number) => void;
  addAnswer: (answer: GameAnswer) => void;
  setScore: Dispatch<SetStateAction<number>>;
  setTimeRemaining: Dispatch<SetStateAction<number>>;
  setAllWrong: (allWrong: boolean) => void;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState>('idle');
  const [gameResult, setGameResult] = useState<GameResult>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [partidaId, setPartidaId] = useState<number | null>(null);
  const [cabineId, setCabineId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<GameAnswer[]>([]);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes
  const [allWrong, setAllWrong] = useState(false);

  const addAnswer = (answer: GameAnswer) => {
    setAnswers((prev) => [...prev, answer]);
  };

  const resetGame = () => {
    setGameState('idle');
    setGameResult(null);
    setPartidaId(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers([]);
    setScore(0);
    setTimeRemaining(600);
    setAllWrong(false);
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        gameResult,
        team,
        players,
        partidaId,
        cabineId,
        questions,
        currentQuestionIndex,
        answers,
        score,
        timeRemaining,
        allWrong,
        setGameState,
        setGameResult,
        setTeam,
        setPlayers,
        setPartidaId,
        setCabineId,
        setQuestions,
        setCurrentQuestionIndex,
        addAnswer,
        setScore,
        setTimeRemaining,
        setAllWrong,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

