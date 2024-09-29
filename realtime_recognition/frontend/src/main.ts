const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');

let mediaRecorder: MediaRecorder;
let socket: WebSocket;

if(startButton){
  startButton.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true} );

    // // AudioContextでサンプルレートを確認
    // const audioContext = new AudioContext();
    // const sampleRate = audioContext.sampleRate;
    // console.log('Sample rate:', sampleRate);

    mediaRecorder = new MediaRecorder(stream);
  
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

    mediaRecorder.ondataavailable = (event) => {
      const audioChunk = event.data;
      
      socket.send(audioChunk);
    }

    mediaRecorder.start(500); // 500 milliseconds

  };
} else {
  console.log('startButton element not found');
};

if(stopButton){
  stopButton.onclick = () => {
    if(mediaRecorder) {
      mediaRecorder.stop();
      console.log('MediaRecorder stopped');
    };

    if(socket && socket.readyState === WebSocket.OPEN){
      socket.close();
    }
  };
} else {
  console.log('stopButton element not found');
};