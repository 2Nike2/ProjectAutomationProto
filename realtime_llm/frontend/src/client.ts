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
          ws.send(event.data)
        }
      }
    });
    
  })
  .catch((err) => {
    console.error('Error accessing microphone', err);
  });

})