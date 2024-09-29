const startButton = document.getElementById('start');
const stopButton = document.getElementById('stop');

let mediaRecorder: MediaRecorder;
let audioChunks: Blob[] = [];

if(startButton){
  startButton.onclick = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true} );
    mediaRecorder = new MediaRecorder(stream);
  
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    }

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      audioChunks = [];

      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');

      fetch('/upload', {
        method: 'POST',
        body: formData,
      })
      .then((response) => response.json())
      .then((data) => { console.log(data);});

    };

    mediaRecorder.start();

  };
} else {
  console.log('startButton element not found');
}

if(stopButton){
  stopButton.onclick = () => {
    mediaRecorder.stop();
  };
}