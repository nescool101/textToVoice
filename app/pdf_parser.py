import re
import fitz  # PyMuPDF


def _clean_text(text: str) -> str:
    """Clean common PDF extraction artifacts."""
    # Collapse multiple blank lines into one
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple spaces
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Remove leading/trailing whitespace per line
    lines = [line.strip() for line in text.splitlines()]
    text = "\n".join(lines)
    return text.strip()


def extract_pages(pdf_path: str) -> list[dict]:
    """Extract text from a PDF, page by page.

    Returns:
        List of dicts: [{"page": 1, "text": "..."}, ...]
    """
    doc = fitz.open(pdf_path)
    pages = []
    for i, page in enumerate(doc, start=1):
        raw = page.get_text()
        cleaned = _clean_text(raw)
        if cleaned:
            pages.append({"page": i, "text": cleaned})
    doc.close()
    return pages


def extract_full_text(pdf_path: str) -> str:
    """Extract all text from a PDF as a single string."""
    pages = extract_pages(pdf_path)
    return "\n\n".join(p["text"] for p in pages)
