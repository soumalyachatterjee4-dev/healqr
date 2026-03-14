import { useState, useEffect, useRef } from 'react';
import { Brain, Zap, BookOpen, Dumbbell, ChevronRight, ChevronLeft, CheckCircle, XCircle, Trophy, Clock, RefreshCw, AlertCircle, Sparkles, Lock, Save, PlayCircle } from 'lucide-react';
import {
  QuizQuestion,
  BrainDeckAttempt,
  SavedQuizState,
  getDailyAttempts,
  getUnlockedDifficulties,
  unlockNextDifficulty,
  recordAttempt,
  recordSeenQuestions,
  getRecentlySeenIds,
  pickQuestions,
  getHealthTip,
  saveQuizState,
  loadQuizState,
  clearQuizState,
  DAILY_LIMITS,
  PASS_THRESHOLD
} from '../utils/brainDeckService';
import allQuestionsRaw from '../src/data/braindeck-questions.json';

const allQuestions: QuizQuestion[] = allQuestionsRaw as QuizQuestion[];

type Screen = 'selector' | 'quiz' | 'results';
type Difficulty = 'easy' | 'medium' | 'hard';

interface BrainDeckProps {
  doctorId: string;
  onBack: () => void;
}

const DIFF_CONFIG = {
  easy: {
    label: 'Easy Deck',
    icon: BookOpen,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.3)',
    description: 'Foundational · Broad knowledge across 6 subjects',
    unlockMsg: null,
    limit: 2,
  },
  medium: {
    label: 'Medium Deck',
    icon: Zap,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.3)',
    description: 'Intermediate · In-depth concepts & analytical thinking',
    unlockMsg: 'Score 90%+ on Easy Deck to unlock',
    limit: 2,
  },
  hard: {
    label: 'Hard Deck',
    icon: Dumbbell,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.3)',
    description: 'Advanced · Expert-level & research-grade questions',
    unlockMsg: 'Score 90%+ on Medium Deck to unlock',
    limit: 1,
  },
};

