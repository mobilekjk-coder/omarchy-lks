#!/usr/bin/env python3
"""Play Hava Nagila. SIGTERM fades the volume out, then stops."""
from __future__ import annotations

import json
import os
import signal
import socket
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "mezdim.ogg")
SOCK = os.path.join(os.environ.get("XDG_RUNTIME_DIR", "/tmp"), "kjk-lks-mezdim.sock")
FADE_STEPS = (70, 55, 40, 28, 16, 8, 0)
FADE_STEP_S = 0.07


def ipc(cmd: list) -> None:
    try:
        sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        sock.settimeout(0.2)
        sock.connect(SOCK)
        sock.sendall((json.dumps({"command": cmd}) + "\n").encode())
        sock.close()
    except OSError:
        pass


def wait_socket(timeout: float = 1.0) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if os.path.exists(SOCK):
            try:
                ipc(["get_property", "volume"])
                return True
            except OSError:
                pass
        time.sleep(0.03)
    return False


def cleanup() -> None:
    try:
        os.unlink(SOCK)
    except FileNotFoundError:
        pass


fading = False
mpv: subprocess.Popen | None = None


def fade_and_stop(signum: int | None = None, frame: object = None) -> None:
    global fading
    if fading:
        return
    fading = True
    for vol in FADE_STEPS:
        ipc(["set_property", "volume", vol])
        time.sleep(FADE_STEP_S)
    if mpv and mpv.poll() is None:
        mpv.terminate()
        try:
            mpv.wait(timeout=0.4)
        except subprocess.TimeoutExpired:
            mpv.kill()
    cleanup()
    raise SystemExit(1)


def main() -> int:
    global mpv
    if not os.path.isfile(AUDIO):
        print("missing audio:", AUDIO, file=sys.stderr)
        return 2
    cleanup()
    mpv = subprocess.Popen(
        [
            "mpv",
            "--no-video",
            "--really-quiet",
            "--no-terminal",
            "--audio-display=no",
            "--volume=80",
            "--input-ipc-server=" + SOCK,
            AUDIO,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    signal.signal(signal.SIGTERM, fade_and_stop)
    signal.signal(signal.SIGINT, fade_and_stop)
    wait_socket()
    code = mpv.wait()
    cleanup()
    return int(code or 0)


if __name__ == "__main__":
    raise SystemExit(main())
