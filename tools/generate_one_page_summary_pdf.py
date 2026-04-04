#!/usr/bin/env python3
"""Generate a single-page PDF summary for Aetherium Manifest."""
from __future__ import annotations

from pathlib import Path
import textwrap

SOURCE = Path("docs/aetherium_manifest_one_page_summary.md")
OUTPUT = Path("docs/aetherium_manifest_one_page_summary.pdf")


def _escape_pdf_text(text: str) -> str:
    # Map common non-ASCII characters to ASCII equivalents for standard PDF fonts
    text = text.replace("\u2014", "-").replace("\u2019", "'").replace("\u2013", "-")
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def markdown_to_lines(text: str) -> list[str]:
    lines: list[str] = []
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            lines.append("")
            continue
        if s.startswith("# "):
            lines.append(s[2:].strip())
            lines.append("")
            continue
        if s.startswith("## "):
            lines.append(s[3:].strip())
            continue
        if s.startswith("- `") and s.endswith("`"):
            s = "* " + s[3:-1]
        elif s.startswith("- "):
            s = "* " + s[2:]

        wrapped = textwrap.wrap(s, width=95, break_long_words=False, break_on_hyphens=False)
        if wrapped:
            lines.extend(wrapped)
        else:
            lines.append(s)
    return lines


def build_pdf(lines: list[str]) -> bytes:
    width, height = 612, 792  # US Letter
    left_margin = 42
    top = 752
    line_height = 17

    text_ops = ["BT", "/F1 10.5 Tf"]
    y = top
    for line in lines:
        text_ops.append(f"1 0 0 1 {left_margin} {y} Tm ({_escape_pdf_text(line)}) Tj")
        y -= line_height
    text_ops.append("ET")
    stream = "\n".join(text_ops).encode("utf-8")

    objects: list[bytes] = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(
        f"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} {height}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n".encode(
            "utf-8"
        )
    )
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(
        b"5 0 obj << /Length " + str(len(stream)).encode("ascii") + b" >> stream\n" + stream + b"\nendstream endobj\n"
    )

    pdf = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf))
        pdf.extend(obj)

    xref_pos = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        pdf.extend(f"{off:010d} 00000 n \n".encode("ascii"))

    pdf.extend(
        f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode(
            "ascii"
        )
    )
    return bytes(pdf)


def main() -> None:
    lines = markdown_to_lines(SOURCE.read_text(encoding="utf-8"))
    max_lines = 42
    if len(lines) > max_lines:
        raise SystemExit(f"Content overflow: {len(lines)} lines > {max_lines} line budget")
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_bytes(build_pdf(lines))
    print(f"Wrote {OUTPUT} ({len(lines)} lines)")


if __name__ == "__main__":
    main()
