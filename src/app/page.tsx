"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import {
  getRandomizedQuestions,
  isCorrectAnswer,
  questionBank,
  type Question,
} from "@/data/questions";
import { createAudioEngine, type AudioEngine } from "@/lib/audio";

type GameMode = "casual" | "serious";
type QuestionType = "multiple-choice" | "identification";
type Screen = "home" | "setup" | "playing" | "results";

type AnswerResult = {
  question: Question;
  submittedAnswer: string;
  correct: boolean;
  timedOut: boolean;
};

const sessionSizes = [10, 15, 20] as const;
const timerDurations = [15, 30, 45, 60] as const;

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M8 16h16M16 8v16M10.5 10.5l11 11m0-11-11 11" />
        <circle cx="16" cy="16" r="3.2" />
        <circle cx="8" cy="16" r="2" />
        <circle cx="24" cy="16" r="2" />
        <circle cx="16" cy="8" r="2" />
        <circle cx="16" cy="24" r="2" />
      </svg>
    </span>
  );
}

function AudioIcon({ enabled }: { enabled: boolean }) {
  return enabled ? (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7m3-10a9 9 0 0 1 0 13" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="m16 9 5 6m0-6-5 6" />
    </svg>
  );
}

function ModeIcon({ mode }: { mode: GameMode }) {
  return mode === "casual" ? (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none">
      <path d="M24 7v5m0 24v5M7 24h5m24 0h5M12 12l4 4m16 16 4 4m0-24-4 4m-16 16-4 4" />
      <circle cx="24" cy="24" r="12" />
      <path d="M19.5 25.5s1.5 2 4.5 2 4.5-2 4.5-2m-8-5h.02m7.98 0h.02" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="none">
      <path d="M12 9h24a3 3 0 0 1 3 3v24a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" />
      <path d="M17 17h14m-14 7h3m5 0h3m-11 7h3m5 0h3" />
      <path d="m18 36 4 4 8-8" />
    </svg>
  );
}

function AppHeader({
  audioEnabled,
  audioMessage,
  onAudioToggle,
  onHome,
}: {
  audioEnabled: boolean;
  audioMessage: string;
  onAudioToggle: () => void;
  onHome: () => void;
}) {
  return (
    <header className="app-header">
      <button className="brand-button" onClick={onHome} aria-label="Packet Prep home">
        <BrandMark />
        <span>
          <strong>packet prep</strong>
          <small>NETWORKING FINALS</small>
        </span>
      </button>
      <div className="header-right">
        <span className="header-note">
          <span className="status-dot" /> YOUR FINAL, BUT PLAYABLE
        </span>
        <button
          className={`audio-toggle${audioEnabled ? " is-enabled" : ""}`}
          onClick={onAudioToggle}
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? "Turn music and sound effects off" : "Turn music and sound effects on"}
          title={audioEnabled ? "Sound on" : "Sound off"}
        >
          <AudioIcon enabled={audioEnabled} />
          <span>{audioEnabled ? "Sound on" : "Sound off"}</span>
        </button>
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {audioMessage}
      </span>
    </header>
  );
}

