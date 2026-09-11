#!/bin/bash
# Revoke the previous (compromised) Let's Encrypt cert. Never prints keys.
# Aborts if the live served certificate is still the old serial.
set -euo pipefail
umask 077

LIVE_EXPECT_SERIAL=055D352DBC35556738B9A84FAFECB2E579CF
OLD_EXPECT_SERIAL=0534683C20B8888A21D29D7A0FEBE665E9A0
LIVE_EXPECT_FP='64:88:A7:E9:93:CB:2E:8E:6B:FC:0A:24:6D:72:DE:4B:E1:3A:5C:E9:71:44:FB:BF:3D:F6:2C:69:2B:06:61:8B'
BAK=${1:-/root/kasbokar-tls-backup-20260911T212612Z}
APP_DIR=${APP_DIR:-/opt/kasbokarapp}

served_serial() {
  echo | openssl s_client -connect 127.0.0.1:443 -servername "$1" 2>/dev/null | openssl x509 -noout -serial -fingerprint -sha256
}

cd "$APP_DIR"
python3 -c 'from cryptography.hazmat.primitives import serialization' 2>/dev/null || {
  echo "NEED_PYTHON_CRYPTO"
  apt-get update -qq
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3-cryptography
}
live=$(served_serial kasbokarapp.com)
echo "LIVE $live"
echo "$live" | grep -q "$LIVE_EXPECT_SERIAL" || { echo "STOP_LIVE_NOT_NEW"; exit 1; }
echo "$live" | grep -q "$LIVE_EXPECT_FP" || { echo "STOP_LIVE_FP"; exit 1; }
www=$(served_serial www.kasbokarapp.com)
echo "WWW $www"
echo "$www" | grep -q "$LIVE_EXPECT_SERIAL" || { echo "STOP_WWW_NOT_NEW"; exit 1; }

old_serial=$(openssl x509 -in "$BAK/fullchain.pem" -noout -serial)
echo "BACKUP_CERT $old_serial"
echo "$old_serial" | grep -q "$OLD_EXPECT_SERIAL" || { echo "STOP_BACKUP_SERIAL"; exit 1; }
echo "$old_serial" | grep -q "$LIVE_EXPECT_SERIAL" && { echo "STOP_WOULD_REVOKE_LIVE"; exit 1; }

python3 - "$BAK/fullchain.pem" "$BAK/privkey.pem" <<'PY'
from __future__ import annotations
import base64, json, sys, urllib.request, urllib.error
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

cert_path, key_path = sys.argv[1], sys.argv[2]
cert_pem = open(cert_path, "rb").read()
if b"PRIVATE KEY" in cert_pem.split(b"-----END CERTIFICATE-----")[0]:
    print("STOP_CERT_HAS_KEY")
    sys.exit(1)
key = serialization.load_pem_private_key(open(key_path, "rb").read(), password=None)
cert = x509.load_pem_x509_certificate(cert_pem)
der = cert.public_bytes(serialization.Encoding.DER)

def serial_hex(n: int) -> str:
    h = format(n, "X")
    if len(h) % 2:
        h = "0" + h
    return h

OLD_SERIAL_INT = int("0534683C20B8888A21D29D7A0FEBE665E9A0", 16)
LIVE_SERIAL_INT = int("055D352DBC35556738B9A84FAFECB2E579CF", 16)
if cert.serial_number != OLD_SERIAL_INT:
    print("STOP_PYTHON_SERIAL", serial_hex(cert.serial_number))
    sys.exit(1)
if cert.serial_number == LIVE_SERIAL_INT:
    print("STOP_WOULD_REVOKE_LIVE")
    sys.exit(1)
serial = serial_hex(cert.serial_number)
print("REVOKE_TARGET", serial)

def b64u(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

pub = key.public_key()
n = pub.public_numbers().n
e = pub.public_numbers().e
jwk = {
    "kty": "RSA",
    "n": b64u(n.to_bytes((n.bit_length() + 7) // 8, "big")),
    "e": b64u(e.to_bytes((e.bit_length() + 7) // 8, "big")),
}

def post(url: str, payload, nonce: str):
    body = b64u(json.dumps(payload, separators=(",", ":")).encode()) if payload is not None else ""
    prot = b64u(json.dumps({"alg": "RS256", "jwk": jwk, "nonce": nonce, "url": url}, separators=(",", ":")).encode())
    sig = key.sign(f"{prot}.{body}".encode(), padding.PKCS1v15(), hashes.SHA256())
    data = json.dumps({"protected": prot, "payload": body, "signature": b64u(sig)}).encode()
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/jose+json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read()

dir_url = "https://acme-v02.api.letsencrypt.org/directory"
directory = json.load(urllib.request.urlopen(dir_url, timeout=30))
nonce = urllib.request.urlopen(urllib.request.Request(directory["newNonce"], method="HEAD")).headers["Replay-Nonce"]
# reason 1 = keyCompromise
status, headers, raw = post(directory["revokeCert"], {"certificate": b64u(der), "reason": 1}, nonce)
text = raw.decode("utf-8", "replace")
print("ACME_STATUS", status)
if status in (200, 201):
    print("REVOKE_OK", serial)
    sys.exit(0)
if status == 409 or "alreadyRevoked" in text:
    print("REVOKE_ALREADY", serial)
    sys.exit(0)
print("REVOKE_FAIL", text[:500])
sys.exit(1)
PY

echo "POST_LIVE_CHECK"
served_serial kasbokarapp.com
served_serial www.kasbokarapp.com
echo "REVOKE_DONE_LIVE_UNCHANGED"
