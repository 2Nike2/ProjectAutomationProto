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
        "instructions": " 日本語でやりとりしてください。",
        "input_audio_transcription": { // この設定で入力音声の文字起こしの確認もしたいができない?また公式で記述のあった、enabled属性がない
          "model": "whisper-1"
        },
      }
    }));
  });

  let audioBuffer: number[] = []; // 音声データの一時的なバッファ
  const BUFFER_SIZE_THRESHOLD = 16000; // 16,000サンプルを閾値に設定（例）

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
    console.log(event["type"]);
  
    // if(event['type'] === 'conversation.item.created'){
    //   console.log(event['item']['content'])
    // }
    if(event['type'] === 'error'){
      console.log(event)
    }

    // 各種 Server event 確認
    // セッション関連
    // if(event["type"] === 'session.created'){
    //   console.log(event)
    // }
    // if(event["type"] === 'session.updated'){
    //   console.log(event)
    // }

    // 入力音声認識関連
    // VAD(Voice Activity Detection)の場合
    // 1. input_audio_buffer.speech_started : 音声開始検出
    // 2. input_audio_buffer.speech_stopped : 音声終了検出
    // 3. input_audio_buffer.speech_comited : 音声部分確定
    // if(event["type"] === 'input_audio_buffer.speech_started'){
    //   console.log(event)
    // }
    // if(event["type"] === 'input_audio_buffer.speech_stopped'){
    //   console.log(event)
    // }
    // if(event["type"] === 'input_audio_buffer.committed'){
    //   console.log(event)
    // }

    // 会話データ関連
    // if(event["type"] === 'conversation.item.created'){
    //   // console.log(event)
    //   console.log(event['item']['content']) // ここで入力音声の文字起こしの結果を見たいけど上手くいかない?
    // }

    // // 応答関連
    // if(event["type"] === 'response.created'){ // 最初の"in_progress"の応答が作成されたときに返ってくる、つまり応答の開始?
    //   console.log(event)
    // }

    // // 応答アイテム関連
    // if(event["type"] === 'response.output_item.added'){
    //   console.log(event)
    // }
    // if(event["type"] === 'response.output_item.done'){
    //   // console.log(event)
    //   console.log(event['item']['content'][0]['transcript']) // ここで出力文字列を取ることも可能
    // }

    // // 応答コンテンツ部分関連
    // if(event["type"] === 'response.content_part.added'){
    //   console.log(event)
    // }
    // if(event["type"] === 'response.content_part.done'){
    //   // console.log(event)
    //   console.log(event['part']['transcript'])
    // }

    // 応答文字起こし関連
    // if(event["type"] === 'response.audio_transcript.delta'){ // 数文字程度で部分的に逐次出力される
    //   console.log(event)
    // }
    // if(event["type"] === 'response.audio_transcript.done'){
    //   // console.log(event)
    //   console.log(event['transcript']) // ここで出力文字列を取ることも可能
    // }
    
    // 応答音声関連
    // if(event["type"] === 'response.audio.delta'){ // 音声断片が部分的に逐次出力される
    //   // console.log(event) // deltaの表示が煩雑になるのでコメントアウト推奨
    // }
    // if(event["type"] === 'response.audio.done'){
    //   console.log(event)
    // }

    if(event["type"] === 'response.done' && event["response"]["status"] == 'completed'){
      const response_transcript = event['response']['output'][0]['content'][0]['transcript'] 
      console.log(response_transcript)
      ws.send(response_transcript);
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