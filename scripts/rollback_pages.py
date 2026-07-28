#!/usr/bin/env python3
"""Safely inspect or execute a Cloudflare Pages production rollback."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_PROJECT = "funeral-ai-web4"
DEFAULT_RECEIPT_DIR = PROJECT_ROOT / "site" / ".release-receipts"


class RollbackError(RuntimeError):
    pass


def fetch_release_manifest(deployment_url: str) -> dict[str, Any]:
    try:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        request = urllib.request.Request(
            f"{deployment_url.rstrip('/')}/release-manifest.json",
            headers={"User-Agent": "funeralai-release-guard/1", "Cache-Control": "no-cache"},
        )
        with opener.open(request, timeout=20) as response:
            manifest = json.loads(response.read())
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        raise RollbackError(f"rollback target release manifest is not readable: {exc}") from exc
    if not isinstance(manifest, dict) or not manifest.get("releaseId"):
        raise RollbackError("rollback target release manifest has no releaseId")
    return manifest


def api_request(url: str, token: str, method: str = "GET") -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "funeralai-rollback/1",
        },
        data=b"{}" if method == "POST" else None,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = json.loads(response.read())
    except (urllib.error.URLError, json.JSONDecodeError) as exc:
        raise RollbackError(f"Cloudflare API request failed: {exc}") from exc
    if not payload.get("success"):
        messages = payload.get("errors") or payload.get("messages") or []
        raise RollbackError(f"Cloudflare API rejected the request: {messages}")
    return payload.get("result") or {}


def validate_target(deployment: dict[str, Any], deployment_id: str, project: str) -> None:
    if deployment.get("id") != deployment_id:
        raise RollbackError("Cloudflare returned a different deployment id")
    if deployment.get("project_name") != project:
        raise RollbackError(f"deployment belongs to {deployment.get('project_name')!r}, not {project!r}")
    if str(deployment.get("environment", "")).lower() != "production":
        raise RollbackError("rollback target is not a production deployment")
    status = str((deployment.get("latest_stage") or {}).get("status", "")).lower()
    if status != "success":
        raise RollbackError(f"rollback target status is {status!r}, not 'success'")


def wrangler_dry_run(deployment_id: str, project: str) -> dict[str, Any]:
    environment = os.environ.copy()
    for name in (
        "ALL_PROXY", "all_proxy", "HTTP_PROXY", "http_proxy", "HTTPS_PROXY", "https_proxy", "NO_PROXY", "no_proxy"
    ):
        environment.pop(name, None)
    result = subprocess.run(
        [
            "npx", "--no-install", "wrangler", "pages", "deployment", "list",
            "--project-name", project, "--environment", "production", "--json",
        ],
        cwd=PROJECT_ROOT / "site",
        env=environment,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        raise RollbackError(result.stderr.strip() or "Wrangler production deployment lookup failed")
    try:
        rows = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RollbackError(f"Wrangler returned invalid deployment JSON: {exc}") from exc
    row = next((item for item in rows if item.get("Id") == deployment_id), None)
    if row is None:
        raise RollbackError("deployment is not present in Wrangler's production deployment list")
    if str(row.get("Environment", "")).lower() != "production":
        raise RollbackError("Wrangler target is not a production deployment")
    deployment_url = row.get("Deployment")
    if not deployment_url:
        raise RollbackError("Wrangler target has no deployment URL")
    release_manifest = fetch_release_manifest(deployment_url)
    return {
        "id": deployment_id,
        "project_name": project,
        "environment": "production",
        "url": deployment_url,
        "release_id": release_manifest.get("releaseId"),
    }


def write_receipt(receipt_dir: Path, payload: dict[str, Any]) -> Path:
    receipt_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    path = receipt_dir / f"rollback-{stamp}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--deployment-id", required=True)
    parser.add_argument("--project", default=DEFAULT_PROJECT)
    parser.add_argument("--execute", action="store_true", help="Execute the rollback. Default is dry-run.")
    parser.add_argument(
        "--confirm-project",
        help=f"Required with --execute and must equal {DEFAULT_PROJECT!r}.",
    )
    parser.add_argument("--receipt-dir", type=Path, default=DEFAULT_RECEIPT_DIR)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    account_id = os.environ.get("CLOUDFLARE_ACCOUNT_ID")
    token = os.environ.get("CLOUDFLARE_API_TOKEN")
    if not account_id or not token:
        if args.execute:
            print(
                "Executing rollback requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN; "
                "Wrangler's private OAuth file is intentionally not read.",
                file=sys.stderr,
            )
            return 2
        try:
            target = wrangler_dry_run(args.deployment_id, args.project)
            print(f"Rollback target: {target['id']}")
            print(f"Deployment URL: {target['url']}")
            print(f"Release ID: {target['release_id']}")
            print("Environment/status: production/release-manifest-readable")
            print("Dry-run only; production was not changed.")
            print("Execution requires an explicit Pages Write API token.")
            return 0
        except RollbackError as exc:
            print(f"Rollback refused: {exc}", file=sys.stderr)
            return 1

    base = (
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/"
        f"{args.project}/deployments/{args.deployment_id}"
    )
    try:
        deployment = api_request(base, token)
        validate_target(deployment, args.deployment_id, args.project)
        target_manifest = fetch_release_manifest(str(deployment.get("url")))
        print(f"Rollback target: {deployment.get('id')}")
        print(f"Deployment URL: {deployment.get('url')}")
        print(f"Release ID: {target_manifest.get('releaseId')}")
        print("Environment/status: production/success")

        if not args.execute:
            print("Dry-run only; production was not changed.")
            print(
                "To execute after verifying the target URL, add: "
                f"--execute --confirm-project {DEFAULT_PROJECT}"
            )
            return 0

        if args.project != DEFAULT_PROJECT or args.confirm_project != DEFAULT_PROJECT:
            raise RollbackError(
                f"execution requires --project {DEFAULT_PROJECT} --confirm-project {DEFAULT_PROJECT}"
            )

        result = api_request(f"{base}/rollback", token, method="POST")
        try:
            from release_guard import ReleaseContractError, verify_remote

            verify_remote("https://funeralai.cc", target_manifest, attempts=24, delay=5)
        except (ImportError, ReleaseContractError) as exc:
            raise RollbackError(
                f"rollback request was accepted but production verification failed: {exc}"
            ) from exc
        receipt = write_receipt(
            args.receipt_dir,
            {
                "schemaVersion": "funeralai-rollback-receipt/v1",
                "executedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
                "project": args.project,
                "targetDeploymentId": args.deployment_id,
                "targetUrl": deployment.get("url"),
                "targetReleaseId": target_manifest.get("releaseId"),
                "resultDeploymentId": result.get("id"),
                "verifiedDomain": "https://funeralai.cc",
                "verified": True,
            },
        )
        print(f"Rollback request accepted. Receipt: {receipt}")
        return 0
    except RollbackError as exc:
        print(f"Rollback refused: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
