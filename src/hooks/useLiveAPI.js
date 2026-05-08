import { useState, useEffect, useRef, useCallback } from 'react';
import { floatTo16BitPCM, arrayBufferToBase64, base64ToArrayBuffer } from '../lib/pcm';

const HOST = 'generativelanguage.googleapis.com';
const MODEL = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

export function useLiveAPI() {
  const [connected, setConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [volume, setVolume] = useState(0);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const processorRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  
  // Callbacks for UI updates
  const onTextReceivedRef = useRef(null);
  const onToolCallRef = useRef(null);
  const onTurnCompleteRef = useRef(null);

  const setOnTextReceived = (cb) => { onTextReceivedRef.current = cb; };
  const setOnToolCall = (cb) => { onToolCallRef.current = cb; };
  const setOnTurnComplete = (cb) => { onTurnCompleteRef.current = cb; };

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setConnected(false);
    setIsRecording(false);
    setVolume(0);
  }, []);

  const connect = useCallback(async () => {
    try {
      // 1. Fetch API Key
      const res = await fetch('/api/gemini-token');
      const { token } = await res.json();
      
      if (!token || token === 'dummy_key') {
        alert('API kaliti topilmadi. Iltimos admin orqali sozlang.');
        return;
      }

      // 2. Setup Audio Context
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      // 3. Setup WebSocket
      const wsUrl = `wss://${HOST}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        // Setup Session Config
        const setupMessage = {
          setup: {
            model: MODEL,
            systemInstruction: {
              parts: [{
                text: `Sen Farg'ona Davlat Texnika Universiteti (FDTU) uchun maxsus yaratilgan ovozli yordamchisan. 
Sening vazifang faqatgina shu universitet, uning yo'nalishlari, qabul jarayonlari va talabalar hayoti bo'yicha yordam berish.
Javoblaring qisqa, xushmuomala va og'zaki nutqqa mos bo'lsin.
Agar kerak bo'lsa, show_links funksiyasini chaqirib ekranda muhim havolalarni ko'rsat.
Faqat FDTU ga oid savollarga javob ber.
MUHIM QOIDALAR:
1. Sen doimo va faqatgina O'ZBEK TILIDA (Uzbek language) gapirishing SHART. 
2. Inglizcha yoki ruscha so'zlarni ishlatma, salomlashishda doim "Salom" deb boshla.`
              }]
            },
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede" // friendly voice
                  }
                }
              }
            },
            tools: [{
              functionDeclarations: [
                {
                  name: "show_links",
                  description: "Ekranda universitetga oid foydali saytlar havolalarini ko'rsatadi.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      links: {
                        type: "ARRAY",
                        description: "Havolalar ro'yxati",
                        items: {
                          type: "OBJECT",
                          properties: {
                            title: { type: "STRING" },
                            url: { type: "STRING" },
                            description: { type: "STRING" }
                          },
                          required: ["title", "url", "description"]
                        }
                      }
                    },
                    required: ["links"]
                  }
                }
              ]
            }]
          }
        };
        ws.send(JSON.stringify(setupMessage));

        // Start Microphone after setup
        startMicrophone();
        
        // Send initial greeting prompt hidden from UI to force model to start in Uzbek
        setTimeout(() => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              clientContent: {
                turns: [{ role: "user", parts: [{ text: "Salom, tizimga ulandim. Menga qisqacha o'zbek tilida salom ber va tanishtir." }] }],
                turnComplete: true
              }
            }));
          }
        }, 500);
      };

      ws.onmessage = async (event) => {
        if (event.data instanceof Blob) {
           const text = await event.data.text();
           handleServerMessage(JSON.parse(text));
        } else {
           handleServerMessage(JSON.parse(event.data));
        }
      };

      ws.onclose = () => {
        disconnect();
      };

      ws.onerror = (e) => {
        console.error('WebSocket error:', e);
        disconnect();
      };

    } catch (e) {
      console.error('Connection failed', e);
      disconnect();
    }
  }, [disconnect]);

  const handleServerMessage = (msg) => {
    // 1. Handle Audio & Text
    if (msg.serverContent && msg.serverContent.modelTurn) {
      const parts = msg.serverContent.modelTurn.parts;
      parts.forEach(part => {
        if (part.text && onTextReceivedRef.current) {
          onTextReceivedRef.current(part.text);
        }
        if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
          playAudioChunk(part.inlineData.data);
        }
      });
      
      if (msg.serverContent.turnComplete && onTurnCompleteRef.current) {
        onTurnCompleteRef.current();
      }
    }
    
    // 2. Handle Function Calls
    if (msg.toolCall && onToolCallRef.current) {
      const call = msg.toolCall.functionCalls[0];
      if (call.name === 'show_links') {
        onToolCallRef.current(call.args.links);
        
        // Send function response back
        if (wsRef.current) {
          wsRef.current.send(JSON.stringify({
            toolResponse: {
              functionResponses: [{
                id: call.id,
                name: call.name,
                response: { result: "ok" }
              }]
            }
          }));
        }
      }
    }
  };

  const playAudioChunk = (base64Audio) => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    // Gemini live API output is 24000Hz PCM 16-bit
    const arrayBuffer = base64ToArrayBuffer(base64Audio);
    const int16Array = new Int16Array(arrayBuffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    // Schedule sequentially
    const currentTime = audioCtx.currentTime;
    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }
    source.start(nextPlayTimeRef.current);
    nextPlayTimeRef.current += audioBuffer.duration;
  };

  const startMicrophone = async () => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000
        } 
      });
      mediaStreamRef.current = stream;
      
      const source = audioCtx.createMediaStreamSource(stream);
      // Deprecated but works everywhere without needing extra Worklet files
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Calculate volume for UI
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
        setVolume(Math.sqrt(sum / inputData.length));

        // Convert to 16bit PCM and send to Gemini
        const pcmBuffer = floatTo16BitPCM(inputData);
        const base64Data = arrayBufferToBase64(pcmBuffer);

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              mediaChunks: [{
                mimeType: "audio/pcm;rate=16000",
                data: base64Data
              }]
            }
          }));
        }
      };

      source.connect(processor);
      processor.connect(audioCtx.destination); // Required to make it process
      setIsRecording(true);
    } catch (e) {
      console.error("Microphone access failed", e);
    }
  };

  const sendTextMessage = (text) => {
     if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{ text }]
                }],
                turnComplete: true
            }
        }));
     }
  };

  return {
    connected,
    isRecording,
    volume,
    connect,
    disconnect,
    setOnTextReceived,
    setOnToolCall,
    setOnTurnComplete,
    sendTextMessage
  };
}
