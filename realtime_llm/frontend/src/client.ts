async function resampleAudioBuffer(audioContext: AudioContext, audioData: Float32Array, targetSampleRate: number) {
  const originalSampleRate = audioContext.sampleRate;
  const audioBuffer = audioContext.createBuffer(1, audioData.length, originalSampleRate);
  audioBuffer.getChannelData(0).set(audioData);

  const offlineContext = new OfflineAudioContext(1, audioBuffer.duration * targetSampleRate, targetSampleRate);
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineContext.destination);
  source.start(0);

  const renderedBuffer = await offlineContext.startRendering();
  return renderedBuffer.getChannelData(0);
}

function float32ToInt16(buffer: Float32Array): Int16Array {
  const l = buffer.length;
  const result = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // -1.0〜1.0の範囲のFloat32を16-bit PCMにスケールする
    result[i] = buffer[i] * 0x7FFF;
  }
  return result;
}

// KrokiサーバのAPIでPlantUMLコードをSVG画像に変換する。
const imageDiv = document.getElementById('image-div') as HTMLDivElement;
function convertPlantUMLToSVG(plantUMLCode: string) {

  console.log('start convertPlantUMLToSVG');

  fetch('http://localhost:8000/', {
    method: 'POST',
    body: JSON.stringify({
      "diagram_source": plantUMLCode,
      "diagram_type": "plantuml",
      "output_format": "svg"
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then((response) => {
    if (!response.ok) {
      throw new Error('Failed to convert PlantUML to SVG');
    }
    console.log('success');
    return response.text();

  }).then((svgData) => {
    console.log('svgData:', svgData);
    const cleanedSvgData = svgData.replace(/<\?xml.*?\?>/, '');
    console.log('cleanedSvgData:', cleanedSvgData);
    imageDiv.innerHTML = svgData;
  });
}

const startButton = document.getElementById('start') as HTMLButtonElement;
let ws: WebSocket | null = null;

const responseDiv = document.getElementById('response-div') as HTMLDivElement;

startButton.addEventListener('click', () => {
  ws = new WebSocket('ws://localhost:3000');

  ws.onopen = () => {
    console.log('WebSocket connection opened');
  };

  ws.onmessage = (event) => {
    console.log(`Received message from server: ${event.data}`);
    const message  = event.data;
    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    responseDiv.appendChild(messageDiv);
    convertPlantUMLToSVG(message);
  };

  navigator.mediaDevices.getUserMedia({audio: true})
  .then((stream) => {
    const audioContext = new AudioContext();
    const input = audioContext.createMediaStreamSource(stream);

    audioContext.audioWorklet.addModule('audio-processor.js').then(() => {
      const audioProcessor = new AudioWorkletNode(audioContext, 'audio-processor');

      input.connect(audioProcessor);
      audioProcessor.port.onmessage = async (event) => {
        if(ws && ws.readyState ===  WebSocket.OPEN) {
          const audioData = event.data as Float32Array;

          // サンプリングレートを変換
          const resampledData = await resampleAudioBuffer(audioContext, audioData, 24000);

          const int16Data = float32ToInt16(resampledData);
          ws.send(int16Data.buffer);
        }
      }
    });
    
  })
  .catch((err) => {
    console.error('Error accessing microphone', err);
  });

});

const stopButton = document.getElementById('stop') as HTMLButtonElement;
stopButton.addEventListener('click', () => {
  console.log('WebSocket connection closed');
  ws?.close();
});