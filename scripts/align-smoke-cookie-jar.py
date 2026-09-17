#!/usr/bin/env python3
"""Adapt a Netscape cookie jar so curl will send Production cookies to SMOKE_BASE.

Production session cookies are Domain=.kasbokarapp.com and Secure when SITE_URL
is https. Smoke talks to http://127.0.0.1:8080, so curl will not attach them.
This rewrites only the smoke client jar — it does not change how the app sets
cookies, CSRF, or HTTPS.
"""
from __future__ import annotations

import argparse
from urllib.parse import urlparse


def align_jar(text: str, base: str) -> str:
    u = urlparse(base)
    host = u.hostname or "127.0.0.1"
    secure_ok = u.scheme == "https"
    out: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            out.append(line)
            continue
        http_only = line.startswith("#HttpOnly_")
        if stripped.startswith("#") and not http_only:
            out.append(line)
            continue
        body = line[len("#HttpOnly_") :] if http_only else line
        parts = body.split("\t")
        if len(parts) < 7:
            out.append(line)
            continue
        parts[0] = host
        parts[1] = "FALSE"
        if not secure_ok:
            parts[3] = "FALSE"
        rebuilt = "\t".join(parts)
        out.append(("#HttpOnly_" + rebuilt) if http_only else rebuilt)
    suffix = "\n" if text.endswith("\n") or text else "\n"
    return "\n".join(out) + (suffix if out else "")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("jar")
    parser.add_argument("base")
    args = parser.parse_args()
    try:
        raw = open(args.jar, encoding="utf-8").read()
    except FileNotFoundError:
        return
    open(args.jar, "w", encoding="utf-8").write(align_jar(raw, args.base))


if __name__ == "__main__":
    main()
