"""Check AWS Transcribe API."""

import os
import time

import boto3
from dotenv import load_dotenv

load_dotenv()
BUCKET_NAME = os.getenv("BUCKET_NAME")


def transcribe_file(job_name, file_uri, transcribe_client: boto3.client):
    """Transcrible file."""
    transcribe_client.start_transcription_job(
        TranscriptionJobName=job_name,
        Media={"MediaFileUri": file_uri},
        MediaFormat="wav",
        LanguageCode="ja-JP",
    )

    max_tries = 60
    while max_tries > 0:
        max_tries -= 1
        job = transcribe_client.get_transcription_job(TranscriptionJobName=job_name)
        job_status = job["TranscriptionJob"]["TranscriptionJobStatus"]
        if job_status in ["COMPLETED", "FAILED"]:
            print(f"Job {job_name} is {job_status}.")
            if job_status == "COMPLETED":
                transcript_uri = job["TranscriptionJob"]["Transcript"][
                    "TranscriptFileUri"
                ]
                print(f"Transcript: S3 URI {transcript_uri}")
                break
            else:
                print(f"Reason: {job['TranscriptionJob']['FailureReason']}")
                break
        else:
            print(f"Job {job_name} is {job_status}.")
            time.sleep(10)


def main():
    """Process main."""
    transcribe_client = boto3.client("transcribe")
    file_uri = f"s3://{BUCKET_NAME}/example.wav"
    transcribe_file("example_job", file_uri, transcribe_client)


if __name__ == "__main__":
    main()
