"""用 Qwen3-TTS CustomVoice 為單字表產生每字一個 <wordId>.mp3。

讀 audio-manifest（[{ "id": <wordId>, "text": <english> }, ...]），逐字合成、
去掉開頭靜音/吸氣聲，輸出 <id>.mp3 到 --out-dir。之後用
scripts/distribute-audio.mjs 複製進 public/audio 的 4 個 voice 資料夾。

必須用 English pod 的 qwen venv 跑（裡面才有 qwen_tts / torch / GPU 權重）：

  D:\\English pod\\.venv-qwen\\Scripts\\python.exe ^
      "D:\\英文學習\\英文單字測驗\\scripts\\synth_vocab_qwen.py" ^
      --manifest "D:\\英文學習\\英文單字測驗\\scripts\\audio-manifest-eason.json" ^
      --out-dir  "D:\\英文學習\\英文單字測驗\\word-source\\eason-mp3" ^
      --speaker vivian

選項：
  --speaker <name>   語者（預設 vivian；啟動時會列出模型支援的所有語者）
  --force            覆寫已存在的 mp3（預設 resume，已存在的跳過）
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import numpy as np
import soundfile as sf
import torch
import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

# 單字易被 Qwen3 誤發音（Bus→Plus 等）；明確指令「清楚念單字」最穩。
VOCAB_INSTRUCT = (
    "Read this English vocabulary word for a children's word list. "
    "American English. Pronounce it clearly, slowly, and naturally, like a "
    "friendly teacher reading a single word aloud. One clear word, neutral tone, "
    "no extra sounds, no laughter, no breath noises."
)

# Qwen3-TTS sometimes hallucinates / loops into long rambling audio. Generate up to
# MAX_TRIES takes and keep the SHORTEST one under a per-word duration cap (a clean
# single-word take is short; a hallucinated one is long).
MAX_TRIES = 5


def speak_text(text):
    """Make placeholder/grammar tokens speakable so TTS doesn't read junk."""
    t = (text or "").replace("...", ", ").replace("…", ", ")
    t = re.sub(r"\bsb\b", "someone", t)
    t = re.sub(r"\bsth\b", "something", t)
    t = t.replace("V-ing", "doing something").replace("+ pp", "").replace("+", " ")
    t = re.sub(r"\s+", " ", t).strip(" ,")
    return t or (text or "")


def trim_to_mp3(wav: np.ndarray, sr: int, wav_tmp: Path, out_mp3: Path) -> None:
    """寫 wav → silencedetect 找第一個有聲點 → atrim 去開頭靜音 → mp3。"""
    sf.write(str(wav_tmp), wav, sr)
    trim_start = 0.0
    try:
        det = subprocess.run(
            [FFMPEG, "-i", str(wav_tmp), "-af",
             "silencedetect=n=-28dB:d=0.05", "-f", "null", "-"],
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )
        starts, ends = [], []
        for line in det.stderr.split("\n"):
            sm = re.search(r"silence_start:\s+([\d.\-]+)", line)
            if sm:
                starts.append(float(sm.group(1)))
            em = re.search(r"silence_end:\s+([\d.]+)", line)
            if em:
                ends.append(float(em.group(1)))
        # 開頭就靜音 → 從第一段靜音結束處起算（留 80ms pad）
        if starts and starts[0] < 0.05 and ends:
            trim_start = max(0.0, ends[0] - 0.08)
            trim_start = min(trim_start, 3.0)  # 安全上限
    except Exception:
        pass

    ff = [FFMPEG, "-y", "-loglevel", "error", "-i", str(wav_tmp)]
    if trim_start > 0.05:
        ff += ["-af", f"atrim=start={trim_start:.3f},asetpts=PTS-STARTPTS"]
    ff += ["-codec:a", "libmp3lame", "-b:a", "128k", str(out_mp3)]
    subprocess.run(ff, check=True)
    wav_tmp.unlink(missing_ok=True)


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True, help="JSON: [{id, text}, ...]")
    p.add_argument("--out-dir", required=True, help="輸出 <id>.mp3 的資料夾")
    p.add_argument("--speaker", default="vivian")
    p.add_argument("--lang", default="English")
    p.add_argument("--force", action="store_true")
    args = p.parse_args()

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    if not isinstance(manifest, list) or not manifest:
        print(f"❌ manifest 不是非空陣列: {args.manifest}")
        return 2
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("Loading Qwen3-TTS-12Hz-1.7B-CustomVoice to GPU...")
    t0 = time.time()
    from qwen_tts import Qwen3TTSModel
    model = Qwen3TTSModel.from_pretrained(
        "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice",
        device_map="cuda:0",
        dtype=torch.bfloat16,
    )
    speakers = model.get_supported_speakers()
    print(f"  Loaded in {time.time()-t0:.1f}s. Speakers: {speakers}")
    if args.speaker not in speakers:
        print(f"❌ speaker {args.speaker!r} 不在支援清單，請從上面挑一個用 --speaker 指定")
        return 2

    gen = skip = fail = 0
    t_all = time.time()
    for entry in manifest:
        wid = entry.get("id")
        text = (entry.get("text") or "").strip()
        if not wid or not text:
            continue
        out_mp3 = out_dir / f"{wid}.mp3"
        if not args.force and out_mp3.exists() and out_mp3.stat().st_size > 256:
            skip += 1
            continue
        t0 = time.time()
        spoken = speak_text(text)
        words = max(1, len(spoken.split()))
        cap = 2.5 + 1.3 * (words - 1)   # single word ~2.5s; phrases scale up
        try:
            best_wav, best_sr, best_dur, tries = None, None, 1e9, 0
            for _ in range(MAX_TRIES):
                tries += 1
                wavs, sr = model.generate_custom_voice(
                    text=spoken, language=args.lang,
                    speaker=args.speaker, instruct=VOCAB_INSTRUCT,
                )
                wav = wavs[0] if isinstance(wavs, list) else wavs
                if isinstance(wav, torch.Tensor):
                    wav = wav.cpu().float().numpy()
                wav = np.asarray(wav, dtype=np.float32)
                if wav.ndim > 1:
                    wav = wav.squeeze()
                dur = len(wav) / sr
                if dur < best_dur:
                    best_wav, best_sr, best_dur = wav, sr, dur
                if dur <= cap:
                    break
            trim_to_mp3(best_wav, best_sr, out_dir / f"_tmp_{wid}.wav", out_mp3)
            flag = "" if best_dur <= cap else f"  WARN still {best_dur:.1f}s > cap {cap:.1f}"
            print(f"  {text:<18} {time.time()-t0:.2f}s tries={tries} dur={best_dur:.2f}s -> {wid}.mp3{flag}")
            gen += 1
        except Exception as e:
            err = str(e)[:120].encode("ascii", "replace").decode()
            print(f"  {text:<16} FAILED: {err}")
            fail += 1

    print(f"\n{'='*50}\nGenerated: {gen} | Skipped: {skip} | Failed: {fail}")
    print(f"Total: {time.time()-t_all:.1f}s")
    print(f"Out dir: {out_dir}")
    if gen and not fail:
        print("\nNext (in 英文單字測驗 repo):")
        print(f'  node scripts/distribute-audio.mjs --src "{out_dir}"')
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
