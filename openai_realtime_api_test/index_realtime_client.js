import dotenv from 'dotenv';
dotenv.config();
import { RealtimeClient } from '@openai/realtime-api-beta';
import Speaker from 'speaker';

// 音声再生関連

// PCMデータを再生
function playPcmData(pcmData) {
  const speaker = new Speaker({
    channels: 1,          // モノラル
    bitDepth: 16,         // 16ビット
    sampleRate: 24000,    // サンプリングレート（例: 24000Hz）
  });

  // PCMデータをスピーカーに渡して再生
  speaker.write(Buffer.from(pcmData.buffer));
  speaker.end();
}

//

const client = new RealtimeClient({ apiKey: process.env.OPENAI_API_KEY });

client.updateSession({ instructions: 'You are a great, upbeat friend.'});
client.updateSession({ voice: 'alloy'});
client.updateSession({
  turn_detection: { type: 'none' },
  input_audio_transcription: { model: 'whisper-1'}
});

client.on('conversation.updated', (event) => {
  const { item, delta } = event;
  const items = client.conversation.getItems();
  // console.log(items);

  // 応答のテキストを表示
  items.forEach((item) => {
    if (item.formatted && item.formatted.transcript && item.status === 'completed') {
      console.log(`Assistant: ${item.formatted.transcript}`);
      const pcmData = item.formatted.audio; // Int16ArrayのPCMデータ
      playPcmData(pcmData);
    }
  });
})

await client.connect();

client.sendUserMessageContent([{ type: 'input_text', text: 'How are you?'}]);
