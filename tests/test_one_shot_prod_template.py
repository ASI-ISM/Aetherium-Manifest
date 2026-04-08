import subprocess


def test_one_shot_prod_template_sections_present() -> None:
    result = subprocess.run(
        [
            "python3",
            "tools/ci/one_shot_prod.py",
            "--goal",
            "fix websocket reconnection jitter",
            "--repo-areas",
            "ws_gateway/main.py, renderer-webgl.ts",
        ],
        check=True,
        capture_output=True,
        text=True,
    )

    output = result.stdout
    assert "## Goal" in output
    assert "fix websocket reconnection jitter" in output
    assert "## Repo Areas" in output
    assert "ws_gateway/main.py, renderer-webgl.ts" in output
    assert "## Test Commands" in output
    assert "## Instrumentation" in output
    assert "## Rollback Notes" in output
    assert "## PR Description" in output
