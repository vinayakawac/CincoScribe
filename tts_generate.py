import sys
import os
import json
import soundfile as sf
from kittentts import KittenTTS

def main():
    try:
        input_data = json.load(sys.stdin)
        text = input_data.get("text", "")
        voice = input_data.get("voice", "Bruno")
        speed = float(input_data.get("speed", 1.0))
        model_name = input_data.get("model_name", "KittenML/kitten-tts-mini-0.8")
        output_path = input_data.get("output_path", "")

        if not text:
            print(json.dumps({"error": "No text provided"}), flush=True)
            return

        m = KittenTTS(model_name)
        m.generate_to_file(text, output_path, voice=voice, speed=speed, sample_rate=24000)

        info = sf.info(output_path)
        duration = info.duration

        print(json.dumps({
            "success": True,
            "output_path": output_path,
            "duration": duration,
            "word_count": len(text.split())
        }), flush=True)

    except Exception as e:
        print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
