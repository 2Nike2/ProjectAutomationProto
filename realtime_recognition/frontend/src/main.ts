const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');
const changeSystemPromptButton = document.getElementById('changeSystemPromptButton');

let audioContext: AudioContext;
let socket: WebSocket;
let workletNode: AudioWorkletNode;

type VoiceDict = {
  [key: string]: { speakerUuid: string; styleId: number };
};
const voiceDict: VoiceDict = {
  kanae_1: {speakerUuid: 'd41bcbd9-f4a9-4e10-b000-7a431568dd01', styleId: 100},
  kanae_4: {speakerUuid: 'd41bcbd9-f4a9-4e10-b000-7a431568dd01', styleId: 102},
  kanae_5: {speakerUuid: 'd41bcbd9-f4a9-4e10-b000-7a431568dd01', styleId: 104},
  ririn_1: {speakerUuid: 'cb11bdbd-78fc-4f16-b528-a400bae1782d', styleId: 90},
  ririn_2: {speakerUuid: 'cb11bdbd-78fc-4f16-b528-a400bae1782d', styleId: 91},
  ririn_3: {speakerUuid: 'cb11bdbd-78fc-4f16-b528-a400bae1782d', styleId: 92},
  crois_1: {speakerUuid: 'cc1153b4-d20c-46dd-a308-73ca38c0e85a', styleId: 110},  
  crois_2: {speakerUuid: 'cc1153b4-d20c-46dd-a308-73ca38c0e85a', styleId: 111},  
  crois_4: {speakerUuid: 'cc1153b4-d20c-46dd-a308-73ca38c0e85a', styleId: 113},  
}

if(startButton){

  startButton.onclick = async () => {

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true} );

      // マイクのストリームが正しく取得されたか確認
      if (!stream) {
        throw new Error("Failed to get audio stream");
      }

      audioContext = new AudioContext();
      console.log("AudioContext state:", audioContext.state);  // AudioContextの状態を確認
  
      // AudioContextがサスペンド状態の場合は再開
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
        console.log("AudioContext resumed");
      }

      // AudioContextでサンプルレートを確認
      // const sampleRate = audioContext.sampleRate;
      // console.log('Sample rate:', sampleRate);
  
      await audioContext.audioWorklet.addModule('/processor.js');
      console.log("AudioWorklet module loaded");
  
      // AudioWorkletNodeを作成
      workletNode = new AudioWorkletNode(audioContext, 'pcm-processor');
      console.log("AudioWorkletNode created");

      const audioSource = audioContext.createMediaStreamSource(stream);
      audioSource.connect(workletNode);
      console.log("MediaStreamSource connected to AudioWorkletNode");

      workletNode.connect(audioContext.destination);
      console.log("AudioWorkletNode connected to destination");
    
      socket = new WebSocket('ws://127.0.0.1:8000/ws/audio-stream/');
      socket.binaryType = 'arraybuffer';
  
      socket.onopen = () => {
        console.log('WebSocket connection established');
      }
  
      socket.onmessage = (event) => {
  
        console.log('Transcription result:', event.data);
  
        const resultDiv = document.getElementById('result');
        if(resultDiv){
          const responseJson = JSON.parse(event.data);
          const role = responseJson['role'];
          const message = responseJson['content'][0]['text'];
          const messageDiv = document.createElement('div') as HTMLDivElement;
          messageDiv.textContent = message;
          if(role == 'assistant'){
            messageDiv.style.color = 'deeppink';
            messageDiv.style.border = 'solid 1px deeppink';
          } else {
            messageDiv.style.color = 'forestgreen';
            messageDiv.style.border = 'solid 1px forestgreen';
          }
          messageDiv.style.fontWeight = 'bold';
          messageDiv.style.borderRadius = '5px';
          messageDiv.style.padding = '5px';
          messageDiv.style.margin = '5px';

          resultDiv.appendChild(messageDiv);

          // 音声合成による音声再生
          console.log(message);
          if(role == 'assistant' && !message.includes('NoResponseNeeded')){
            
            // ボイス種類の決定
            const voiceSelect = document.getElementById('voice') as HTMLSelectElement; 
            const voice = voiceSelect.value;            

            const requestBody = {
              "speakerUuid": voiceDict[voice]['speakerUuid'],
              "styleId": voiceDict[voice]['styleId'],
              "text": message,
              "speedScale": 1.0,
              "volumeScale": 1.0,
              "prosodyDetail": [],
              "pitchScale": 0.0,
              "intonationScale": 1.0,
              "prePhonemeLength": 0.1,
              "postPhonemeLength": 0.5,
              "outputSamplingRate": 24000,
            };

            fetch('http://127.0.0.1:50032/v1/synthesis', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody)
            }).then((response) => {
              // wavファイルの再生
              return response.blob();
            }).then((blob) => {
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audio.muted = true;
              audio.play().then(() => {
                audio.muted = false;
              });
            });
          }

        }
      };
  
      socket.onerror = (error) => {
        console.log('WebSocket error:', error);
      }
  
      socket.onclose = () => {
        console.log('WebSocket connection closed');
      };
  
      // AudioWorkletからPCMデータを受け取ってWebSocketで送信
      workletNode.port.onmessage = (event) => {
        const float32Array = event.data;
        const int16Array = float32ToInt16(float32Array);  // PCM形式に変換
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(int16Array);  // PCMデータをWebSocketで送信
        }
      };
  
    } catch (error) {
      console.error("Error during setup:", error);  // エラーを表示してデバッグ
    }

  };
} else {
  console.log('startButton element not found');
};

if (stopButton) {
  stopButton.onclick = () => {
    if (audioContext) {
      audioContext.close();
      console.log('AudioContext closed');
    }

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.close();
    }
  };
} else {
  console.log('stopButton element not found');
}

if (changeSystemPromptButton) {
  changeSystemPromptButton.onclick = () => {

    const systemPrompt = document.getElementById('systemPrompt') as HTMLInputElement;

    fetch('http://127.0.0.1:8000/change-system-prompt', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({system_prompt: systemPrompt.value})
    }).then((response) => {
      console.log(response);
    });
  }
}

// Float32ArrayをPCMのInt16Arrayに変換する関数
function float32ToInt16(buffer: Float32Array): Int16Array {
  let l = buffer.length;
  const pcmData = new Int16Array(l);
  while (l--) {
    pcmData[l] = Math.min(1, buffer[l]) * 0x7FFF;  // 16ビットPCMに変換
  }
  return pcmData;
}
