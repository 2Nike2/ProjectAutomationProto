import express from 'express';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { createServer } from 'http';

// Converts an Int16Array (16-bit PCM) to base64-encoded string
function base64EncodeAudio(int16Array: Int16Array) {
  // Int16ArrayからUint8Arrayに変換
  const uint8Array = new Uint8Array(int16Array.buffer);

  let binary = '';
  const chunkSize = 0x8000; // 32KB chunk size
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    let chunk = uint8Array.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, [...chunk]);
  }
  return btoa(binary);
}

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const openai_realtime_url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";

wss.on('connection', (ws) => {
  console.log('Client connected');

  // 予めOpenAIのRealtime APIとの接続を確立する。
  const openai_ws = new WebSocket(openai_realtime_url, {
    headers: {
      "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
      "OpenAI-Beta": "realtime=v1"
    }
  });
  openai_ws.on('open', async () => {
    openai_ws.send(JSON.stringify({
      type: "session.update",
      "session": {
        "instructions": " 日本語でやりとりしてください。"
      }
    }));
  });

  let audioBuffer: number[] = []; // 音声データの一時的なバッファ
  const BUFFER_SIZE_THRESHOLD = 128000; // 128,000サンプルを閾値に設定（例）

  ws.on('message', (message) => {

    if (Buffer.isBuffer(message)) {
      // Bufferを使ってデータを扱う
      const int16Array = new Int16Array(message.buffer, message.byteOffset, message.length / 2);
  
      audioBuffer.push(...int16Array);

      // バッファが閾値に達したら送信
      if (audioBuffer.length >= BUFFER_SIZE_THRESHOLD) {
        const combinedBuffer = new Int16Array(audioBuffer);
        const base64AudioData = base64EncodeAudio(combinedBuffer);

        // OpenAI APIに送信
        openai_ws.send(JSON.stringify({
          type: 'input_audio_buffer.append',
          audio: base64AudioData
        }));
        console.log('Sent audio data');

        audioBuffer = [];
      }
    }

  });

  openai_ws.on("message", (message) => {

    const event = JSON.parse(message.toString())
    // console.log(event["type"]);
  
    // if(event['type'] === 'conversation.item.created'){
    //   console.log(event['item']['content'])
    // }
    if(event["type"] === 'response.done' && event["response"]["status"] == 'completed'){
      console.log(event['response']['output'][0]['content'][0]['transcript'])
    }
  
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

app.use(express.static('public'));

server.listen(3000, () => {
  console.log('Server is listening on port 3000');
});