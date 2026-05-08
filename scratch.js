import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

async function testAudio() {
    try {
        const genAI = new GoogleGenerativeAI("AIzaSyBdzKiiXqj1lqHho-4oWaZ9K818LCRULag");
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); 
        
        const result = await model.generateContent({
            contents: [{ role: "user", parts: [{ text: "Salom, qandaysiz?" }] }],
            // Try passing generationConfig
            generationConfig: {
                responseModalities: ["AUDIO"]
            }
        });
        console.log("Text response:", result.response.text());
        
        const parts = result.response.candidates[0].content.parts;
        const audioPart = parts.find(p => p.inlineData && p.inlineData.mimeType.startsWith("audio"));
        if (audioPart) {
            console.log("Got audio!", audioPart.inlineData.mimeType);
            fs.writeFileSync("output.wav", Buffer.from(audioPart.inlineData.data, "base64"));
            console.log("Saved to output.wav");
        } else {
            console.log("No audio received.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
testAudio();
