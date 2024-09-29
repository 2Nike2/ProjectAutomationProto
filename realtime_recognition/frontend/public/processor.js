class PCMProcessor extends AudioWorkletProcessor {
  process(inputs, outputs, parameters) {
    const input = inputs[0];  // 入力オーディオデータ
    if (input.length > 0) {
      const channelData = input[0];  // モノラル音声データを取得
      this.port.postMessage(channelData);  // PCMデータをメインスレッドに送信
    }
    return true;  // 継続して処理を行う
  }
}

registerProcessor('pcm-processor', PCMProcessor);