function NetworkArtwork() {
  return (
    <div className="network-art" aria-hidden="true">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="art-orbit orbit-three" />
      <svg className="art-lines" viewBox="0 0 420 340" fill="none">
        <path d="m75 102 93 43 90-64 91 78-64 98-117-13-93 54" />
        <path d="m168 145 0 99m90-163v182m91-104-154 21m64 97 27-222" />
      </svg>
      <span className="art-node node-a"><i /></span>
      <span className="art-node node-b"><i /></span>
      <span className="art-node node-c"><i /></span>
      <span className="art-node node-d"><i /></span>
      <span className="art-node node-e"><i /></span>
      <span className="art-node node-f"><i /></span>
      <span className="art-center">
        <BrandMark />
      </span>
      <span className="art-chip chip-one">TCP / UDP</span>
      <span className="art-chip chip-two">ROUTER_01</span>
      <span className="art-chip chip-three">0101 1010</span>
    </div>
  );
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<GameMode | null>(null);
  const [questionType, setQuestionType] = useState<QuestionType>("multiple-choice");
  const [roundSize, setRoundSize] = useState<(typeof sessionSizes)[number]>(10);
  const [timed, setTimed] = useState(false);
  const [secondsPerQuestion, setSecondsPerQuestion] =
    useState<(typeof timerDurations)[number]>(30);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [sessionResults, setSessionResults] = useState<AnswerResult[]>([]);
  const [feedback, setFeedback] = useState<AnswerResult | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const audioEngine = useRef<AudioEngine | null>(null);
  const submittedRef = useRef(false);

  const currentQuestion = sessionQuestions[questionIndex];

  useEffect(() => {
    return () => audioEngine.current?.dispose();
  }, []);

  useEffect(() => {
    if (screen !== "playing" || mode !== "serious" || !timed || submitted || timeLeft <= 0) {
      return;
    }

    const timerId = window.setTimeout(
      () => setTimeLeft((remaining) => Math.max(remaining - 1, 0)),
      1000,
    );
    return () => window.clearTimeout(timerId);
  }, [mode, screen, submitted, timed, timeLeft]);

  const submitAnswer = useCallback(
    (answer: string, timedOut = false) => {
      if (!currentQuestion || submittedRef.current) return;

      submittedRef.current = true;
      const trimmedAnswer = answer.trim();
      const result: AnswerResult = {
        question: currentQuestion,
        submittedAnswer: timedOut && !trimmedAnswer ? "Time ran out" : trimmedAnswer || "No answer",
        correct: !timedOut && isCorrectAnswer(currentQuestion, trimmedAnswer),
        timedOut,
      };

      setSessionResults((previous) => [...previous, result]);
      setFeedback(result);
      setSubmitted(true);
      audioEngine.current?.playResult(result.correct);
    },
    [currentQuestion],
  );

  useEffect(() => {
    if (
      screen === "playing" &&
      mode === "serious" &&
      timed &&
      timeLeft === 0 &&
      !submitted &&
      currentQuestion
    ) {
      const timeoutId = window.setTimeout(() => submitAnswer(draftAnswer, true), 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [currentQuestion, draftAnswer, mode, screen, submitAnswer, submitted, timed, timeLeft]);

  async function toggleAudio() {
    const nextEnabled = !audioEnabled;
    try {
      if (!audioEngine.current) audioEngine.current = createAudioEngine();
      await audioEngine.current.setEnabled(nextEnabled);
      setAudioEnabled(nextEnabled);
      setAudioMessage("");
    } catch {
      setAudioEnabled(false);
      setAudioMessage("Audio could not be started in this browser. You can continue without sound.");
    }
  }

  function chooseMode(nextMode: GameMode) {
    setMode(nextMode);
    setScreen("setup");
  }

  function startSession() {
    if (!mode) return;
    setSessionQuestions(getRandomizedQuestions(roundSize));
    setQuestionIndex(0);
    setDraftAnswer("");
    setSessionResults([]);
    setFeedback(null);
    submittedRef.current = false;
    setSubmitted(false);
    setTimeLeft(mode === "serious" && timed ? secondsPerQuestion : 0);
    setScreen("playing");
  }

  function advanceQuestion() {
    if (questionIndex >= sessionQuestions.length - 1) {
      setScreen("results");
      return;
    }

    setQuestionIndex((index) => index + 1);
    setDraftAnswer("");
    setFeedback(null);
    submittedRef.current = false;
    setSubmitted(false);
    setTimeLeft(mode === "serious" && timed ? secondsPerQuestion : 0);
  }

  function returnHome() {
    setScreen("home");
    setFeedback(null);
  }

  const score = sessionResults.filter((result) => result.correct).length;
  const scorePercent = sessionResults.length
    ? Math.round((score / sessionResults.length) * 100)
    : 0;
  const timerLabel = `${Math.floor(timeLeft / 60)}:${String(timeLeft % 60).padStart(2, "0")}`;

  return (
    <div className="site-shell">
      <AppHeader
        audioEnabled={audioEnabled}
        audioMessage={audioMessage}
        onAudioToggle={toggleAudio}
        onHome={returnHome}
      />

      <main>
        {screen === "home" && (
          <div className="home-screen">
            <section className="hero-section">
              <div className="hero-copy">
                <span className="eyebrow"><span /> FINAL EXAM PRACTICE, REWIRED</span>
                <h1>
                  Make the
                  <br />
                  <span>connection.</span>
                </h1>
                <p className="hero-description">
                  Your networking finals reviewer, turned into a little game. Warm up at your own
                  pace or go head-to-head with the clock.
                </p>
                <div className="hero-actions">
                  <button
                    className="button button-primary"
                    onClick={() => document.getElementById("mode-heading")?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  >
                    Choose your mode <span aria-hidden="true">↗</span>
                  </button>
                  <span className="hero-hint"><span className="sparkle">✳</span> No setup. Just start.</span>
                </div>
                <div className="hero-stats" aria-label="Reviewer facts">
                  <div><strong>{questionBank.length}</strong><span>questions</span></div>
                  <div><strong>06</strong><span>topics</span></div>
                  <div><strong>02</strong><span>ways to play</span></div>
                </div>
              </div>
              <NetworkArtwork />
              <div className="hero-float-card">
                <span className="float-icon">⌁</span>
                <span><strong>READY, PLAYER 1?</strong><small>Pick your pace. Build your brain.</small></span>
                <span className="float-arrow">↗</span>
              </div>
            </section>

            <section className="mode-section" aria-labelledby="mode-heading">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">CHOOSE YOUR SIGNAL</span>
                  <h2 id="mode-heading">How do you want to play?</h2>
                </div>
                <span className="section-count">01 <i /> 02</span>
              </div>
              <div className="mode-grid">
                <button className="mode-card casual-card" onClick={() => chooseMode("casual")}>
                  <span className="mode-card-top"><span className="mode-icon"><ModeIcon mode="casual" /></span><span className="mode-arrow">↗</span></span>
                  <span className="mode-card-label">LOW PRESSURE / HIGH CURIOSITY</span>
                  <strong>Casual mode</strong>
                  <span className="mode-description">Learn as you go. Answers stay in view, and every right one still counts.</span>
                  <span className="mode-card-bottom"><span>NO TIMER</span><span>ANSWERS VISIBLE</span><span>YOUR PACE</span></span>
                </button>
                <button className="mode-card serious-card" onClick={() => chooseMode("serious")}>
                  <span className="mode-card-top"><span className="mode-icon"><ModeIcon mode="serious" /></span><span className="mode-arrow">↗</span></span>
                  <span className="mode-card-label">FOCUS MODE / EXAM CONDITIONS</span>
                  <strong>Serious mode</strong>
                  <span className="mode-description">Lock in, pick a timer if you like, and keep the answer key under wraps.</span>
                  <span className="mode-card-bottom"><span>OPTIONAL TIMER</span><span>NO PEEKING</span><span>FINAL REVIEW</span></span>
                </button>
              </div>
            </section>
          </div>
        )}

        {screen === "setup" && mode && (
          <section className="setup-screen">
            <button className="text-button back-button" onClick={returnHome}>← Back to mode select</button>
            <div className="setup-heading">
              <span className="eyebrow">{mode === "casual" ? "TAKE IT EASY" : "LOCK IN"}</span>
              <h1>Set your <span>session.</span></h1>
              <p>Make it yours, then jump in.</p>
            </div>
            <div className="setup-panel">
              <div className="setup-group">
                <div className="setup-label"><span>01</span><div><strong>Pick a question style</strong><small>Both styles cover the same reviewer topics.</small></div></div>
                <div className="choice-grid choice-grid-two">
                  <button className={`choice-card${questionType === "multiple-choice" ? " selected" : ""}`} onClick={() => setQuestionType("multiple-choice")} aria-pressed={questionType === "multiple-choice"}>
                    <span className="choice-symbol">A<span> B</span></span>
                    <span><strong>Multiple choice</strong><small>Choose the right answer.</small></span>
                    <span className="choice-check" aria-hidden="true">✓</span>
                  </button>
                  <button className={`choice-card${questionType === "identification" ? " selected" : ""}`} onClick={() => setQuestionType("identification")} aria-pressed={questionType === "identification"}>
                    <span className="choice-symbol">Aa</span>
                    <span><strong>Identification</strong><small>Type it from memory.</small></span>
                    <span className="choice-check" aria-hidden="true">✓</span>
                  </button>
                </div>
              </div>
              <div className="setup-group">
                <div className="setup-label"><span>02</span><div><strong>Choose your round length</strong><small>Questions are shuffled, with no repeats in a round.</small></div></div>
                <div className="segmented-control" role="group" aria-label="Questions per round">
                  {sessionSizes.map((size) => (
                    <button key={size} className={roundSize === size ? "active" : ""} onClick={() => setRoundSize(size)} aria-pressed={roundSize === size}>
                      {size}<small>questions</small>
                    </button>
                  ))}
                </div>
              </div>
              {mode === "serious" && (
                <div className="setup-group timer-group">
                  <div className="setup-label"><span>03</span><div><strong>Set the clock</strong><small>Choose untimed practice or a per-question countdown.</small></div></div>
                  <div className="timer-options">
                    <button className={`timer-choice${!timed ? " selected" : ""}`} onClick={() => setTimed(false)} aria-pressed={!timed}>
                      <span className="timer-dot" /><strong>Untimed</strong><small>Stay in the flow.</small>
                    </button>
                    <button className={`timer-choice${timed ? " selected" : ""}`} onClick={() => setTimed(true)} aria-pressed={timed}>
                      <span className="timer-dot" /><strong>Timed</strong><small>Beat the buzzer.</small>
                    </button>
                  </div>
                  {timed && (
                    <div className="duration-picker" role="group" aria-label="Seconds per question">
                      <span>TIME PER QUESTION</span>
                      {timerDurations.map((seconds) => (
                        <button key={seconds} className={secondsPerQuestion === seconds ? "active" : ""} onClick={() => setSecondsPerQuestion(seconds)} aria-pressed={secondsPerQuestion === seconds}>
                          {seconds}s
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {mode === "casual" && (
                <div className="casual-note"><span>✦</span><p><strong>Answer key, always on.</strong> See the answer and explanation while you play—and keep scoring points for every correct response.</p></div>
              )}
              <div className="setup-footer">
                <span><strong>{roundSize}</strong> questions <i /> {questionType === "multiple-choice" ? "Multiple choice" : "Identification"} <i /> {mode === "casual" ? "Casual" : timed ? `${secondsPerQuestion}s timer` : "Untimed"}</span>
                <button className="button button-primary" onClick={startSession}>Let&apos;s play <span aria-hidden="true">↗</span></button>
              </div>
            </div>
          </section>
        )}

        {screen === "playing" && currentQuestion && mode && (
          <section className="game-screen">
            <div className="game-topline">
              <button className="text-button" onClick={() => setScreen("setup")}>← Session settings</button>
              <span className={`game-mode-pill ${mode}`}>{mode === "casual" ? "✳ Casual round" : "◈ Serious round"}</span>
            </div>
            <div className="game-progress-row">
              <div><span>QUESTION</span><strong>{String(questionIndex + 1).padStart(2, "0")} <i>/</i> {String(sessionQuestions.length).padStart(2, "0")}</strong></div>
              <div className="progress-track" role="progressbar" aria-label="Session progress" aria-valuenow={questionIndex + 1} aria-valuemin={0} aria-valuemax={sessionQuestions.length}><span style={{ width: `${((questionIndex + 1) / sessionQuestions.length) * 100}%` }} /></div>
              <div className="score-counter"><span>POINTS</span><strong>{score}<i> / {sessionResults.length}</i></strong></div>
              {mode === "serious" && timed && <div className={`timer-display${timeLeft <= 10 ? " urgent" : ""}`} aria-label={`${timeLeft} seconds remaining`}><span>TIME LEFT</span><strong>◷ {timerLabel}</strong></div>}
            </div>
            <div className="question-layout">
              <div className="question-main">
                <div className="question-meta"><span className="topic-pill">{currentQuestion.topic}</span><span>{questionType === "multiple-choice" ? "SELECT ONE" : "TYPE YOUR ANSWER"}</span></div>
                <h1>{currentQuestion.prompt}</h1>
                {questionType === "multiple-choice" ? (
                  <div className="answer-options" role="group" aria-label="Answer choices">
                    {currentQuestion.choices.map((choice, index) => {
                      const choiceIsSelected = draftAnswer === choice;
                      const isRight = submitted && isCorrectAnswer(currentQuestion, choice);
                      const isWrongSelection = submitted && choiceIsSelected && !feedback?.correct;
                      return (
                        <button
                          key={choice}
                          className={`answer-option${choiceIsSelected ? " selected" : ""}${isRight && mode === "casual" ? " answer-revealed" : ""}${isWrongSelection ? " answer-wrong" : ""}`}
                          onClick={() => !submitted && setDraftAnswer(choice)}
                          disabled={submitted}
                          aria-pressed={choiceIsSelected}
                        >
                          <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                          <span>{choice}</span>
                          <span className="option-state" aria-hidden="true">{isRight && mode === "casual" ? "✓" : choiceIsSelected && !submitted ? "●" : ""}</span>
                        </button>
                      );
                    })}
                    {!submitted && <button className="button button-primary answer-submit" onClick={() => submitAnswer(draftAnswer)} disabled={!draftAnswer}>Lock in answer <span aria-hidden="true">↗</span></button>}
                  </div>
                ) : (
                  <form className="identification-form" onSubmit={(event) => { event.preventDefault(); submitAnswer(draftAnswer); }}>
                    <label className="sr-only" htmlFor="answer">Your answer</label>
                    <input
                      id="answer"
                      autoComplete="off"
                      autoFocus
                      value={draftAnswer}
                      onChange={(event) => setDraftAnswer(event.target.value)}
                      placeholder="Type your answer..."
                      disabled={submitted}
                    />
                    {!submitted && <button className="button button-primary" type="submit" disabled={!draftAnswer.trim()}>Check answer <span aria-hidden="true">↗</span></button>}
                  </form>
                )}

                {feedback && (
                  <div className={`answer-feedback${feedback.correct ? " is-correct" : " is-incorrect"}`} role="status" aria-live="polite">
                    <span className="feedback-icon">{feedback.correct ? "✓" : "↗"}</span>
                    <div>
                      <strong>{feedback.correct ? "That’s right. Nice work." : feedback.timedOut ? "Time’s up." : "Not quite. Keep learning."}</strong>
                      {mode === "serious" && !feedback.correct ? (
                        <p><b>Correct answer:</b> {feedback.question.answer}<br />{feedback.question.explanation}</p>
                      ) : mode === "serious" ? (
                        <p>Correct answer key stays hidden until your session review.</p>
                      ) : (
                        <p>{feedback.correct ? "Point added to your score." : "Take a look at the answer key, then keep going."}</p>
                      )}
                    </div>
                  </div>
                )}

                {feedback && <button className="button button-primary next-question-button" onClick={advanceQuestion}>{questionIndex === sessionQuestions.length - 1 ? "See your results" : "Next question"} <span aria-hidden="true">↗</span></button>}
              </div>
              <aside className="question-aside">
                <div className="aside-topline"><span className="aside-indicator" /> {mode === "casual" ? "ANSWER KEY / ON" : "ANSWER KEY / LOCKED"}</div>
                {mode === "casual" ? (
                  <div className="answer-key-content">
                    <span className="aside-label">THE ANSWER</span>
                    <strong>{currentQuestion.answer}</strong>
                    <span className="aside-divider" />
                    <span className="aside-label">WHY IT MATTERS</span>
                    <p>{currentQuestion.explanation}</p>
                    <span className="aside-tip"><span>✦</span> You can still earn a point. Trust your brain.</span>
                  </div>
                ) : (
                  <div className="locked-content">
                    <span className="lock-art" aria-hidden="true">⌑</span>
                    <strong>Stay curious.</strong>
                    <p>Submit your answer to see if you&apos;re right. Miss one? We&apos;ll reveal the answer after your attempt.</p>
                  </div>
                )}
                <div className="aside-score"><span>ROUND SCORE</span><strong>{score}<small> / {sessionResults.length}</small></strong></div>
              </aside>
            </div>
          </section>
        )}

        {screen === "results" && mode && (
          <section className="results-screen">
            <span className="eyebrow"><span /> ROUND COMPLETE</span>
            <div className="results-hero">
              <div className="result-score-ring" style={{ "--score": `${scorePercent}%` } as CSSProperties}>
                <div><strong>{scorePercent}<small>%</small></strong><span>ACCURACY</span></div>
              </div>
              <div className="results-heading">
                <h1>{scorePercent >= 80 ? "You’re in the zone." : scorePercent >= 50 ? "You’re getting there." : "Every miss is a map."}</h1>
                <p>You got <strong>{score} out of {sessionResults.length}</strong> right. {scorePercent >= 80 ? "Your signal is strong—keep it up." : "Review what tripped you up, then give it another go."}</p>
                <div className="results-actions">
                  <button className="button button-primary" onClick={() => setScreen("setup")}>Play another round <span aria-hidden="true">↗</span></button>
                  <button className="button button-secondary" onClick={returnHome}>Change mode</button>
                </div>
              </div>
            </div>
            <div className="review-heading"><div><span className="eyebrow">THE RECAP</span><h2>Your answer review</h2></div><span>{sessionResults.length} QUESTIONS</span></div>
            <div className="review-list">
              {sessionResults.map((result, index) => (
                <article className={`review-card${result.correct ? " review-correct" : " review-incorrect"}`} key={result.question.id}>
                  <span className="review-index">{String(index + 1).padStart(2, "0")}</span>
                  <div className="review-body">
                    <span className="topic-pill">{result.question.topic}</span>
                    <h3>{result.question.prompt}</h3>
                    <p className="review-your-answer"><span>YOUR ANSWER</span> {result.submittedAnswer}</p>
                    <p className="review-correct-answer"><span>CORRECT ANSWER</span> {result.question.answer}</p>
                    <p className="review-explanation">{result.question.explanation}</p>
                  </div>
                  <span className="review-status">{result.correct ? "✓ CORRECT" : "↗ REVIEW"}</span>
                </article>
              ))}
            </div>
            <p className="source-note">Study points are based on your COSC 85 Finals Reviewer. For real-world configuration, check current vendor documentation.</p>
          </section>
        )}
      </main>
      <footer className="site-footer"><span>PACKET PREP <i /> COSC 85 FINALS REVIEWER</span><span>MADE FOR THE MOMENT BEFORE THE EXAM <b>✳</b></span></footer>
    </div>
  );
}
