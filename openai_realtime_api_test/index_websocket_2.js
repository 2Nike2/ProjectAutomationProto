import dotenv from 'dotenv';
import WebSocket from 'ws';
import fs from 'fs';
import decodeAudio from 'audio-decode';

dotenv.config();

// 音声関連

// Converts Float32Array of audio data to PCM16 ArrayBuffer
function floatTo16BitPCM(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  let offset = 0;
  for (let i = 0; i < float32Array.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

// Converts a Float32Array to base64-encoded PCM16 data
function base64EncodeAudio(float32Array) {
  const arrayBuffer = floatTo16BitPCM(float32Array);
  let binary = '';
  let bytes = new Uint8Array(arrayBuffer);
  const chunkSize = 0x8000; // 32KB chunk size
  for (let i = 0; i < bytes.length; i += chunkSize) {
    let chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

// Converts an Audio file into an conversation.item.create event
async function audioToItemCreateEvent(audioFile) {
  const audioBuffer = await decodeAudio(audioFile);
  // Realtime API only acceps mono, get one channel only
  const channelData = audioBuffer.getChannelData(0);
  const base64AudioData = base64EncodeAudio(channelData);
  return {
    type: 'conversation.item.create', 
    item: {
      type: 'message',
      role: 'user',

      content: [{
        type: 'input_audio', 
        audio: base64AudioData
      }]
    }
  };
}

// 音声関連

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1"
  }
})

 ws.on("open", function open(){
  console.log("Connected to server.");

  const file = fs.readFileSync('test.mp3');
  const event = audioToItemCreateEvent(file);
  ws.send(JSON.stringify({
    type: 'session.update',
    session: {
      instructions: "日本語の回答をお願いします。"
    }
  }))
  ws.send(JSON.stringify(event));
  ws.send(JSON.stringify({type: 'response.create'}));

});

ws.on("message", function incoming(message){
  const result = JSON.parse(message.toString());
  // itemを含んでいる場合に出力
  if (result.item) {
    if(result.item.status === "completed") {
      console.log(result.item);
    }
  }
});
