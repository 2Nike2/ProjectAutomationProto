const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');

let audioContext: AudioContext;
let socket: WebSocket;
let workletNode: AudioWorkletNode;

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
  
      await audioContext.audioWorklet.addModule('/static/processor.js');
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
          resultDiv.innerHTML += event.data + '\n';
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

// Float32ArrayをPCMのInt16Arrayに変換する関数
function float32ToInt16(buffer: Float32Array): Int16Array {
  let l = buffer.length;
  const pcmData = new Int16Array(l);
  while (l--) {
    pcmData[l] = Math.min(1, buffer[l]) * 0x7FFF;  // 16ビットPCMに変換
  }
  return pcmData;
}
