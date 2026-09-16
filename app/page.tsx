"use client";
import confetti from "canvas-confetti";
import { addDoc, collection, deleteDoc, doc, getDocs } from "firebase/firestore";
import { FormEvent, useEffect, useState } from "react";
import { db } from "../firebase";

interface Pergunta {
  pergunta: string;
  opcoes: string[];
  correta: number;
}

interface Quiz {
  id: string;
  titulo: string;
  perguntas: Pergunta[];
}

export default function Home() {
  const [telaAtual, setTelaAtual] = useState<string>("home");

  // Estados do Professor (CRUD)
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [tituloQuiz, setTituloQuiz] = useState<string>("");
  const [pergunta, setPergunta] = useState<string>("");
  const [opcoes, setOpcoes] = useState<string[]>(["", "", "", ""]);
  const [correta, setCorreta] = useState<string>("0");
  const [carregando, setCarregando] = useState<boolean>(false);

  // Estados do Aluno (Jogo)
  const [quizSelecionado, setQuizSelecionado] = useState<Quiz | null>(null);
  const [indicePergunta, setIndicePergunta] = useState<number>(0);
  const [pontos, setPontos] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [fimDoJogo, setFimDoJogo] = useState<boolean>(false);
  const [animarErro, setAnimarErro] = useState<boolean>(false);

  // Função para buscar os quizzes do Firebase
  const carregarQuizzes = async () => {
    setCarregando(true);
    try {
      const querySnapshot = await getDocs(collection(db, "quizzes"));
      const listaQuizzes: Quiz[] = [];
      querySnapshot.forEach((docSnap) => {
        const dados = docSnap.data();
        listaQuizzes.push({
          id: docSnap.id,
          titulo: dados.titulo,
          perguntas: dados.perguntas || []
        });
      });
      setQuizzes(listaQuizzes);
    } catch (error) {
      console.error("Erro ao carregar: ", error);
    }
    setCarregando(false);
  };

  useEffect(() => {
    if (telaAtual === "professor" || telaAtual === "selecionar-quiz") {
      carregarQuizzes();
    }
  }, [telaAtual]);

  // Salvar Quiz
  const salvarQuiz = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "quizzes"), {
        titulo: tituloQuiz,
        perguntas: [
          {
            pergunta: pergunta,
            opcoes: opcoes,
            correta: parseInt(correta)
          }
        ]
      });
      alert("✅ Quiz salvo com sucesso no banco de dados!");
      setTituloQuiz(""); setPergunta(""); setOpcoes(["", "", "", ""]); setCorreta("0");
      carregarQuizzes();
    } catch (error) {
      console.error("Erro ao salvar: ", error);
      alert("❌ Ocorreu um erro ao salvar o quiz.");
    }
  };

  // Excluir Quiz
  const deletarQuiz = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este quiz para sempre?")) {
      try {
        await deleteDoc(doc(db, "quizzes", id));
        carregarQuizzes();
      } catch (error) {
        console.error("Erro ao deletar: ", error);
      }
    }
  };

  // Iniciar o jogo com um quiz específico
  const iniciarQuiz = (quiz: Quiz) => {
    if (!quiz.perguntas || quiz.perguntas.length === 0) {
      alert("Este quiz não tem perguntas cadastradas!");
      return;
    }
    setQuizSelecionado(quiz);
    setIndicePergunta(0);
    setPontos(0);
    setFeedback("");
    setFimDoJogo(false);
    setTelaAtual("jogando");
  };

  // Verificar resposta do aluno
  const responder = (indexOpcao: number) => {
    if (!quizSelecionado) return;
    const perguntaAtual = quizSelecionado.perguntas[indicePergunta];

    if (indexOpcao === perguntaAtual.correta) {
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      setPontos(pontos + 100);
      setFeedback("🎉 UAU! VOCÊ ACERTOU! 🌟");
    } else {
      setAnimarErro(true);
      setTimeout(() => setAnimarErro(false), 500);
      setFeedback("🙈 Ops! Tente na próxima!");
    }

    // Avança para a próxima pergunta ou encerra após 1.5 segundos
    setTimeout(() => {
      setFeedback("");
      if (indicePergunta + 1 < quizSelecionado.perguntas.length) {
        setIndicePergunta(indicePergunta + 1);
      } else {
        setFimDoJogo(true);
      }
    }, 1500);
  };

  return (
    <div style={{
      maxWidth: "800px",
      margin: "0 auto",
      padding: "20px",
      fontFamily: "'Fredoka', sans-serif",
      textAlign: "center"
    }} className={animarErro ? "anim-shake" : ""}>

      {/* ESTILOS INTERNOS RÁPIDOS */}
      <style jsx global>{`
        @keyframes happyBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        @keyframes sadShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
        .anim-shake { animation: sadShake 0.4s ease; }
        .btn-ludico {
          background-color: #8B5CF6; color: white; padding: 15px 20px;
          border: none; border-radius: 16px; cursor: pointer; font-weight: 600;
          width: 100%; margin-bottom: 15px; font-size: 1.2rem;
          box-shadow: 0 6px 0 #7C3AED; transition: all 0.1s;
        }
        .btn-ludico:active { transform: translateY(6px); box-shadow: 0 0 0 transparent; }
        .card-ludico {
          background: #FFFFFF; padding: 30px; border-radius: 24px;
          box-shadow: 0 10px 0 rgba(0, 0, 0, 0.1); border: 4px solid #FFF; margin-bottom: 20px;
        }
      `}</style>

      {/* TELA 1: MENU INICIAL */}
      {telaAtual === "home" && (
        <div className="card-ludico">
          <h1 style={{ color: "#8B5CF6", fontSize: "2.5rem" }}>🌟 EduPlay 🌟</h1>
          <p style={{ fontSize: "1.3rem", color: "#4B5563" }}>Aprender brincando é muito mais legal!</p>
          <div style={{ fontSize: "6rem", margin: "30px 0" }}>🚀</div>
          
          <button className="btn-ludico" style={{ backgroundColor: "#F59E0B", boxShadow: "0 6px 0 #D97706", fontSize: "1.4rem" }} onClick={() => setTelaAtual("selecionar-quiz")}>
            🎮 VOU JOGAR!
          </button>
          
          <button className="btn-ludico" style={{ backgroundColor: "#3B82F6", boxShadow: "0 6px 0 #2563EB" }} onClick={() => setTelaAtual("professor")}>
            👩‍🏫 Área do Professor
          </button>
        </div>
      )}

      {/* TELA 2: ALUNO - SELECIONAR QUIZ */}
      {telaAtual === "selecionar-quiz" && (
        <div className="card-ludico">
          <button className="btn-ludico" style={{ backgroundColor: "#6B7280", boxShadow: "0 6px 0 #4B5563", marginBottom: "20px" }} onClick={() => setTelaAtual("home")}>
            ⬅ Voltar ao Menu
          </button>
          <h2 style={{ color: "#8B5CF6" }}>Escolha um Quiz para Jogar! 🎒</h2>
          
          {carregando ? (
            <p>Buscando os desafios na nuvem...</p>
          ) : quizzes.length === 0 ? (
            <p style={{ color: "#6B7280" }}>Nenhum quiz cadastrado pelo professor ainda.</p>
          ) : (
            quizzes.map((q) => (
              <div key={q.id} style={{ background: "#F3F4F6", padding: "20px", borderRadius: "16px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "3px solid #E5E7EB" }}>
                <h3 style={{ margin: 0, color: "#1F2937", fontSize: "1.2rem" }}>{q.titulo}</h3>
                <button className="btn-ludico" style={{ width: "auto", margin: 0, padding: "10px 20px" }} onClick={() => iniciarQuiz(q)}>
                  ▶ Jogar
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* TELA 3: ALUNO - JOGANDO */}
      {telaAtual === "jogando" && quizSelecionado && (
        <div className="card-ludico">
          {!fimDoJogo ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <span style={{ fontWeight: "bold", color: "#8B5CF6", fontSize: "1.2rem" }}>{quizSelecionado.titulo}</span>
                <span style={{ background: "#FEF3C7", color: "#D97706", padding: "8px 15px", borderRadius: "20px", fontWeight: "bold", border: "2px solid #FDE68A" }}>⭐ {pontos} Pts</span>
              </div>

              <h3 style={{ fontSize: "1.8rem", color: "#1F2937", margin: "30px 0" }}>
                {quizSelecionado.perguntas[indicePergunta].pergunta}
              </h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" }}>
                {quizSelecionado.perguntas[indicePergunta].opcoes.map((opcao, idx) => (
                  <button
                    key={idx}
                    onClick={() => responder(idx)}
                    style={{
                      backgroundColor: "#F9FAFB", color: "#1F2937", border: "4px solid #E5E7EB",
                      padding: "20px", borderRadius: "20px", fontSize: "1.2rem", cursor: "pointer",
                      fontWeight: 600, fontFamily: "'Fredoka', sans-serif"
                    }}
                  >
                    {opcao}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: "25px", fontSize: "1.5rem", fontWeight: "bold", minHeight: "40px" }}>
                {feedback}
              </div>
            </>
          ) : (
            <div>
              <h2 style={{ color: "#8B5CF6", fontSize: "2.5rem" }}>🏆 Fim do Jogo! 🏆</h2>
              <p style={{ fontSize: "1.5rem", color: "#4B5563" }}>Você terminou o desafio com:</p>
              <div style={{ fontSize: "3rem", color: "#D97706", fontWeight: "bold", margin: "20px 0" }}>⭐ {pontos} Pontos!</div>
              
              <button className="btn-ludico" style={{ backgroundColor: "#10B981", boxShadow: "0 6px 0 #059669" }} onClick={() => setTelaAtual("selecionar-quiz")}>
                Jogar Outro Quiz 🎮
              </button>
              <button className="btn-ludico" style={{ backgroundColor: "#6B7280", boxShadow: "0 6px 0 #4B5563" }} onClick={() => setTelaAtual("home")}>
                Voltar ao Menu Inicial 🏠
              </button>
            </div>
          )}
        </div>
      )}

      {/* TELA 4: ÁREA DO PROFESSOR (CRUD) */}
      {telaAtual === "professor" && (
        <div className="card-ludico">
          <button className="btn-ludico" style={{ backgroundColor: "#6B7280", boxShadow: "0 6px 0 #4B5563", marginBottom: "20px" }} onClick={() => setTelaAtual("home")}>
            ⬅ Voltar ao Menu
          </button>
          
          <h2 style={{ color: "#8B5CF6" }}>✏️ Criar Novo Quiz</h2>
          
          <form onSubmit={salvarQuiz} style={{ background: "#F9FAFB", padding: "20px", borderRadius: "20px", border: "4px solid #E5E7EB", textAlign: "left" }}>
            <label style={{ fontWeight: "bold" }}>Título do Quiz:</label>
            <input type="text" value={tituloQuiz} onChange={(e) => setTituloQuiz(e.target.value)} placeholder="Ex: Ciências - Animais" required style={{ width: "100%", padding: "15px", marginBottom: "15px", borderRadius: "10px", border: "2px solid #D1D5DB" }} />

            <h3 style={{ color: "#F59E0B" }}>Pergunta 1</h3>
            <input type="text" value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Digite a pergunta..." required style={{ width: "100%", padding: "15px", marginBottom: "15px", borderRadius: "10px", border: "2px solid #D1D5DB" }} />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "15px" }}>
              {[0, 1, 2, 3].map((index) => (
                <input key={index} type="text" value={opcoes[index]} onChange={(e) => {
                    const novasOpcoes = [...opcoes];
                    novasOpcoes[index] = e.target.value;
                    setOpcoes(novasOpcoes);
                  }} placeholder={`Alternativa ${index + 1}`} required style={{ padding: "10px", borderRadius: "8px", border: "2px solid #D1D5DB" }} />
              ))}
            </div>

            <label style={{ fontWeight: "bold" }}>Qual é a certa?</label>
            <select value={correta} onChange={(e) => setCorreta(e.target.value)} style={{ width: "100%", padding: "15px", marginBottom: "20px", borderRadius: "10px", border: "2px solid #D1D5DB" }}>
              <option value="0">Alternativa 1</option>
              <option value="1">Alternativa 2</option>
              <option value="2">Alternativa 3</option>
              <option value="3">Alternativa 4</option>
            </select>

            <button type="submit" className="btn-ludico" style={{ margin: 0 }}>💾 Salvar no Firebase</button>
          </form>

          <h2 style={{ marginTop: "40px", color: "#8B5CF6" }}>Meus Quizzes Salvos</h2>
          {carregando ? (
            <p>Carregando banco de dados...</p>
          ) : quizzes.length === 0 ? (
            <p style={{ color: "#6B7280" }}>Nenhum quiz encontrado.</p>
          ) : (
            quizzes.map((quiz) => (
              <div key={quiz.id} style={{ background: "#F3F4F6", padding: "15px", borderRadius: "15px", marginBottom: "15px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "3px solid #E5E7EB" }}>
                <h3 style={{ margin: 0, color: "#1F2937", fontSize: "1.2rem" }}>{quiz.titulo}</h3>
                <button onClick={() => deletarQuiz(quiz.id)} style={{ background: "#EF4444", color: "white", border: "none", padding: "10px 15px", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>
                  🗑️ Excluir
                </button>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}