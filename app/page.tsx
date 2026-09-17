"use client";
import confetti from "canvas-confetti";
import {
  addDoc,
  collection,
  deleteDoc, doc,
  getDoc,
  getDocs,
  onSnapshot, setDoc,
  updateDoc
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { db } from "../firebase";

export default function EduPlayApp() {
  const [screen, setScreen] = useState("home");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isUppercase, setIsUppercase] = useState(false);
  const [fontSize, setFontSize] = useState("1.1rem");
  const [accessMenuOpen, setAccessMenuOpen] = useState(false);

  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  
  // Estados do Professor (CRUD)
  const [quizId, setQuizId] = useState("");
  const [quizTitle, setQuizTitle] = useState("");
  const [ruleTime, setRuleTime] = useState(30);
  const [rulePoints, setRulePoints] = useState(100);
  const [ruleBonus, setRuleBonus] = useState(200);
  const [ruleNoPoints, setRuleNoPoints] = useState(false);
  const [questions, setQuestions] = useState([
    { question: "", options: ["", "", "", ""], correct: 0, isBonus: false }
  ]);

  // Estados do Aluno / Multiplayer
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [roomPin, setRoomPin] = useState("");
  const [playersList, setPlayersList] = useState<any[]>([]);
  
  // Estados da Gameplay
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  // Monitor Global da Sala para o Aluno
  useEffect(() => {
    if (!roomPin) return;
    const unsubscribe = onSnapshot(doc(db, "rooms", roomPin), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayersList(data.players || []);

        if (data.status === "PLAYING" && screen === "student-waiting") {
          if (!selectedQuiz) {
            const quizDoc = await getDoc(doc(db, "quizzes", data.quizId));
            if (quizDoc.exists()) {
              setSelectedQuiz({ id: quizDoc.id, ...quizDoc.data() });
            }
          }
          startGamePlay();
        } else if (data.status === "CLOSED") {
          alert("A sala foi encerrada pelo professor.");
          leaveRoom();
        }
      }
    });
    return () => unsubscribe();
  }, [roomPin, screen, selectedQuiz]);

  const fetchQuizzes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "quizzes"));
      const loaded = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setQuizzes(loaded);
    } catch (e) {
      console.error("Erro ao carregar quizzes", e);
    }
  };

  const playSound = (type: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'win') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(); osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {}
  };

  useEffect(() => {
    let timer: any;
    if (gameActive && timeLeft > 0 && !hasAnswered) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (gameActive && timeLeft === 0 && !hasAnswered) {
      handleTimeOut();
    }
    return () => clearTimeout(timer);
  }, [timeLeft, gameActive, hasAnswered]);

  // ==========================================
  // FUNÇÕES DO PROFESSOR (CRUD)
  // ==========================================
  const addQuestionField = () => {
    setQuestions([...questions, { question: "", options: ["", "", "", ""], correct: 0, isBonus: false }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const newQ = [...questions];
    if (field === "question") newQ[index].question = value;
    if (field === "correct") newQ[index].correct = parseInt(value);
    if (field === "isBonus") newQ[index].isBonus = value;
    setQuestions(newQ);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const newQ = [...questions];
    newQ[qIndex].options[optIndex] = value;
    setQuestions(newQ);
  };

  const removeQuestionField = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const editQuiz = (quiz: any) => {
    setQuizId(quiz.id);
    setQuizTitle(quiz.title);
    setRuleTime(quiz.rules?.time || 30);
    setRulePoints(quiz.rules?.points || 100);
    setRuleBonus(quiz.rules?.bonusPoints || 200);
    setRuleNoPoints(quiz.rules?.noPoints || false);
    setQuestions(quiz.questions || []);
    setScreen("teacher-form");
  };

  const saveQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTitle || questions.length === 0) return alert("Preencha o título e adicione perguntas!");

    const quizData = {
      title: quizTitle,
      rules: { time: Number(ruleTime), points: Number(rulePoints), bonusPoints: Number(ruleBonus), noPoints: ruleNoPoints },
      questions
    };

    try {
      if (quizId) {
        await updateDoc(doc(db, "quizzes", quizId), quizData);
      } else {
        await addDoc(collection(db, "quizzes"), quizData);
      }
      resetForm();
      fetchQuizzes();
      setScreen("teacher-menu");
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  };

  const resetForm = () => {
    setQuizId("");
    setQuizTitle("");
    setRuleTime(30);
    setRulePoints(100);
    setRuleBonus(200);
    setRuleNoPoints(false);
    setQuestions([{ question: "", options: ["", "", "", ""], correct: 0, isBonus: false }]);
  };

  const deleteQuiz = async (id: string) => {
    if (confirm("Deseja realmente excluir este quiz?")) {
      await deleteDoc(doc(db, "quizzes", id));
      fetchQuizzes();
    }
  };

  // ==========================================
  // MULTIPLAYER (FIRESTORE)
  // ==========================================
  const hostRoom = async (quiz: any) => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    const roomData = {
      pin,
      quizId: quiz.id,
      title: quiz.title,
      status: "LOBBY",
      players: []
    };
    await setDoc(doc(db, "rooms", pin), roomData);
    setRoomPin(pin);
    setSelectedQuiz(quiz);
    setScreen("teacher-lobby");
  };

  const joinRoom = async () => {
    if (!studentName || !roomPin) return alert("Digite seu nome e o PIN da sala!");
    const roomRef = doc(db, "rooms", roomPin);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) return alert("Sala não encontrada!");
    const roomData = roomSnap.data();
    if (roomData.status !== "LOBBY") return alert("O jogo já começou!");

    const generatedId = "p_" + Math.random().toString(36).substring(2, 9);
    setStudentId(generatedId);
    
    const newPlayer = { id: generatedId, name: studentName, score: 0 };
    const updatedPlayers = [...(roomData.players || []), newPlayer];

    await updateDoc(roomRef, { players: updatedPlayers });

    const quizDoc = await getDoc(doc(db, "quizzes", roomData.quizId));
    if (quizDoc.exists()) {
      setSelectedQuiz({ id: quizDoc.id, ...quizDoc.data() });
    }

    setScreen("student-waiting");
  };

  const startRoomGame = async () => {
    await updateDoc(doc(db, "rooms", roomPin), { status: "PLAYING" });
    setScreen("teacher-ranking");
  };

  const closeRoom = async () => {
    if (roomPin) {
      try {
        await updateDoc(doc(db, "rooms", roomPin), { status: "CLOSED" });
      } catch (e) {}
    }
    leaveRoom();
  };

  const leaveRoom = async () => {
    if (roomPin && studentId) {
      try {
        const roomRef = doc(db, "rooms", roomPin);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const players = roomSnap.data().players || [];
          const filtered = players.filter((p: any) => p.id !== studentId);
          await updateDoc(roomRef, { players: filtered });
        }
      } catch (e) {}
    }
    setRoomPin("");
    setStudentName("");
    setStudentId("");
    setSelectedQuiz(null);
    setScreen("home");
  };

  // ==========================================
  // FLUXO DE JOGO DO ALUNO
  // ==========================================
  const startGamePlay = () => {
    setCurrentQIndex(0);
    setScore(0);
    setTimeLeft(selectedQuiz?.rules?.time || 30);
    setHasAnswered(false);
    setGameActive(true);
    setScreen("game-play");
  };

  const handleAnswer = async (index: number) => {
    if (hasAnswered || !selectedQuiz) return;
    setHasAnswered(true);
    setGameActive(false);

    const q = selectedQuiz.questions[currentQIndex];
    let newScore = score;

    if (index === q.correct) {
      playSound('win');
      if (!selectedQuiz.rules.noPoints) {
        const base = q.isBonus ? selectedQuiz.rules.bonusPoints : selectedQuiz.rules.points;
        const bonusTime = timeLeft * 2;
        newScore += (base + bonusTime);
        setScore(newScore);
      }
      confetti({ particleCount: 100, spread: 70 });
    } else {
      playSound('lose');
    }

    if (roomPin) {
      try {
        const roomRef = doc(db, "rooms", roomPin);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const players = roomSnap.data().players || [];
          const updated = players.map((p: any) => p.id === studentId ? { ...p, score: newScore } : p);
          await updateDoc(roomRef, { players: updated });
        }
      } catch (e) {}
    }

    setTimeout(() => {
      if (currentQIndex < selectedQuiz.questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setTimeLeft(selectedQuiz.rules.time || 30);
        setHasAnswered(false);
        setGameActive(true);
      } else {
        setScreen("game-finished");
      }
    }, 1500);
  };

  const handleTimeOut = () => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setGameActive(false);
    playSound('lose');

    setTimeout(() => {
      if (selectedQuiz && currentQIndex < selectedQuiz.questions.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setTimeLeft(selectedQuiz.rules.time || 30);
        setHasAnswered(false);
        setGameActive(true);
      } else {
        setScreen("game-finished");
      }
    }, 1500);
  };

  return (
    <div style={{
      backgroundColor: isDarkMode ? "#1F2937" : "#BAE6FD",
      color: isDarkMode ? "#F3F4F6" : "#1F2937",
      minHeight: "100vh", padding: "20px", fontSize, fontFamily: "sans-serif",
      textTransform: isUppercase ? "uppercase" : "none"
    }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", paddingBottom: "60px" }}>

        {/* TELA INICIAL */}
        {screen === "home" && (
          <div style={cardStyle(isDarkMode)}>
            <h1 style={{ color: "#7C3AED", textAlign: "center", fontSize: "2.5rem" }}>🌟 EduPlay Quiz 🌟</h1>
            <p style={{ textAlign: "center", fontSize: "1.2rem" }}>Aprender divertindo é muito mais legal!</p>
            <div style={{ textAlign: "center", fontSize: "4rem", margin: "20px 0" }}>🚀</div>
            <button style={btnStyle("#10B981")} onClick={() => setScreen("student-join")}>🎮 ENTRAR PARA JOGAR</button>
            <button style={btnStyle("#6366F1")} onClick={() => setScreen("teacher-menu")}>👩‍🏫 ÁREA DO PROFESSOR</button>
          </div>
        )}

        {/* ENTRAR NA SALA */}
        {screen === "student-join" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>Entrar na Sala do Professor</h2>
            <label>Seu Nome ou Apelido:</label>
            <input type="text" style={inputStyle(isDarkMode)} value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Ex: Pedrinho" />
            <label>PIN da Sala:</label>
            <input type="text" style={inputStyle(isDarkMode)} value={roomPin} onChange={e => setRoomPin(e.target.value)} placeholder="Ex: 4321" />
            <button style={btnStyle("#10B981")} onClick={joinRoom}>Entrar na Aventura ✨</button>
            <button style={btnStyle("#6B7280")} onClick={() => setScreen("home")}>Voltar</button>
          </div>
        )}

        {/* LOBBY ALUNO */}
        {screen === "student-waiting" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>Tudo Pronto, Herói! 🦸‍♂️</h2>
            <p style={{ textAlign: "center" }}>Você entrou na sala. Olhe para a tela do professor e aguarde o jogo começar!</p>
            <div style={{ textAlign: "center", fontSize: "3rem", margin: "20px 0" }}>⏳</div>
            <button style={btnStyle("#EF4444")} onClick={leaveRoom}>🚪 Sair da Sala</button>
          </div>
        )}

        {/* GAMEPLAY ALUNO */}
        {screen === "game-play" && selectedQuiz && selectedQuiz.questions && (
          <div style={cardStyle(isDarkMode)}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
              <span>Pergunta {currentQIndex + 1} de {selectedQuiz.questions.length}</span>
              {!selectedQuiz.rules.noPoints && <span style={{ color: "#D97706" }}>⭐ {score} Pts</span>}
            </div>

            <div style={{ background: "#FEE2E2", color: "#EF4444", padding: "10px", borderRadius: "10px", textAlign: "center", fontSize: "1.3rem", fontWeight: "bold", margin: "15px 0" }}>
              ⏱ Tempo Restante: {timeLeft}s
            </div>

            {selectedQuiz.questions[currentQIndex]?.isBonus && !selectedQuiz.rules.noPoints && (
              <div style={{ background: "#FEF08A", color: "#854D0E", padding: "10px", borderRadius: "10px", textAlign: "center", fontWeight: "bold", marginBottom: "15px" }}>
                ⚡ ATENÇÃO! ESTA PERGUNTA VALE O DOBRO! ⚡
              </div>
            )}

            <h3 style={{ fontSize: "1.5rem", textAlign: "center", margin: "20px 0" }}>
              {selectedQuiz.questions[currentQIndex]?.question}
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
              {selectedQuiz.questions[currentQIndex]?.options.map((opt: string, idx: number) => (
                <button 
                  key={idx} 
                  disabled={hasAnswered}
                  style={{
                    padding: "20px", fontSize: "1.1rem", fontWeight: "bold", borderRadius: "15px",
                    border: "3px solid #D1D5DB", background: isDarkMode ? "#374151" : "#F3F4F6", 
                    color: isDarkMode ? "#FFF" : "#000", cursor: hasAnswered ? "not-allowed" : "pointer",
                    opacity: hasAnswered ? 0.6 : 1
                  }} 
                  onClick={() => handleAnswer(idx)}
                >
                  {String.fromCharCode(65 + idx)}) {opt}
                </button>
              ))}
            </div>

            <button style={{ ...btnStyle("#EF4444"), marginTop: "30px" }} onClick={leaveRoom}>🚪 Sair da Sala</button>
          </div>
        )}

        {/* FIM DO JOGO */}
        {screen === "game-finished" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>🎉 Fim do Desafio! 🎉</h2>
            <p style={{ textAlign: "center", fontSize: "1.3rem" }}>Você concluiu todas as perguntas com sucesso!</p>
            {!selectedQuiz?.rules.noPoints && <h3 style={{ color: "#D97706", textAlign: "center" }}>Sua Pontuação Final: {score} Pontos</h3>}
            <button style={btnStyle("#10B981")} onClick={() => setScreen("home")}>Voltar ao Início</button>
          </div>
        )}

        {/* PAINEL PROFESSOR */}
        {screen === "teacher-menu" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>Painel do Professor 📚</h2>
            <button style={btnStyle("#7C3AED")} onClick={() => { resetForm(); setScreen("teacher-form"); }}>➕ Criar Novo Quiz</button>
            <button style={btnStyle("#3B82F6")} onClick={() => { fetchQuizzes(); setScreen("teacher-list-host"); }}>📺 Hospedar Jogo ao Vivo</button>
            <button style={btnStyle("#10B981")} onClick={() => { fetchQuizzes(); setScreen("teacher-list-manage"); }}>✏️ Gerenciar / Editar Quizzes</button>
            <button style={btnStyle("#6B7280")} onClick={() => setScreen("home")}>Voltar ao Menu Principal</button>
          </div>
        )}

        {/* LISTA PARA GERENCIAR / EDITAR / EXCLUIR */}
        {screen === "teacher-list-manage" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>Gerenciar Quizzes Cadastrados</h2>
            {quizzes.length === 0 ? <p>Nenhum quiz cadastrado ainda.</p> : quizzes.map(q => (
              <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #ddd" }}>
                <span><strong>{q.title}</strong> ({q.questions?.length || 0} perguntas)</span>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button style={{ ...btnStyle("#3B82F6"), width: "auto", padding: "8px 12px", margin: 0 }} onClick={() => editQuiz(q)}>Editar ✏️</button>
                  <button style={{ ...btnStyle("#EF4444"), width: "auto", padding: "8px 12px", margin: 0 }} onClick={() => deleteQuiz(q.id)}>Excluir 🗑️</button>
                </div>
              </div>
            ))}
            <button style={{ ...btnStyle("#6B7280"), marginTop: "20px" }} onClick={() => setScreen("teacher-menu")}>Voltar</button>
          </div>
        )}

        {/* LISTA PARA HOSPEDAR */}
        {screen === "teacher-list-host" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>Escolha o Quiz para Hospedar</h2>
            {quizzes.length === 0 ? <p>Nenhum quiz cadastrado ainda.</p> : quizzes.map(q => (
              <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px", borderBottom: "1px solid #ddd" }}>
                <span><strong>{q.title}</strong> ({q.questions?.length || 0} perguntas)</span>
                <button style={{ ...btnStyle("#10B981"), width: "auto", padding: "10px 15px", margin: 0 }} onClick={() => hostRoom(q)}>Abrir Sala 🎮</button>
              </div>
            ))}
            <button style={{ ...btnStyle("#6B7280"), marginTop: "20px" }} onClick={() => setScreen("teacher-menu")}>Voltar</button>
          </div>
        )}

        {/* LOBBY PROFESSOR */}
        {screen === "teacher-lobby" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>Sala Aberta com Sucesso! 🎉</h2>
            <p style={{ textAlign: "center" }}>Passe este Código Mágico para os alunos:</p>
            <div style={{ fontSize: "3.5rem", fontWeight: "bold", textAlign: "center", color: "#7C3AED", background: "#EDE9FE", padding: "20px", borderRadius: "20px", letterSpacing: "8px" }}>
              {roomPin}
            </div>

            <h3 style={{ marginTop: "25px" }}>Alunos Conectados ({playersList.length}):</h3>
            <div style={{ minHeight: "80px", border: "3px dashed #D1D5DB", padding: "15px", borderRadius: "15px", textAlign: "center" }}>
              {playersList.length === 0 ? "Aguardando alunos entrarem..." : playersList.map((p, i) => (
                <span key={i} style={{ display: "inline-block", background: "#F59E0B", color: "#FFF", padding: "8px 15px", borderRadius: "20px", fontWeight: "bold", margin: "5px" }}>{p.name}</span>
              ))}
            </div>

            <button style={{ ...btnStyle("#10B981"), marginTop: "20px" }} onClick={startRoomGame}>▶ INICIAR JOGO PARA TODOS</button>
            <button style={{ ...btnStyle("#EF4444"), marginTop: "10px" }} onClick={closeRoom}>Encerrar Sala</button>
          </div>
        )}

        {/* RANKING AO VIVO */}
        {screen === "teacher-ranking" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>🏆 Pódio e Ranking ao Vivo 🏆</h2>
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "15px" }}>
              <thead>
                <tr style={{ background: "#7C3AED", color: "#FFF" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Posição</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Aluno</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Pontuação</th>
                </tr>
              </thead>
              <tbody>
                {playersList.sort((a,b) => b.score - a.score).map((p, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid #ddd" }}>
                    <td style={{ padding: "10px" }}>{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "👏"} {idx + 1}º</td>
                    <td style={{ padding: "10px" }}>{p.name}</td>
                    <td style={{ padding: "10px", fontWeight: "bold", color: "#D97706" }}>⭐ {p.score} pts</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button style={{ ...btnStyle("#6B7280"), marginTop: "25px" }} onClick={closeRoom}>Encerrar Sala e Voltar</button>
          </div>
        )}

        {/* FORMULÁRIO DE CRIAÇÃO / EDIÇÃO MANUAL */}
        {screen === "teacher-form" && (
          <div style={cardStyle(isDarkMode)}>
            <h2>{quizId ? "Editar Quiz" : "Criar Novo Quiz"}</h2>
            
            <form onSubmit={saveQuiz}>
              <label>Título do Quiz:</label>
              <input type="text" style={inputStyle(isDarkMode)} value={quizTitle} onChange={e => setQuizTitle(e.target.value)} placeholder="Ex: Ciências - O Corpo Humano" required />

              <h3>⚙️ Regras do Quiz</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label>Tempo por pergunta (seg):</label>
                  <input type="number" style={inputStyle(isDarkMode)} value={ruleTime} onChange={e => setRuleTime(Number(e.target.value))} />
                </div>
                <div>
                  <label>Pontos por acerto:</label>
                  <input type="number" style={inputStyle(isDarkMode)} value={rulePoints} onChange={e => setRulePoints(Number(e.target.value))} />
                </div>
                <div>
                  <label>Pontos Pergunta Bônus:</label>
                  <input type="number" style={inputStyle(isDarkMode)} value={ruleBonus} onChange={e => setRuleBonus(Number(e.target.value))} />
                </div>
                <div>
                  <label>Modo sem competição:</label>
                  <select style={inputStyle(isDarkMode)} value={ruleNoPoints ? "true" : "false"} onChange={e => setRuleNoPoints(e.target.value === "true")}>
                    <option value="false">Não (Com Pontuação)</option>
                    <option value="true">Sim (Apenas Aprendizado)</option>
                  </select>
                </div>
              </div>

              <h3>❓ Perguntas</h3>
              {questions.map((q, qIndex) => (
                <div key={qIndex} style={{ border: "2px solid #D1D5DB", padding: "15px", borderRadius: "12px", marginBottom: "15px" }}>
                  <h4>Pergunta {qIndex + 1}</h4>
                  <input type="text" style={inputStyle(isDarkMode)} value={q.question} onChange={e => updateQuestion(qIndex, "question", e.target.value)} placeholder="Texto da pergunta..." required />
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    {q.options.map((opt, optIndex) => (
                      <input key={optIndex} type="text" style={inputStyle(isDarkMode)} value={opt} onChange={e => updateOption(qIndex, optIndex, e.target.value)} placeholder={`Opção ${String.fromCharCode(65 + optIndex)}`} required />
                    ))}
                  </div>

                  <label>Alternativa Correta:</label>
                  <select style={inputStyle(isDarkMode)} value={q.correct} onChange={e => updateQuestion(qIndex, "correct", e.target.value)}>
                    <option value={0}>Opção A</option>
                    <option value={1}>Opção B</option>
                    <option value={2}>Opção C</option>
                    <option value={3}>Opção D</option>
                  </select>

                  <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input type="checkbox" checked={q.isBonus} onChange={e => updateQuestion(qIndex, "isBonus", e.target.checked)} />
                    Marcar como Pergunta Bônus (Vale o Dobro)
                  </label>

                  {questions.length > 1 && (
                    <button type="button" style={{ ...btnStyle("#EF4444"), marginTop: "10px", padding: "8px" }} onClick={() => removeQuestionField(qIndex)}>Remover Pergunta</button>
                  )}
                </div>
              ))}

              <button type="button" style={btnStyle("#3B82F6")} onClick={addQuestionField}>+ Adicionar Outra Pergunta</button>
              <button type="submit" style={btnStyle("#10B981")}>Salvar Quiz Completo 💾</button>
              <button type="button" style={btnStyle("#6B7280")} onClick={() => setScreen("teacher-menu")}>Cancelar</button>
            </form>
          </div>
        )}

      </div>

      {/* BOTÃO FLUTUANTE DE ACESSIBILIDADE */}
      <button onClick={() => setAccessMenuOpen(!accessMenuOpen)} style={{
        position: "fixed", bottom: "20px", right: "20px", width: "55px", height: "55px",
        borderRadius: "50%", background: "#7C3AED", color: "#FFF", fontSize: "24px", border: "none", cursor: "pointer", zIndex: 1000
      }}>♿</button>

      {accessMenuOpen && (
        <div style={{
          position: "fixed", bottom: "85px", right: "20px", background: isDarkMode ? "#374151" : "#FFF",
          border: "2px solid #D1D5DB", padding: "15px", borderRadius: "15px", zIndex: 1000, width: "220px", boxShadow: "0 5px 15px rgba(0,0,0,0.2)"
        }}>
          <h4 style={{ marginTop: 0 }}>Acessibilidade</h4>
          <button style={{ ...btnStyle("#3B82F6"), fontSize: "0.9rem", padding: "8px" }} onClick={() => setFontSize("1.3rem")}>A+ Aumentar Letras</button>
          <button style={{ ...btnStyle("#3B82F6"), fontSize: "0.9rem", padding: "8px" }} onClick={() => setFontSize("1.1rem")}>A- Letra Normal</button>
          <button style={{ ...btnStyle("#6366F1"), fontSize: "0.9rem", padding: "8px" }} onClick={() => setIsUppercase(!isUppercase)}>🔤 Alternar Maiúsculas</button>
          <button style={{ ...btnStyle("#1F2937"), fontSize: "0.9rem", padding: "8px" }} onClick={() => setIsDarkMode(!isDarkMode)}>🌙 Modo Escuro</button>
        </div>
      )}
    </div>
  );
}

function cardStyle(dark: boolean) {
  return {
    background: dark ? "#374151" : "#FFFFFF",
    padding: "30px", borderRadius: "24px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    border: "4px solid #FFF", marginBottom: "20px"
  };
}

function btnStyle(color: string) {
  return {
    backgroundColor: color, color: "#FFFFFF", padding: "15px", border: "none",
    borderRadius: "16px", cursor: "pointer", fontWeight: "bold", width: "100%",
    fontSize: "1.1rem", marginTop: "10px", boxShadow: "0 4px 0 rgba(0,0,0,0.2)"
  };
}

function inputStyle(dark: boolean) {
  return {
    width: "100%", padding: "12px", border: "3px solid #D1D5DB", borderRadius: "10px",
    marginBottom: "15px", fontSize: "1rem", background: dark ? "#1F2937" : "#FFF", color: dark ? "#FFF" : "#000", boxSizing: "border-box" as const
  };
}