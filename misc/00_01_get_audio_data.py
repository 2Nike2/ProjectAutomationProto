"""Simple Recording Application using PyAudio."""

import tkinter as tk
import wave

import pyaudio

# Recoding Parameters
FORMAT = pyaudio.paInt16  # 16-bit resolution
CHANNELS = 1  # Monaural
RATE = 44100  # 44.1kHz
CHUNK = 1024
RECORD_SECONDS = 5  # Unit: seconds
OUTPUT_FILENAME = "output.wav"


class RecorderApp:
    """Simple GUI Recording Application."""

    def __init__(self, root):
        """Initialize the RecorderApp instance."""
        self.root = root
        self.root.title("Recorder")

        self.is_recording = False
        self.frames = []

        self.label = tk.Label(root, text="Recording App")
        self.label.pack(pady=10)

        self.record_button = tk.Button(
            root, text="Record", command=self.start_recording
        )
        self.record_button.pack(pady=10)

        self.stop_button = tk.Button(
            root, text="Stop", command=self.stop_recording, state=tk.DISABLED
        )
        self.stop_button.pack(pady=10)

        self.pyaudio_instance = pyaudio.PyAudio()
        self.record_audio()

    def start_recording(self):
        """Start recording."""
        self.record_button.config(state=tk.DISABLED)
        self.stop_button.config(state=tk.NORMAL)
        self.is_recording = True
        self.frames = []
        self.stream = self.pyaudio_instance.open(
            format=FORMAT,
            channels=CHANNELS,
            rate=RATE,
            input=True,
            frames_per_buffer=CHUNK,
        )
        self.record_audio()

    def record_audio(self):
        """Record audio in chunks."""
        if self.is_recording:
            data = self.stream.read(CHUNK)
            self.frames.append(data)
            self.root.after(10, self.record_audio)

    def stop_recording(self):
        """Stop recording."""
        self.record_button.config(state=tk.NORMAL)
        self.stop_button.config(state=tk.DISABLED)
        self.is_recording = False
        self.stream.stop_stream()
        self.stream.close()
        self.save_recording()

    def save_recording(self):
        """Save the recorded audio data to a wav file."""
        wf = wave.open(OUTPUT_FILENAME, "wb")
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(self.pyaudio_instance.get_sample_size(FORMAT))
        wf.setframerate(RATE)
        wf.writeframes(b"".join(self.frames))
        wf.close()

    def __del__(self):
        """Clean up the PyAudio instance."""
        self.pyaudio_instance.terminate()


if __name__ == "__main__":
    root = tk.Tk()
    app = RecorderApp(root)
    root.mainloop()
