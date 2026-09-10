import { useState, useEffect, useRef } from "react";
import { Loader, PlayCircle, CheckCircle2, ShieldAlert, Camera, AlertTriangle, ShieldCheck, Video } from "lucide-react";
import { type Quiz, type Course, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PageHeader, Card, Btn } from "../../shared/UIPrimitives";

interface StudentQuizzesProps {
  course?: Course | null;
}

export function StudentQuizzes({ course }: StudentQuizzesProps = {}) {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<any>(null);

  // Proctoring & Anti-Malpractice states
  const [proctorModalQuiz, setProctorModalQuiz] = useState<Quiz | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [autoSubmittedReason, setAutoSubmittedReason] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeQuizRef = useRef<Quiz | null>(null);
  const answersRef = useRef<Record<number, number>>({});
  const isSubmittingRef = useRef<boolean>(false);

  // Keep refs up-to-date for async event listeners
  useEffect(() => {
    activeQuizRef.current = activeQuiz;
  }, [activeQuiz]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Bind camera stream to video tag whenever stream or activeQuiz changes
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, activeQuiz]);

  // Helper to stop webcam stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
  };

  // Helper to exit fullscreen safely
  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const [myAttempts, setMyAttempts] = useState<any[]>([]);

  const fetchQuizzes = async () => {
    try {
      setLoading(true);
      const [res, attemptsRes] = await Promise.all([
        api.getQuizzes(),
        api.getMyQuizAttempts()
      ]);

      if (attemptsRes && attemptsRes.success && Array.isArray(attemptsRes.data)) {
        setMyAttempts(attemptsRes.data);
      }

      if (res.success && res.data) {
        const allQuizzes = Array.isArray(res.data) ? res.data : [];
        if (course) {
          setQuizzes(allQuizzes.filter((q: any) => String(q.courseId) === String(course.id)));
        } else {
          setQuizzes(allQuizzes);
        }
      }
    } catch (error) {
      console.error("Error fetching quizzes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Submit quiz attempt (handles both manual submit & automatic malpractice submit)
  const submitQuizAttempt = async (reason?: string) => {
    if (!activeQuizRef.current || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Stop proctoring camera & exit fullscreen
    stopCamera();
    exitFullscreen();

    if (reason) {
      setAutoSubmittedReason(reason);
    }

    try {
      setLoading(true);
      const currentAnswers = answersRef.current;
      const payload = {
        answers: currentAnswers,
        malpractice: Boolean(reason),
        tabSwitches: reason ? 1 : 0
      };
      const res = await api.submitQuizAttempt(activeQuizRef.current.id.toString(), payload);
      if (res.success) {
        if (reason) {
          setResult({
            ...res.data,
            marks: 0,
            percentage: 0,
          });
        } else {
          setResult(res.data);
        }
        // Refetch attempts dynamically so last score updates instantly
        const attemptsRes = await api.getMyQuizAttempts();
        if (attemptsRes && attemptsRes.success && Array.isArray(attemptsRes.data)) {
          setMyAttempts(attemptsRes.data);
        }
      } else {
        alert("Failed to submit quiz: " + (res.error || "Unknown error"));
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
    } finally {
      setLoading(false);
      setActiveQuiz(null);
      isSubmittingRef.current = false;
    }
  };

  // Launch proctored quiz session with webcam & fullscreen
  const handleStartProctoredQuiz = async (quiz: Quiz) => {
    setCameraError(null);
    setAutoSubmittedReason(null);

    // 1. Request Webcam access
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
    } catch (err: any) {
      console.warn("Webcam access denied or missing:", err);
      setCameraError("Webcam access is required for anti-malpractice proctoring. Please grant camera permission to start.");
      return;
    }

    // 2. Request Fullscreen mode
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.warn("Fullscreen mode failed:", err);
    }

    // 3. Start quiz
    setProctorModalQuiz(null);
    setAnswers({});
    setActiveQuiz(quiz);
  };

  // Set up Anti-Malpractice listeners (ESC key / Exit Fullscreen / Tab Switch / Win+G / Focus Loss)
  useEffect(() => {
    if (!activeQuiz) return;

    // 1. Fullscreen exit handler (ESC key or window control)
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && activeQuizRef.current && !isSubmittingRef.current) {
        submitQuizAttempt(
          "Anti-Malpractice Triggered: You exited Fullscreen mode (pressed ESC or closed window). Your quiz has been automatically submitted with your saved answers."
        );
      }
    };

    // 2. Tab switch / Page visibility handler
    const handleVisibilityChange = () => {
      if (document.hidden && activeQuizRef.current && !isSubmittingRef.current) {
        submitQuizAttempt(
          "Anti-Malpractice Triggered: Tab or Window switch detected. Your quiz has been automatically submitted with your saved answers."
        );
      }
    };

    // 3. Window focus loss handler (Triggers on Windows+G, Alt+Tab, Edge opening, notification overlays)
    const handleWindowBlur = () => {
      if (activeQuizRef.current && !isSubmittingRef.current) {
        submitQuizAttempt(
          "Anti-Malpractice Triggered: System window focus loss detected (e.g., Windows+G, Alt+Tab, or external app opened). Your quiz has been automatically submitted."
        );
      }
    };

    // 4. Keyboard Shortcut Interceptor (Win key, Win+G, F12, DevTools, Copy/Paste)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Windows / Meta key or Win+G
      if (e.key === "Meta" || e.metaKey || (e.metaKey && (e.key === "g" || e.key === "G"))) {
        e.preventDefault();
        e.stopPropagation();
        if (activeQuizRef.current && !isSubmittingRef.current) {
          submitQuizAttempt(
            "Anti-Malpractice Triggered: System shortcut detected (Windows key / Win+G pressed). Your quiz has been automatically submitted."
          );
        }
        return false;
      }

      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U (Inspect Element / DevTools)
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
        (e.ctrlKey && (e.key === "u" || e.key === "U"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        if (activeQuizRef.current && !isSubmittingRef.current) {
          submitQuizAttempt(
            "Anti-Malpractice Triggered: Developer tools or inspect shortcut attempt detected. Your quiz has been automatically submitted."
          );
        }
        return false;
      }

      // Block Copy / Paste / Cut shortcuts
      if (e.ctrlKey && (e.key === "c" || e.key === "C" || e.key === "v" || e.key === "V" || e.key === "x" || e.key === "X")) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // 5. Disable Right-Click Context Menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 6. Disable Clipboard Copy / Cut / Paste
    const handleClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleClipboard);
    document.addEventListener("paste", handleClipboard);
    document.addEventListener("cut", handleClipboard);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleClipboard);
      document.removeEventListener("paste", handleClipboard);
      document.removeEventListener("cut", handleClipboard);
    };
  }, [activeQuiz]);

  // Quiz Results View
  if (result) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center max-w-2xl mx-auto px-4">
        {autoSubmittedReason ? (
          <div className="mb-6 w-full rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-left text-destructive shadow-lg animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 font-bold text-lg mb-1">
              <ShieldAlert className="h-6 w-6 text-destructive shrink-0" />
              <span>Anti-Malpractice Auto-Submission</span>
            </div>
            <p className="text-sm opacity-90 leading-relaxed">{autoSubmittedReason}</p>
          </div>
        ) : (
          <CheckCircle2 className="mb-4 h-16 w-16 text-success animate-bounce" />
        )}

        <h2 className="font-display text-3xl font-bold">
          {autoSubmittedReason ? "Quiz Auto-Submitted!" : "Quiz Completed Successfully!"}
        </h2>
        <p className="mt-2 text-muted-foreground text-lg">
          You scored <span className="font-semibold text-foreground">{result.percentage}%</span> ({result.marks} out of {result.totalMarks || 20} marks)
        </p>

        <Btn
          className="mt-8 px-8 py-3"
          onClick={() => {
            setResult(null);
            setActiveQuiz(null);
            setAnswers({});
            setAutoSubmittedReason(null);
            fetchQuizzes();
          }}
        >
          Return to Quiz Dashboard
        </Btn>
      </div>
    );
  }

  // Active Quiz View (Full-Screen Viewport Overlay & Live PIP Camera active)
  if (activeQuiz) {
    const questions = activeQuiz.questions || [];
    return (
      <div className="fixed inset-0 z-[999] bg-background overflow-y-auto p-4 md:p-8 select-none w-screen h-screen">
        <div className="max-w-4xl mx-auto relative pb-20">
          {/* Floating Proctored Webcam PIP Widget */}
          <div className="fixed top-4 right-4 z-[1000] rounded-2xl border-2 border-emerald-500/60 bg-slate-950/90 p-2.5 shadow-2xl backdrop-blur-md flex flex-col items-center transition-all hover:scale-105">
            <div className="flex items-center gap-2 mb-2 w-full justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-bold text-emerald-400 tracking-wider uppercase">Live Camera</span>
              </div>
              <Video className="h-3.5 w-3.5 text-emerald-400" />
            </div>

            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-28 w-36 object-cover rounded-xl transform -scale-x-100"
              />
            </div>

            <div className="mt-2 text-[10px] font-semibold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-400" />
              <span>AI Malpractice Monitor</span>
            </div>
          </div>

          {/* Anti-Malpractice Security Warning Banner */}
          <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-600 dark:text-amber-400 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-xs md:text-sm">
                <span className="font-bold">Proctored Session Active:</span> Fullscreen & Webcam enabled. Pressing <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-mono">ESC</kbd>, <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 text-xs font-mono">Win+G</kbd>, switching tabs, or losing window focus will <strong className="underline">immediately auto-submit</strong> your quiz.
              </div>
            </div>
          </div>

          <PageHeader title={activeQuiz.title} subtitle={`Time Limit: ${activeQuiz.timeLimit || 15} minutes`} />

          {questions.length > 0 ? (
            questions.map((q, qIndex) => (
              <Card key={qIndex} className="p-6 mb-5 select-none">
                <h3 className="text-lg font-medium mb-4">
                  {qIndex + 1}. {q.question}
                </h3>
                <div className="space-y-3">
                  {q.options.map((opt: string, oIndex: number) => (
                    <label
                      key={oIndex}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                        answers[qIndex] === oIndex
                          ? "border-primary bg-primary/10 font-medium"
                          : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question_${qIndex}`}
                        value={oIndex}
                        checked={answers[qIndex] === oIndex}
                        onChange={() => setAnswers((prev) => ({ ...prev, [qIndex]: oIndex }))}
                        className="h-4 w-4 text-primary"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center text-muted-foreground">No questions available for this quiz.</Card>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Btn
              onClick={() => submitQuizAttempt()}
              disabled={loading || questions.length === 0}
              className="px-8 py-3 font-semibold"
            >
              {loading ? "Submitting..." : "Submit Answers"}
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // Pre-Quiz Proctoring Agreement Modal
  if (proctorModalQuiz) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="flex items-center gap-3 text-primary mb-2">
            <div className="p-3 rounded-2xl bg-primary/10">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Proctored Assessment Notice</h3>
              <p className="text-xs text-muted-foreground">{proctorModalQuiz.title}</p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            To ensure academic integrity, this quiz uses automated AI proctoring and anti-malpractice rules:
          </p>

          <div className="mt-4 space-y-3 rounded-2xl bg-secondary/40 p-4 border border-border text-xs md:text-sm">
            <div className="flex items-start gap-2.5">
              <Camera className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <span><strong>Webcam Stream:</strong> Your camera will display in a live side-widget throughout the assessment.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <span><strong>Fullscreen Requirement:</strong> The quiz will switch to full-screen mode upon starting.</span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <span><strong>Anti-Malpractice Auto-Submit:</strong> Pressing <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">ESC</kbd>, <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px]">Win+G</kbd>, switching tabs, or losing window focus will <strong>immediately auto-submit your quiz</strong>.</span>
            </div>
          </div>

          {cameraError && (
            <div className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <Btn variant="ghost" onClick={() => setProctorModalQuiz(null)}>
              Cancel
            </Btn>
            <Btn onClick={() => handleStartProctoredQuiz(proctorModalQuiz)}>
              <PlayCircle className="h-4 w-4" />
              Start Proctored Quiz
            </Btn>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Quiz List View
  return (
    <>
      <PageHeader title="Quizzes" subtitle="Proctored skill assessments to evaluate your learning." />
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : quizzes.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => {
            const attempt = myAttempts.find((att: any) => String(att.quizId) === String(q.id));
            const isCompleted = Boolean(
              attempt ||
              (user?.id && localStorage.getItem(`quiz_completed_${user.id}_${q.id}`))
            );
            const scoreMarks = attempt ? attempt.marks : undefined;

            return (
              <Card
                key={q.id}
                className={`flex flex-col justify-between h-full min-h-[230px] transition-all border ${
                  isCompleted
                    ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 shadow-sm"
                    : "border-border bg-card hover:border-primary/40 shadow-soft"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Course: {q.courseId || "N/A"}
                    </div>
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Attempted & Completed ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                        <ShieldCheck className="h-3 w-3" /> Proctored
                      </span>
                    )}
                  </div>

                  <div className="font-display text-base font-bold text-foreground line-clamp-2 min-h-[48px] flex items-center leading-snug">
                    {q.title || "Quiz"}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground font-semibold">
                    <span>{q.totalQuestions || (q.questions ? q.questions.length : 0)} questions</span>
                    <span>·</span>
                    <span>{q.timeLimit || 15} min</span>
                  </div>

                  {isCompleted && scoreMarks !== undefined && (
                    <div className="mt-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1.5 rounded-xl w-fit border border-emerald-500/20">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Last Score: {scoreMarks} / {q.totalMarks || 20} Marks</span>
                    </div>
                  )}
                </div>

                {isCompleted ? (
                  <Btn
                    variant="soft"
                    className="mt-5 w-full justify-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30 font-bold border border-emerald-500/30 shadow-sm"
                    onClick={() => setProctorModalQuiz(q)}
                  >
                    <PlayCircle className="h-4 w-4 text-emerald-600" />
                    Retake Quiz →
                  </Btn>
                ) : (
                  <Btn className="mt-5 w-full justify-center shadow-glow" onClick={() => setProctorModalQuiz(q)}>
                    <PlayCircle className="h-4 w-4" />
                    Start quiz →
                  </Btn>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No quizzes available yet</p>
        </div>
      )}
    </>
  );
}
