import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { message, history } = await req.json();

    // In a real app, you would fetch the API key from the database for the admin settings.
    // For now, we fall back to the environment variable.
    const apiKey = process.env.GEMINI_API_KEY || "dummy_key";
    
    if (apiKey === "dummy_key") {
      return new Response(JSON.stringify({ 
        text: "Kechirasiz, Gemini API kaliti o'rnatilmagan. Admin paneldan kalitni kiriting.",
        links: []
      }), { status: 200 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemPrompt = `
Sen Farg'ona Davlat Texnika Universiteti (FDTU) uchun maxsus yaratilgan ovozli yordamchisan.
Sening vazifang faqatgina shu universitet, uning yo'nalishlari, qabul jarayonlari, talabalar hayoti va universitetga aloqador mavzularda yordam berish, maslahatlar va takliflar berish.
Agar foydalanuvchi universitetga umuman aloqasi bo'lmagan (tematikaga oid bo'lmagan) savol bersa, muloyimlik bilan faqat FDTU bo'yicha yordam bera olishingni aytib, javob berishni rad et.

Shuningdek, javoblaringda kerakli joylarda maxsus havolalarni (linklarni) JSON formatida taqdim etishing kerak. Buning uchun agar javobingda biron rasmiy sahifa haqida gapirsang, javob oxirida quyidagi kabi JSON array qo'sh:
[LINKS_START]
[
  {"title": "Qabul komissiyasi", "url": "https://qabul.fdtu.uz", "description": "Hujjat topshirish va ro'yxatdan o'tish uchun"}
]
[LINKS_END]

Javobing qisqa, tushunarli va og'zaki nutqqa mos bo'lishi kerak.
`;

    // Format history for Gemini
    const formattedHistory = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "System prompt: " + systemPrompt }] },
        { role: "model", parts: [{ text: "Tushundim. Farg'ona Davlat Texnika Universiteti haqida savollaringizga javob berishga tayyorman." }] },
        ...formattedHistory
      ],
    });

    const result = await chat.sendMessage(message);
    let responseText = result.response.text();
    let links = [];

    // Extract links if any
    const linksMatch = responseText.match(/\[LINKS_START\]([\s\S]*?)\[LINKS_END\]/);
    if (linksMatch && linksMatch[1]) {
      try {
        links = JSON.parse(linksMatch[1]);
        responseText = responseText.replace(linksMatch[0], '').trim();
      } catch (e) {
        console.error("Failed to parse links from Gemini response", e);
      }
    }

    return new Response(JSON.stringify({ text: responseText, links }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