export default function BrainDeck({ doctorId, onBack }: BrainDeckProps) {
  const [screen, setScreen] = useState<Screen>('selector');
  const [attempts, setAttempts] = useState<BrainDeckAttempt>({ easy: 0, medium: 0, hard: 0 });
  const [unlockedDiffs, setUnlockedDiffs] = useState<Set<string>>(new Set(['easy']));
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [currentDifficulty, setCurrentDifficulty] = useState<Difficulty>('easy');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<Array<{ selected: 'A' | 'B' | 'C' | null; correct: boolean }>>([]);
  const [elapsed, setElapsed] = useState(0);
  const [healthTip, setHealthTip] = useState<{ title: string; body: string; emoji: string; imageUrl?: string } | null>(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [savedState, setSavedState] = useState<SavedQuizState | null>(null);
  const [justUnlocked, setJustUnlocked] = useState<string | null>(null);
  const [passed, setPassed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadInitialData();
    const saved = loadQuizState(doctorId);
    if (saved) setSavedState(saved);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [doctorId]);

  const loadInitialData = async () => {
    setLoadingAttempts(true);
    const [att, unlocked, tip] = await Promise.all([
      getDailyAttempts(doctorId),
      getUnlockedDifficulties(doctorId),
      getHealthTip()
    ]);
    setAttempts(att);
    setUnlockedDiffs(unlocked);
    setHealthTip(tip ?? { title: 'Stay Hydrated', body: 'Doctors often forget — drink at least 8 glasses of water daily. Your focus and energy depend on it.', emoji: '💧' });
    setLoadingAttempts(false);
  };

  const startTimer = (startFrom = 0) => {
    setElapsed(startFrom);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  };

  const startQuiz = async (difficulty: Difficulty) => {
    if (!unlockedDiffs.has(difficulty)) return;
    if (attempts[difficulty] >= DAILY_LIMITS[difficulty]) return;
    setLoadingQuiz(true);
    setCurrentDifficulty(difficulty);
    const seenIds = await getRecentlySeenIds(doctorId);
    const picked = pickQuestions(allQuestions, difficulty, seenIds, 10);
    setQuestions(picked);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowExplanation(false);
    setAnswers([]);
    startTimer(0);
    setScreen('quiz');
    setLoadingQuiz(false);
  };

  const resumeQuiz = (saved: SavedQuizState) => {
    setCurrentDifficulty(saved.difficulty);
    setQuestions(saved.questions);
    setCurrentIndex(saved.currentIndex);
    setSelectedOption(null);
    setShowExplanation(false);
    setAnswers(saved.answers);
    startTimer(saved.elapsedSeconds);
    setSavedState(null);
    setScreen('quiz');
  };

  const handleSave = () => {
    const state: SavedQuizState = {
      difficulty: currentDifficulty,
      questions,
      currentIndex,
      answers,
      elapsedSeconds: elapsed,
      savedAt: new Date().toISOString(),
    };
    saveQuizState(doctorId, state);
    setSavedState(state);
    if (timerRef.current) clearInterval(timerRef.current);
    setScreen('selector');
  };

  const handleOptionSelect = (opt: 'A' | 'B' | 'C') => {
    if (selectedOption) return;
    setSelectedOption(opt);
    setShowExplanation(true);
  };

  const handleNext = async () => {
    const q = questions[currentIndex];
    const newAnswers = [...answers, { selected: selectedOption, correct: selectedOption === q.correct }];
    setAnswers(newAnswers);

    if (currentIndex + 1 >= questions.length) {
      if (timerRef.current) clearInterval(timerRef.current);
      await finishQuiz(newAnswers);
    } else {
      setCurrentIndex(i => i + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      // Auto-save progress after each answer
      const state: SavedQuizState = {
        difficulty: currentDifficulty,
        questions,
        currentIndex: currentIndex + 1,
        answers: newAnswers,
        elapsedSeconds: elapsed,
        savedAt: new Date().toISOString(),
      };
      saveQuizState(doctorId, state);
    }
  };

  const finishQuiz = async (finalAnswers: typeof answers) => {
    const score = finalAnswers.filter(a => a.correct).length;
    const didPass = score / questions.length >= PASS_THRESHOLD;
    setPassed(didPass);
    await recordAttempt(doctorId, currentDifficulty);
    await recordSeenQuestions(doctorId, questions.map(q => q.id));
    clearQuizState(doctorId);
    setSavedState(null);
    if (didPass) {
      await unlockNextDifficulty(doctorId, currentDifficulty);
      const nextMap: Record<string, string> = { easy: 'Medium', medium: 'Hard' };
      if (nextMap[currentDifficulty]) setJustUnlocked(nextMap[currentDifficulty]);
    }
    setAttempts(prev => ({ ...prev, [currentDifficulty]: prev[currentDifficulty] + 1 }));
    await loadInitialData();
    setScreen('results');
  };

  const formatTime = (secs: number) => `${Math.floor(secs / 60).toString().padStart(2, '0')}:${(secs % 60).toString().padStart(2, '0')}`;

  // ===== SCREEN: SELECTOR =====
  if (screen === 'selector') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)', color: '#f1f5f9', fontFamily: "'Inter', sans-serif", paddingBottom: '40px' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#0f172a 100%)', borderBottom: '1px solid rgba(99,202,255,0.15)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 10px', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={18} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'linear-gradient(135deg,#f97316,#10b981)', borderRadius: '10px', padding: '6px', display: 'flex' }}>
                <Brain size={20} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f1f5f9' }}>
                  <span style={{ color: '#fff' }}>healQR </span>
                  <span style={{ color: '#fef9c3', fontStyle: 'italic' }}>BrainDeck</span>
                </h1>
                <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>10 Questions · Score 90%+ to advance levels</p>
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Health Tip — right under navbar, image banner or text card */}
          {healthTip && (
            healthTip.imageUrl ? (
              <div style={{ marginBottom: '16px', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(99,202,255,0.1)' }}>
                <img
                  src={healthTip.imageUrl}
                  alt={healthTip.title || 'Health Tip'}
                  style={{ width: '100%', display: 'block', height: 'auto' }}
                />
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(139,92,246,0.1))', border: '1px solid rgba(99,202,255,0.15)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <span style={{ fontSize: '26px' }}>{healthTip.emoji}</span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <Sparkles size={11} color="#60a5fa" />
                      <span style={{ fontSize: '10px', color: '#60a5fa', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Health Tip of the Day</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', marginBottom: '3px' }}>{healthTip.title}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>{healthTip.body}</div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Resume Banner */}
          {savedState && (
            <div style={{ background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PlayCircle size={22} color="#818cf8" />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>Saved Quiz Found</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                  {savedState.difficulty.charAt(0).toUpperCase() + savedState.difficulty.slice(1)} Deck · Q{savedState.currentIndex + 1}/10 · {savedState.answers.length} answered
                </div>
              </div>
              <button
                onClick={() => resumeQuiz(savedState)}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: '8px', padding: '8px 14px', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
              >
                Resume
              </button>
            </div>
          )}


          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Choose Your Deck</div>

          {loadingAttempts ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(Object.entries(DIFF_CONFIG) as [Difficulty, typeof DIFF_CONFIG['easy']][]).map(([key, cfg]) => {
                const isUnlocked = unlockedDiffs.has(key);
                const setsUsedToday = attempts[key];
                const remaining = cfg.limit - setsUsedToday;
                const dailyExhausted = remaining <= 0;
                const disabled = !isUnlocked || dailyExhausted || loadingQuiz;
                const Icon = cfg.icon;

                return (
                  <button
                    key={key}
                    onClick={() => !disabled && startQuiz(key)}
                    disabled={disabled}
                    style={{
                      background: disabled ? 'rgba(255,255,255,0.03)' : cfg.bg,
                      border: `1px solid ${disabled ? 'rgba(255,255,255,0.07)' : cfg.border}`,
                      borderRadius: '14px',
                      padding: '16px 18px',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      textAlign: 'left',
                      transition: 'all 0.2s',
                      opacity: disabled ? 0.55 : 1,
                      width: '100%',
                    }}
                  >
                    <div style={{ background: disabled ? 'rgba(255,255,255,0.06)' : cfg.bg, borderRadius: '10px', padding: '8px', border: `1px solid ${disabled ? 'rgba(255,255,255,0.05)' : cfg.border}` }}>
                      {!isUnlocked ? <Lock size={18} color="#64748b" /> : <Icon size={18} color={dailyExhausted ? '#64748b' : cfg.color} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: disabled ? '#64748b' : '#f1f5f9', marginBottom: '2px' }}>{cfg.label}</div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        {!isUnlocked ? (cfg.unlockMsg || '') : cfg.description}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: '64px' }}>
                      {!isUnlocked ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <Lock size={14} color="#475569" />
                          <span style={{ fontSize: '9px', color: '#475569', marginTop: '2px' }}>LOCKED</span>
                        </div>
                      ) : dailyExhausted ? (
                        <div style={{ fontSize: '10px', color: '#475569', fontWeight: 600 }}>DONE TODAY</div>
                      ) : (
                        <>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: cfg.color }}>{remaining}</div>
                          <div style={{ fontSize: '10px', color: '#475569' }}>set{remaining > 1 ? 's' : ''} left</div>
                        </>
                      )}
                    </div>
                    {isUnlocked && !dailyExhausted && <ChevronRight size={15} color={cfg.color} />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Disclaimer + Footer */}
          <div style={{ marginTop: '24px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#475569', textAlign: 'center' }}>
              BrainDeck is for cognitive engagement and general knowledge enhancement only. Not medical advisory.
            </p>
            <p style={{ margin: 0, fontSize: '11px', color: '#334155', textAlign: 'center' }}>
              Powered by{' '}
              <a href="https://www.healqr.com" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>www.healqr.com</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ===== SCREEN: QUIZ =====
  if (screen === 'quiz') {
    const q = questions[currentIndex];
    const cfg = DIFF_CONFIG[currentDifficulty];
    const options: Array<{ key: 'A' | 'B' | 'C'; label: string }> = [
      { key: 'A', label: q.optionA },
      { key: 'B', label: q.optionB },
      { key: 'C', label: q.optionC },
    ];
    const progressPct = (currentIndex / questions.length) * 100;

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)', color: '#f1f5f9', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' }}>

        {/* Quiz Header */}
        <div style={{ background: 'rgba(10,15,30,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <button onClick={handleSave} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', borderRadius: '8px', padding: '6px 12px', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: 600 }}>
              <Save size={13} /> Save
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '4px 10px' }}>
              <Clock size={12} />
              {formatTime(elapsed)}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '999px', height: '5px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}99)`, width: `${progressPct}%`, transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ fontSize: '11px', color: '#475569' }}>Question {currentIndex + 1} of {questions.length}</span>
            <span style={{ fontSize: '11px', color: '#475569', textTransform: 'capitalize' }}>{q.subject}</span>
          </div>
        </div>

        <div style={{ flex: 1, padding: '22px 20px', maxWidth: '480px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {/* Question */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', color: cfg.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Q{currentIndex + 1}</div>
            <p style={{ fontSize: '15px', lineHeight: 1.65, color: '#e2e8f0', margin: 0, fontWeight: 500 }}>{q.question}</p>
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '16px' }}>
            {options.map(({ key, label }) => {
              const isSelected = selectedOption === key;
              const isCorrect = key === q.correct;
              let bg = 'rgba(255,255,255,0.04)';
              let border = 'rgba(255,255,255,0.09)';
              let textColor = '#cbd5e1';
              if (selectedOption) {
                if (isCorrect) { bg = 'rgba(16,185,129,0.15)'; border = 'rgba(16,185,129,0.5)'; textColor = '#10b981'; }
                else if (isSelected) { bg = 'rgba(239,68,68,0.15)'; border = 'rgba(239,68,68,0.5)'; textColor = '#ef4444'; }
              }
              return (
                <button
                  key={key}
                  onClick={() => handleOptionSelect(key)}
                  disabled={!!selectedOption}
                  style={{ background: bg, border: `1px solid ${border}`, borderRadius: '12px', padding: '13px 15px', cursor: selectedOption ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', transition: 'all 0.2s', width: '100%' }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: selectedOption ? (isCorrect ? 'rgba(16,185,129,0.2)' : isSelected ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)') : 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: textColor, flexShrink: 0 }}>
                    {selectedOption ? (isCorrect ? <CheckCircle size={14} /> : isSelected ? <XCircle size={14} /> : key) : key}
                  </div>
                  <span style={{ fontSize: '14px', color: textColor, lineHeight: 1.4, fontWeight: isCorrect && selectedOption ? 600 : 400 }}>{label}</span>
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && (
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '13px 15px', marginBottom: '14px' }}>
              <div style={{ fontSize: '10px', color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <AlertCircle size={11} /> Explanation
              </div>
              <p style={{ fontSize: '13px', color: '#c7d2fe', lineHeight: 1.6, margin: 0 }}>{q.explanation}</p>
            </div>
          )}

          {/* Next button */}
          {selectedOption && (
            <button
              onClick={handleNext}
              style={{ width: '100%', background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, border: 'none', borderRadius: '12px', padding: '14px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {currentIndex + 1 >= questions.length ? '🏁 See Results' : 'Next Question'}
              {currentIndex + 1 < questions.length && <ChevronRight size={17} />}
            </button>
          )}

          {/* Ad banner — always visible at the bottom of the quiz */}
          {healthTip?.imageUrl && (
            <div style={{ marginTop: '18px', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(99,202,255,0.08)' }}>
              <img src={healthTip.imageUrl} alt="" style={{ width: '100%', display: 'block', height: 'auto' }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== SCREEN: RESULTS =====
  const score = answers.filter(a => a.correct).length;
  const accuracy = Math.round((score / questions.length) * 100);
  const cfg = DIFF_CONFIG[currentDifficulty];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #0a0f1e 0%, #0f172a 100%)', color: '#f1f5f9', fontFamily: "'Inter', sans-serif", paddingBottom: '40px' }}>
      <div style={{ background: 'rgba(10,15,30,0.98)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={() => { setScreen('selector'); setJustUnlocked(null); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <ChevronLeft size={16} /> Deck Selector
        </button>
      </div>

      <div style={{ padding: '22px 20px', maxWidth: '480px', margin: '0 auto' }}>

        {/* Unlock Banner */}
        {justUnlocked && (
          <div style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.2),rgba(245,158,11,0.2))', border: '1px solid rgba(16,185,129,0.4)', borderRadius: '14px', padding: '14px 16px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px', marginBottom: '4px' }}>🎉</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>{justUnlocked} Deck Unlocked!</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '3px' }}>Excellent performance! The {justUnlocked} deck is now available.</div>
          </div>
        )}

        {/* Score Card */}
        <div style={{ background: passed ? 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))' : 'linear-gradient(135deg,rgba(239,68,68,0.1),rgba(255,255,255,0.03))', border: `1px solid ${passed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '20px', padding: '26px', textAlign: 'center', marginBottom: '16px' }}>
          <Trophy size={34} color={passed ? '#10b981' : '#f59e0b'} style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '52px', fontWeight: 800, color: passed ? '#10b981' : '#f59e0b', lineHeight: 1 }}>
            {score}<span style={{ fontSize: '22px', color: '#64748b' }}>/{questions.length}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '4px' }}>
            {passed
              ? <span>&#x2705; Outstanding! You have passed this deck.</span>
              : <span>Need 9/10 (90%) to advance &mdash; you scored {score}/10</span>}
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '18px', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 18px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{accuracy}%</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Accuracy</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '10px 18px' }}>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>{formatTime(elapsed)}</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Time Taken</div>
            </div>
          </div>
        </div>

        {/* Threshold note if failed */}
        {!passed && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '1px' }} />
            <p style={{ margin: 0, fontSize: '12px', color: '#fcd34d', lineHeight: 1.5 }}>
              Score <strong>9 or more out of 10</strong> on this deck to unlock the next level. Keep practising — you're getting there!
            </p>
          </div>
        )}

        {/* Question Review */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Question Review</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {questions.map((q, idx) => {
              const ans = answers[idx];
              const isCorrect = ans?.correct;
              return (
                <div key={q.id} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: '12px', padding: '13px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    {isCorrect ? <CheckCircle size={15} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} /> : <XCircle size={15} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '13px', color: '#cbd5e1', margin: '0 0 5px', fontWeight: 500, lineHeight: 1.4 }}>{q.question}</p>
                      {!isCorrect && (
                        <div style={{ fontSize: '12px', color: '#10b981', marginBottom: '3px' }}>✓ {q[`option${q.correct}` as 'optionA' | 'optionB' | 'optionC']}</div>
                      )}
                      <div style={{ fontSize: '11px', color: '#64748b', lineHeight: 1.4 }}>{q.explanation}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => { setScreen('selector'); setJustUnlocked(null); }}
            style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '13px', color: '#94a3b8', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
          >
            <ChevronLeft size={15} /> Decks
          </button>
          {attempts[currentDifficulty] < DAILY_LIMITS[currentDifficulty] && (
            <button
              onClick={() => { setJustUnlocked(null); startQuiz(currentDifficulty); }}
              style={{ flex: 1, background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)`, border: 'none', borderRadius: '12px', padding: '13px', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px' }}
            >
              <RefreshCw size={14} /> Try Again
            </button>
          )}
        </div>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: '#334155', margin: '0 0 4px' }}>BrainDeck is for cognitive engagement only · Not medical advisory</p>
          <p style={{ fontSize: '11px', margin: 0 }}>
            Powered by{' '}
            <a href="https://www.healqr.com" target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>www.healqr.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

