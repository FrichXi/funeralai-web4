from __future__ import annotations

import json
import subprocess

import pytest
import rollback_pages

from rollback_pages import RollbackError, validate_target, wrangler_dry_run


def deployment(**overrides):
    payload = {
        "id": "good-id",
        "project_name": "funeral-ai-web4",
        "environment": "production",
        "latest_stage": {"status": "success"},
    }
    payload.update(overrides)
    return payload


def test_validate_target_accepts_successful_production_deployment():
    validate_target(deployment(), "good-id", "funeral-ai-web4")


@pytest.mark.parametrize(
    ("payload", "message"),
    [
        (deployment(id="other"), "different deployment id"),
        (deployment(project_name="another-project"), "belongs to"),
        (deployment(environment="preview"), "not a production"),
        (deployment(latest_stage={"status": "failure"}), "not 'success'"),
    ],
)
def test_validate_target_rejects_unsafe_rollback_targets(payload, message):
    with pytest.raises(RollbackError, match=message):
        validate_target(payload, "good-id", "funeral-ai-web4")


def test_wrangler_dry_run_confirms_production_release(monkeypatch):
    rows = [
        {
            "Id": "good-id",
            "Environment": "Production",
            "Deployment": "https://good-id.example.test",
        }
    ]
    monkeypatch.setattr(
        rollback_pages.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args[0], returncode=0, stdout=json.dumps(rows), stderr=""
        ),
    )
    monkeypatch.setattr(
        rollback_pages,
        "fetch_release_manifest",
        lambda url: {"releaseId": "release-123"},
    )

    target = wrangler_dry_run("good-id", "funeral-ai-web4")

    assert target == {
        "id": "good-id",
        "project_name": "funeral-ai-web4",
        "environment": "production",
        "url": "https://good-id.example.test",
        "release_id": "release-123",
    }


def test_wrangler_dry_run_rejects_unknown_target(monkeypatch):
    monkeypatch.setattr(
        rollback_pages.subprocess,
        "run",
        lambda *args, **kwargs: subprocess.CompletedProcess(
            args=args[0], returncode=0, stdout="[]", stderr=""
        ),
    )

    with pytest.raises(RollbackError, match="not present"):
        wrangler_dry_run("missing", "funeral-ai-web4")
