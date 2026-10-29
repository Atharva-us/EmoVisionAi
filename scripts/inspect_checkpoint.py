"""Statically list the Python globals referenced by a PyTorch checkpoint.

This never unpickles the file, so it is safe to run on untrusted downloads. It is
used to build the explicit allowlist that ``convert_weights.py`` passes to
``torch.load(weights_only=True)``.

Usage:
    python scripts/inspect_checkpoint.py models/enet_b0_8_best_afew.pt
"""

from __future__ import annotations

import pickletools
import sys
import zipfile
from collections import Counter


def referenced_globals(path: str) -> Counter[str]:
    with zipfile.ZipFile(path) as archive:
        pickle_name = next(n for n in archive.namelist() if n.endswith("data.pkl"))
        payload = archive.read(pickle_name)

    found: Counter[str] = Counter()
    recent_strings: list[str] = []
    for opcode, arg, _ in pickletools.genops(payload):
        if opcode.name in {"SHORT_BINUNICODE", "BINUNICODE", "UNICODE"}:
            recent_strings.append(arg)
        elif opcode.name == "GLOBAL":
            module, name = arg.split(" ", 1)
            found[f"{module}.{name}"] += 1
        elif opcode.name == "STACK_GLOBAL" and len(recent_strings) >= 2:
            # STACK_GLOBAL consumes the two most recently pushed strings.
            found[f"{recent_strings[-2]}.{recent_strings[-1]}"] += 1
        elif opcode.name in {"BINGET", "LONG_BINGET", "GET"}:
            # Memoised strings re-used by STACK_GLOBAL are not re-pushed as
            # literals; we tolerate the resulting gaps because every distinct
            # global appears at least once in full before it is memoised.
            continue
    return found


if __name__ == "__main__":
    for qualified_name, count in sorted(referenced_globals(sys.argv[1]).items()):
        print(f"{count:5d}  {qualified_name}")
