"""Check OpenAI Speech Recognition API."""

import os

import openai

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = openai.OpenAI()

audio_file = open("output.wav", "rb")
transcription = client.audio.transcriptions.create(
    model="whisper-1",
    file=audio_file,
    language="ja",
)

print(transcription)
