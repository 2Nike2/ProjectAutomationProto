import fs from 'fs';
import WebSocket from 'ws';
import decodeAudio from 'audio-decode';

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

const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
const ws = new WebSocket(url, {
  headers: {
    "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
    "OpenAI-Beta": "realtime=v1"
  }
});

ws.on('open', async () => {

  ws.send(JSON.stringify({
    type: "session.update",
    "session": {
      "instructions": " 日本語でやりとりしてください。"
    }
  }));

  // const files = ['question_2.mp3'];
  // const files = ['「初めまして」.mp3'];
  const files = ['422388075336277.mp3'];
  for (const filename of files){
    const myAudio = fs.readFileSync(filename);
    const audioBuffer = await decodeAudio(myAudio)
    const channelData = audioBuffer.getChannelData(0);
    const base64AudioData = base64EncodeAudio(channelData);
    ws.send(JSON.stringify({
      type: 'input_audio_buffer.append',
      audio: base64AudioData
    }));
    
  }

});


ws.on("message", (message) => {
  const event = JSON.parse(message.toString())
  // console.log(event);
  console.log(event["type"]);

  if(event['type'] === 'conversation.item.created'){
    console.log(event['item']['content'])
  }
  if(event["type"] === 'response.done' && event["response"]["status"] == 'completed'){
    console.log(event['response']['output'][0]['content'][0]['transcript'])
  }

});
