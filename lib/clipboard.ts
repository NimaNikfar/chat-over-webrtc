/**
 * Copies text to the clipboard.
 * Prefers the modern Clipboard API; falls back to execCommand for
 * insecure contexts (plain HTTP, some mobile browsers, older WebViews).
 */
export async function copyToClipboard(text: string): Promise<void> {
  // ── Modern API (HTTPS / localhost) ───────────────────────────────────────
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  // ── Legacy fallback ──────────────────────────────────────────────────────
  const textarea = document.createElement("textarea");
  textarea.value = text;

  // Keep it out of the viewport so it doesn't flash
  textarea.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!ok) {
    throw new Error("execCommand copy failed — clipboard unavailable");
  }
}
