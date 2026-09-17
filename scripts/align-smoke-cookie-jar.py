#!/usr/bin/env python3
"""Smoke-only cookie adapter.

Production Set-Cookie uses Domain=.kasbokarapp.com and Secure. curl against
http://127.0.0.1:8080 will refuse to store those cookies, so rewriting a jar
after curl -c is too late. Ingest Set-Cookie from response headers and emit a
Cookie request header for the smoke host. Does not change how the app sets
cookies.
"""
from __future__ import annotations

import argparse
from urllib.parse import urlparse

EXPIRES = "1893456000"


def host_and_secure(base: str) -> tuple[str, bool]:
    u = urlparse(base)
    return u.hostname or "127.0.0.1", u.scheme == "https"


def parse_jar_lines(text: str) -> list[str]:
    return text.splitlines()


def jar_pairs(text: str) -> dict[str, tuple[bool, str, str, str, str]]:
    """name -> (http_only, host, secure, expires, value)"""
    found: dict[str, tuple[bool, str, str, str, str]] = {}
    for line in parse_jar_lines(text):
        http_only = line.startswith("#HttpOnly_")
        body = line[len("#HttpOnly_") :] if http_only else line
        if not body.strip() or (not http_only and body.lstrip().startswith("#")):
            continue
        parts = body.split("\t")
        if len(parts) < 7:
            continue
        found[parts[5]] = (http_only, parts[0], parts[3], parts[4], parts[6])
    return found


def render_jar(pairs: dict[str, tuple[bool, str, str, str, str]]) -> str:
    lines = ["# Netscape HTTP Cookie File"]
    for name, (http_only, host, secure, expires, value) in pairs.items():
        line = f"{host}\tFALSE\t/\t{secure}\t{expires}\t{name}\t{value}"
        lines.append(("#HttpOnly_" + line) if http_only else line)
    return "\n".join(lines) + "\n"


def align_jar(text: str, base: str) -> str:
    host, secure_ok = host_and_secure(base)
    out: list[str] = []
    for line in parse_jar_lines(text):
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


def cookie_expired(value: str, attr_chunks: list[str]) -> bool:
    if value == "":
        return True
    attrs: dict[str, str] = {}
    for part in attr_chunks:
        if "=" in part:
            key, raw = part.split("=", 1)
            attrs[key.strip().lower()] = raw.strip()
        else:
            attrs[part.strip().lower()] = "1"
    max_age = attrs.get("max-age")
    if max_age is not None:
        try:
            return int(max_age) <= 0
        except ValueError:
            return False
    return False


def parse_set_cookies(header_text: str) -> list[str]:
    out: list[str] = []
    for raw in header_text.splitlines():
        if raw.lower().startswith("set-cookie:"):
            out.append(raw.split(":", 1)[1].strip())
    return out


def ingest_headers(jar_text: str, header_text: str, base: str) -> str:
    host, secure_ok = host_and_secure(base)
    pairs = jar_pairs(align_jar(jar_text, base) if jar_text.strip() else "")
    for item in parse_set_cookies(header_text):
        chunks = [p.strip() for p in item.split(";")]
        if not chunks or "=" not in chunks[0]:
            continue
        name, value = chunks[0].split("=", 1)
        if cookie_expired(value, chunks[1:]):
            pairs.pop(name, None)
            continue
        http_only = any(p.split("=", 1)[0].strip().lower() == "httponly" for p in chunks[1:])
        pairs[name] = (
            http_only,
            host,
            "TRUE" if secure_ok else "FALSE",
            EXPIRES,
            value,
        )
    return render_jar(pairs) if pairs else "# Netscape HTTP Cookie File\n"


def cookie_header(jar_text: str) -> str:
    parts: list[str] = []
    for name, (_http_only, _host, _secure, _expires, value) in jar_pairs(jar_text).items():
        parts.append(f"{name}={value}")
    return "; ".join(parts)


def read(path: str) -> str:
    try:
        return open(path, encoding="utf-8").read()
    except FileNotFoundError:
        return ""


def write(path: str, text: str) -> None:
    open(path, "w", encoding="utf-8").write(text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("cmd", nargs="?", default="align")
    parser.add_argument("args", nargs="*")
    ns = parser.parse_args()
    cmd = ns.cmd
    args = ns.args

    # Backward compatible: python3 script.py JAR BASE
    if cmd not in {"align", "ingest", "header"}:
        args = [cmd, *args]
        cmd = "align"

    if cmd == "header":
        jar = args[0] if args else ""
        print(cookie_header(read(jar)), end="")
        return
    if cmd == "ingest":
        jar, base, headers = args[0], args[1], args[2]
        write(jar, ingest_headers(read(jar), read(headers), base))
        return
    jar, base = args[0], args[1]
    raw = read(jar)
    if not raw:
        return
    write(jar, align_jar(raw, base))


if __name__ == "__main__":
    main()
