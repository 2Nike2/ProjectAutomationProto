class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
    }
  
    process(inputs, outputs, parameters) {
      const input = inputs[0];  // 最初のオーディオ入力チャネル
      if (input.length > 0) {
        const audioData = input[0];  // 最初のオーディオバッファ
  
        // WebSocketに送るためにオーディオデータをポート経由で送信
        this.port.postMessage(audioData);
      }
  
      return true;  // trueを返すと、オーディオの処理を続行
    }
  }
  
  registerProcessor('audio-processor', AudioProcessor);
  