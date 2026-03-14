import { useState, useEffect } from 'react';
import { ArrowLeft, Play, Lock, Trophy, BrainCircuit, CheckCircle2, XCircle, CalendarClock, PauseCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Badge } from './ui/badge';
import allQuestionsRaw from '../src/data/braindeck-questions.json';

// Type definitions
type QuizState = 'landing' | 'playing' | 'completed';
type DifficultyLevel = 'easy' | 'medium' | 'hard';

interface Question {
  id: string;
  subject: string;
  difficulty: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correct: string;
  explanation: string;
}

const allQuestions = allQuestionsRaw as Question[];
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// The 5 daily sets available
const DAILY_TIERS = [
  { id: 1, title: 'Basic Tier', level: 'easy' as DifficultyLevel, bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { id: 2, title: 'Advanced I', level: 'medium' as DifficultyLevel, bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 3, title: 'Advanced II', level: 'medium' as DifficultyLevel, bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 4, title: 'Advanced III', level: 'medium' as DifficultyLevel, bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { id: 5, title: 'Expert Tier', level: 'hard' as DifficultyLevel, bg: 'bg-red-500/20 text-red-400 border-red-500/30' },
];

export default function BrainDeckManager({ onBack }: { onBack: () => void, doctorName?: string }) {
  const [gameState, setGameState] = useState<QuizState>('landing');
  const [activeTierId, setActiveTierId] = useState<number | null>(null);

  // Local storage state tracking
  const [playedHistory, setPlayedHistory] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('brainDeckHistory');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const [dailyState, setDailyState] = useState<{ date: string; unlockedTier: number; setsPlayedToday: number[] }>(() => {
    const today = new Date().toISOString().split('T')[0];
    try {
      const stored = localStorage.getItem('brainDeckDaily');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) return parsed;
      }
    } catch {}
    return { date: today, unlockedTier: 1, setsPlayedToday: [] };
  });

  // Save history
  useEffect(() => {
    localStorage.setItem('brainDeckHistory', JSON.stringify(playedHistory));
  }, [playedHistory]);

  // Save daily state
  useEffect(() => {
    localStorage.setItem('brainDeckDaily', JSON.stringify(dailyState));
  }, [dailyState]);

  // Quiz active state
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Timer effect
  useEffect(() => {
    if (gameState === 'playing' && !isAnswered && !isPaused && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !isAnswered && !isPaused) {
      handleAnswerTimeOut();
    }
  }, [timeLeft, gameState, isAnswered, isPaused]);

  const handleAnswerTimeOut = () => {
    setIsAnswered(true);
    setSelectedOption('TIMEOUT');
  };

  const getQuestionsForTier = (difficulty: DifficultyLevel) => {
    const now = Date.now();

    // Filter questions by difficulty and cooldown (7 days)
    const available = allQuestions.filter(q => {
      // Map JSON difficulty to our requested difficulty
      // If dataset lacks exact matches, fallback loosely
      const qDiff = (q.difficulty || 'easy').toLowerCase();
      if (qDiff !== difficulty) return false;

      const lastPlayed = playedHistory[q.id];
      if (!lastPlayed) return true;
      return (now - lastPlayed) > SEVEN_DAYS_MS;
    });

    // Shuffle and pick 10
    const shuffled = available.sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 10);

    // Fallback if not enough questions meet 7-day criteria
    if (selected.length < 10) {
      const backup = allQuestions
        .filter(q => (q.difficulty || 'easy').toLowerCase() === difficulty)
        .sort(() => 0.5 - Math.random());
      selected = backup.slice(0, 10);
    }

    // Total fallback if dataset is incredibly sparse
    if (selected.length < 10) {
        selected = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 10);
    }

    return selected;
  };

  const startQuiz = (tierId: number, difficulty: DifficultyLevel) => {
    if (dailyState.setsPlayedToday.includes(tierId)) {
      alert("You have already completed this set today!");
      return;
    }

    const questions = getQuestionsForTier(difficulty);
    setCurrentQuestions(questions);
    setCurrentQuestionIndex(0);
    setScore(0);
    setActiveTierId(tierId);
    setIsAnswered(false);
    setSelectedOption(null);
    setTimeLeft(30);
    setGameState('playing');
  };

  const handleAnswer = (optionKey: string) => {
    if (isAnswered) return;

    setSelectedOption(optionKey);
    setIsAnswered(true);

    const currentQ = currentQuestions[currentQuestionIndex];
    if (optionKey === currentQ.correct) {
      setScore(prev => prev + 1);
    }

    // Mark question as played for cooldown tracking
    setPlayedHistory(prev => ({
      ...prev,
      [currentQ.id]: Date.now()
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedOption(null);
      setTimeLeft(30);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setGameState('completed');

    const percentage = score / currentQuestions.length;

    setDailyState(prev => {
      const newState = { ...prev };

      // Add this set to completed sets for today
      if (!newState.setsPlayedToday.includes(activeTierId!)) {
        newState.setsPlayedToday = [...newState.setsPlayedToday, activeTierId!];
      }

      // Unlock next tier if score >= 90% and it's the current highest tier
      if (percentage >= 0.9 && activeTierId === newState.unlockedTier) {
        if (newState.unlockedTier < 5) {
          newState.unlockedTier += 1;
        }
      }
      return newState;
    });
  };

  const resetToLanding = () => {
    setGameState('landing');
    setActiveTierId(null);
    setIsPaused(false);
  };

  // ---------------------------------------------------------------------------
  // RENDER: Landing
  // ---------------------------------------------------------------------------
  if (gameState === 'landing') {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4 mb-8">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <BrainCircuit className="w-8 h-8 text-orange-500" />
                healQR BrainDeck
              </h1>
              <p className="text-gray-400">Complete all 5 daily sets. Score 90%+ to unlock the next difficulty tier.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {DAILY_TIERS.map(tier => {
              const isUnlocked = dailyState.unlockedTier >= tier.id;
              const isCompleted = dailyState.setsPlayedToday.includes(tier.id);

              return (
                <Card key={tier.id} className="bg-[#1a2332] border-white/10 relative overflow-hidden transition-all hover:border-white/20">
                  {(!isUnlocked && !isCompleted) && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-4 text-center">
                      <Lock className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm font-medium text-gray-300">Score 90%+ in Tier {tier.id - 1} to unlock</p>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center p-4 text-center">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                      <p className="text-sm font-bold text-white">Completed for today</p>
                    </div>
                  )}

                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                       <Badge className={`w-fit ${tier.bg}`}>{tier.description}</Badge>
                       <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-gray-400">
                          {tier.id}
                       </div>
                    </div>

                    <CardTitle className="text-white text-xl">{tier.title}</CardTitle>
                    <CardDescription className="text-gray-400 flex items-center gap-1 mt-1">
                      <CalendarClock className="w-4 h-4" /> 10 Qs • 30s each
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => startQuiz(tier.id, tier.level)}
                      disabled={!isUnlocked || isCompleted}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                    >
                      <Play className="w-4 h-4 mr-2" /> Play Set {tier.id}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Playing
  // ---------------------------------------------------------------------------
  if (gameState === 'playing' && currentQuestions.length > 0) {
    const question = currentQuestions[currentQuestionIndex];
    const currentTier = DAILY_TIERS.find(t => t.id === activeTierId);

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white p-4 md:p-8 flex flex-col">
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <div className="flex items-center gap-4">
               <button
                  onClick={resetToLanding}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                  title="Back to Decks"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
               <button
                  onClick={() => setIsPaused(true)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                  title="Pause Quiz"
                >
                  <PauseCircle className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                  <span className="text-xs text-orange-400 font-bold uppercase tracking-wider">{currentTier?.title}</span>
                  <span className="text-xl font-medium text-gray-300">
                    Question {currentQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                </div>
            </div>

            <div className={`text-2xl font-bold flex items-center gap-2 ${timeLeft <= 5 ? 'text-red-500' : 'text-emerald-400'}`}>
              <div className="w-4 h-4 rounded-full bg-current animate-pulse" />
              00:{timeLeft.toString().padStart(2, '0')}
            </div>
          </div>

          {/* Question */}
          <div className="bg-[#1a2332] rounded-2xl p-6 md:p-8 mb-8 border border-white/5 shadow-xl">
            <div className="mb-4">
              <Badge variant="outline" className="border-white/20 text-gray-400 uppercase tracking-widest text-[10px]">
                {question.subject || 'General Knowledge'}
              </Badge>
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold leading-relaxed">
              {question.question}
            </h2>
          </div>

          {/* Options */}
          <div className="space-y-4 flex-1">
            {['A', 'B', 'C'].map((optKey) => {
              const optionText = (question as any)[`option${optKey}`];
              if (!optionText) return null;

              const isCorrect = optKey === question.correct;
              const isSelected = selectedOption === optKey;

              let btnClass = "w-full text-left p-4 md:p-6 rounded-xl border transition-all text-lg flex items-center justify-between ";

              if (!isAnswered) {
                btnClass += "border-white/10 bg-[#1a2332] hover:bg-white/5 hover:border-white/20";
              } else {
                if (isCorrect) {
                  btnClass += "border-emerald-500 bg-emerald-500/20 text-emerald-100";
                } else if (isSelected && !isCorrect) {
                  btnClass += "border-red-500 bg-red-500/20 text-red-100";
                } else {
                  btnClass += "border-white/5 bg-[#1a2332]/50 text-gray-500 opacity-50";
                }
              }

              return (
                <button
                  key={optKey}
                  disabled={isAnswered}
                  onClick={() => handleAnswer(optKey)}
                  className={btnClass}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-bold text-sm shrink-0">
                      {optKey}
                    </span>
                    <span>{optionText}</span>
                  </div>
                  {isAnswered && isCorrect && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
                  {isAnswered && isSelected && !isCorrect && <XCircle className="w-6 h-6 text-red-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation & Next */}
          {isAnswered && (
            <div className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-xl p-6 animate-in slide-in-from-bottom-4">
              <h3 className="text-blue-400 font-semibold mb-2 text-lg">Detailed Explanation</h3>
              <p className="text-blue-100/80 leading-relaxed mb-6">
                {question.explanation || "No explanation provided for this question."}
              </p>
              <Button
                onClick={nextQuestion}
                className="w-full md:w-auto md:min-w-[200px] bg-blue-600 hover:bg-blue-700 text-white text-lg py-6"
              >
                {currentQuestionIndex < currentQuestions.length - 1 ? 'Next Question' : 'View Final Results'}
              </Button>
            </div>
          )}
        </div>

        {/* Pause Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <Card className="max-w-sm w-full bg-[#1a2332] border-white/10 text-center relative">
              <button
                 onClick={resetToLanding}
                 className="absolute top-4 left-4 p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                 title="Back to Decks"
              >
                 <ArrowLeft className="w-5 h-5" />
              </button>
              <CardHeader>
                <CardTitle className="text-2xl text-white">Quiz Paused</CardTitle>
                <CardDescription className="text-gray-400">Take a deep breath. You can resume when you're ready.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={() => setIsPaused(false)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6"
                >
                  <Play className="w-5 h-5 mr-2" /> Resume Quiz
                </Button>
                  <Button
                  onClick={resetToLanding}
                  variant="outline"
                  className="w-full border-gray-300 text-black hover:text-black hover:bg-gray-100 py-6"
                >
                  Start New Quiz
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // RENDER: Completed
  // ---------------------------------------------------------------------------
  if (gameState === 'completed') {
    const percentage = Math.round((score / currentQuestions.length) * 100);
    const passed = percentage >= 90;
    const isMaxTierCompleted = activeTierId === 5;

    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-[#1a2332] border-white/10 text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500" />
          <CardHeader className="pt-8">
            <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${passed ? 'bg-emerald-500/20 text-emerald-500' : 'bg-orange-500/20 text-orange-500'}`}>
              <Trophy className="w-10 h-10" />
            </div>
            <CardTitle className="text-3xl text-white">Set {activeTierId} Completed</CardTitle>
            <CardDescription className="text-gray-400 text-lg mt-2">
              You scored {score} out of {currentQuestions.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pb-8">
            <div className={`text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r ${passed ? 'from-emerald-400 to-teal-400' : 'from-orange-400 to-red-400'}`}>
              {percentage}%
            </div>

            {passed ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-lg">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-2" />
                <p className="font-bold text-lg text-white mb-1">Excellent work!</p>
                {isMaxTierCompleted ? (
                   <p className="text-sm opacity-90 text-emerald-200">You've completed all sets for today! Come back tomorrow.</p>
                ) : (
                   <p className="text-sm opacity-90 text-emerald-200">You unlocked Set {activeTierId! + 1}! Keep the momentum going.</p>
                )}
              </div>
            ) : (
              <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 p-4 rounded-lg">
                 <XCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="font-bold text-lg text-white mb-1">Better luck tomorrow!</p>
                <p className="text-sm opacity-90 text-orange-200">You need 90% or higher to unlock the next difficulty tier.</p>
              </div>
            )}

            <Button
              onClick={resetToLanding}
              className="w-full bg-white text-black hover:bg-gray-200 font-bold py-6"
            >
              Back to DecKs Directory
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}

