import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { tema } = await request.json();

    const prompt = `Crie um quiz educacional lúdico e divertido para crianças do ensino fundamental sobre o seguinte tema: "${tema}".
    Retorne APENAS um objeto JSON válido (sem markdown, sem crases, sem texto adicional) com a seguinte estrutura exata:
    {
      "title": "Título criativo e divertido para o quiz",
      "questions": [
        {
          "question": "Texto da pergunta?",
          "options": ["Opção A", "Opção B", "Opção C", "Opção D"],
          "correct": 0,
          "isBonus": false
        }
      ]
    }
    Gere entre 3 e 5 perguntas apropriadas para a idade. O campo 'correct' deve ser um número de 0 a 3 indicando o índice da resposta correta.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const quizGerado = JSON.parse(completion.choices[0].message.content || "{}");
    return NextResponse.json(quizGerado);
  } catch (error) {
    console.error("Erro ao gerar quiz com IA:", error);
    return NextResponse.json({ error: "Erro ao gerar perguntas" }, { status: 500 });
  }
}