#!/usr/bin/env python3
"""DNS-01 issue for kasbokarapp.com + www. Writes TXT values then waits for a ready flag.

Never prints the private key. Workdir must stay outside git.
"""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import josepy
from acme import challenges, client, messages

DIRECTORY = os.environ.get("ACME_DIRECTORY", "https://acme-v02.api.letsencrypt.org/directory")
CONTACT = os.environ.get("ACME_EMAIL", "ops@kasbokarapp.com")
DOMAINS = ["kasbokarapp.com", "www.kasbokarapp.com"]
WORKDIR = Path(os.environ.get("LE_ROTATE_DIR", "/tmp/le-rotate"))
WORKDIR.mkdir(mode=0o700, parents=True, exist_ok=True)
CHALLENGES = WORKDIR / "challenges.json"
READY = WORKDIR / "ready"
CERT_DIR = WORKDIR / "new"
CERT_DIR.mkdir(mode=0o700, exist_ok=True)


def _key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def _jwkey(priv):
    return josepy.JWKRSA(key=priv)


def main() -> int:
    account_key = _key()
    cert_key = _key()
    net = client.ClientNetwork(_jwkey(account_key), user_agent="KasbokarTLSRotate/1.0")
    directory = messages.Directory.from_json(net.get(DIRECTORY).json())
    acme = client.ClientV2(directory, net=net)
    acme.new_account(
        messages.NewRegistration.from_data(email=CONTACT, terms_of_service_agreed=True)
    )

    from cryptography import x509
    from cryptography.x509.oid import NameOID
    from cryptography.hazmat.primitives import hashes

    csr_builder = (
        x509.CertificateSigningRequestBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, DOMAINS[0])]))
        .add_extension(
            x509.SubjectAlternativeName([x509.DNSName(d) for d in DOMAINS]),
            critical=False,
        )
    )
    csr = csr_builder.sign(cert_key, hashes.SHA256())
    csr_pem = csr.public_bytes(serialization.Encoding.PEM)
    order = acme.new_order(csr_pem)

    records = []
    authz_ok = []
    for authz in order.authorizations:
        domain = authz.body.identifier.value
        dns_ch = None
        for ch in authz.body.challenges:
            if isinstance(ch.chall, challenges.DNS01):
                dns_ch = ch
                break
        if dns_ch is None:
            raise SystemExit(f"no dns-01 for {domain}")
        token = dns_ch.chall.validation(acme.net.key)
        host = f"_acme-challenge.{domain}".removesuffix(".kasbokarapp.com")
        if host == "_acme-challenge":
            host_label = "_acme-challenge"
        else:
            host_label = host
        records.append(
            {
                "domain": domain,
                "type": "TXT",
                "host": "_acme-challenge" if domain == "kasbokarapp.com" else "_acme-challenge.www",
                "fqdn": f"_acme-challenge.{domain}",
                "value": token,
            }
        )
        authz_ok.append((dns_ch, domain))

    CHALLENGES.write_text(json.dumps({"records": records}, indent=2) + "\n")
    CHALLENGES.chmod(0o600)
    print("CHALLENGES_READY", CHALLENGES, flush=True)
    for r in records:
        print(f"TXT {r['fqdn']} {r['value']}", flush=True)

    deadline = time.time() + 45 * 60
    while not READY.exists():
        if time.time() > deadline:
            print("TIMEOUT waiting for", READY, file=sys.stderr)
            return 2
        time.sleep(3)

    print("READY_SEEN answering challenges", flush=True)
    time.sleep(8)  # DNS propagate slack after operator confirms
    for ch, domain in authz_ok:
        acme.answer_challenge(ch, ch.response(acme.net.key))
        print("ANSWERED", domain, flush=True)

    finalized = acme.poll_and_finalize(order)
    fullchain = finalized.fullchain_pem
    priv_pem = cert_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption(),
    )
    (CERT_DIR / "fullchain.pem").write_bytes(fullchain.encode() if isinstance(fullchain, str) else fullchain)
    (CERT_DIR / "privkey.pem").write_bytes(priv_pem)
    (CERT_DIR / "fullchain.pem").chmod(0o644)
    (CERT_DIR / "privkey.pem").chmod(0o600)
    print("CERT_ISSUED", CERT_DIR / "fullchain.pem", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
