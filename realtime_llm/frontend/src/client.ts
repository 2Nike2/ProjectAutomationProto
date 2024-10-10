function float32ToInt16(buffer: Float32Array): Int16Array {
  const l = buffer.length;
  const result = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // -1.0〜1.0の範囲のFloat32を16-bit PCMにスケールする
    result[i] = buffer[i] * 0x7FFF;
  }
  return result;
}

const startButton = document.getElementById('start') as HTMLButtonElement;
let ws: WebSocket | null = null;

startButton.addEventListener('click', () => {
  ws = new WebSocket('ws://localhost:3000');

  ws.onopen = () => {
    console.log('WebSocket connection opened');
  };

  ws.onmessage = (event) => {
    console.log(`Received message from server ${event.data}`);
  };

  navigator.mediaDevices.getUserMedia({audio: true})
  .then((stream) => {
    const audioContext = new AudioContext();
    const input = audioContext.createMediaStreamSource(stream);

    audioContext.audioWorklet.addModule('audio-processor.js').then(() => {
      const audioProcessor = new AudioWorkletNode(audioContext, 'audio-processor');

      input.connect(audioProcessor);
      audioProcessor.port.onmessage = (event) => {
        if(ws && ws.readyState ===  WebSocket.OPEN) {
          const audioData = event.data as Float32Array;
          const int16Data = float32ToInt16(audioData);
          ws.send(int16Data.buffer);
        }
      }
    });
    
  })
  .catch((err) => {
    console.error('Error accessing microphone', err);
  });

})