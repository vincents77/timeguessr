import json
import os
from pathlib import Path
import openai
import requests
import subprocess
import base64  # 👈 Needed to decode Base64
from dotenv import load_dotenv

# --- Setup
load_dotenv(dotenv_path=Path(__file__).resolve().parent.parent.parent / ".env")
openai.api_key = os.getenv("VITE_OPENAI_API_KEY")

if not openai.api_key:
    raise ValueError("❌ Missing OpenAI API Key.")

# --- Paths
PENDING_EVENTS_PATH = Path("src/data/pending_events.json")
PROCESSED_EVENTS_PATH = Path("src/data/processed_events.json")
IMAGES_DIR = Path("public/images")

IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# --- Helper functions

def generate_timeguessr_image(prompt, slug):
    headers = {
        "Authorization": f"Bearer {openai.api_key}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "gpt-image-1",
        "prompt": prompt,
        "moderation": "low",
        "n": 1,
        "output_format": "jpeg",
        "quality": "high",
        "size": "1024x1024"
    }

    response = requests.post(
        "https://api.openai.com/v1/images/generations",
        headers=headers,
        json=payload
    )

    if response.status_code != 200:
        raise Exception(f"❌ OpenAI API error: {response.json()}")

    data = response.json()

    image_data = data.get("data", [{}])[0]

    if not image_data or not image_data.get("b64_json"):
        reason = data.get("error", {}).get("message", "Unknown - no image generated")
        raise Exception(f"❌ No image generated. Reason: {reason}")

    print(f"✅ Base64 image received (length: {len(image_data['b64_json'])} characters)")

    # Save the image
    b64_content = image_data["b64_json"]
    image_path = IMAGES_DIR / f"{slug}.jpg"
    with open(image_path, "wb") as f:
        f.write(base64.b64decode(b64_content))

    print(f"✅ Saved image: {image_path}")
    return str(image_path)

def load_json(file_path):
    if file_path.exists():
        with open(file_path, "r") as f:
            return json.load(f)
    else:
        return []

def save_json(data, file_path):
    with open(file_path, "w") as f:
        json.dump(data, f, indent=2)

# --- Main process

def main():
    pending_events = load_json(PENDING_EVENTS_PATH)
    processed_events = load_json(PROCESSED_EVENTS_PATH)

    updated_pending = []

    for event in pending_events:
        try:
            print(f"🎨 Generating image for: {event['title']}")
            # FIX: Pass both prompt AND slug
            generate_timeguessr_image(event["prompt"], event["slug"])

            # ✅ Success → move to processed
            processed_events.append(event)

        except Exception as e:
            print(f"❌ Error processing {event['title']}: {e}")
            updated_pending.append(event)  # Keep unprocessed event

    # Save updated files
    save_json(updated_pending, PENDING_EVENTS_PATH)
    save_json(processed_events, PROCESSED_EVENTS_PATH)

    print("✅ All done!")

def git_commit_and_push():
    from datetime import datetime

    try:
        print("📂 Git: Staging all changes...")
        subprocess.run(["git", "add", "."], check=True)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        commit_message = f"Auto: Add new event images and metadata ({timestamp})"

        print(f"✍️ Git: Committing with message: {commit_message}")
        subprocess.run(["git", "commit", "-m", commit_message], check=True)

        print("🚀 Git: Pushing to remote...")
        subprocess.run(["git", "push"], check=True)

        print("✅ Git push completed successfully.")
    except subprocess.CalledProcessError as e:
        print(f"❌ Git operation failed: {e}")

# --- Entry point
if __name__ == "__main__":
    main()
    git_commit_and_push()