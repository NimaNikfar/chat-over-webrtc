/**
 * Cleans an SDP string that came from user copy-paste or a text field.
 *
 * Problems handled:
 *  1. Windows-style line endings (\r\n) → \r\n is actually correct per RFC,
 *     but mixed endings break parsers, so we normalize everything then re-add \r\n.
 *  2. Blank lines inserted by text editors / JSON serializers.
 *  3. Leading / trailing whitespace on each line.
 *  4. `a=max-message-size` appearing at session level (before the first m= line).
 *     Per RFC 8841 it is valid only inside an m= section.  Chrome throws on it
 *     at session level; we move it into the first m=application section, or
 *     drop it if none exists.
 *  5. Completely empty / whitespace-only input.
 */
export function sanitizeSdp(raw: string): string {
  if (!raw || !raw.trim()) throw new Error("SDP is empty.");

  // ── 1. Normalize line endings → plain \n for processing ─────────────────
  const lines = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0); // remove blank lines

  // ── 2. Find section boundaries ───────────────────────────────────────────
  const firstMIndex = lines.findIndex((l) => l.startsWith("m="));

  if (firstMIndex === -1) {
    throw new Error("SDP contains no media section (m= line missing).");
  }

  // ── 3. Pull out any a=max-message-size lines that sit at session level ───
  const sessionLines: string[]   = [];
  const mediaLines:   string[]   = [];
  const hoisted:      string[]   = []; // lines we need to move

  lines.forEach((line, i) => {
    if (i < firstMIndex) {
      if (line.startsWith("a=max-message-size:")) {
        hoisted.push(line);           // will be re-inserted below
      } else {
        sessionLines.push(line);
      }
    } else {
      mediaLines.push(line);
    }
  });

  // ── 4. Insert hoisted lines right after the first m=application line ─────
  let rebuilt: string[];

  if (hoisted.length > 0) {
    const appIdx = mediaLines.findIndex((l) => l.startsWith("m=application"));
    if (appIdx !== -1) {
      // insert after m=application + any immediately following c= / a=mid lines
      let insertAt = appIdx + 1;
      while (
        insertAt < mediaLines.length &&
        (mediaLines[insertAt].startsWith("c=") ||
          mediaLines[insertAt].startsWith("a=mid:"))
      ) {
        insertAt++;
      }
      mediaLines.splice(insertAt, 0, ...hoisted);
      rebuilt = [...sessionLines, ...mediaLines];
    } else {
      // No application section — just drop the attribute (it's irrelevant)
      rebuilt = [...sessionLines, ...mediaLines];
    }
  } else {
    rebuilt = [...sessionLines, ...mediaLines];
  }

  // ── 5. Re-join with CRLF (required by WebRTC SDP spec) ──────────────────
  return rebuilt.join("\r\n") + "\r\n";
}

/**
 * Validates that a string looks like a minimal SDP blob.
 * Throws a descriptive error instead of letting the browser throw a
 * cryptic OperationError.
 */
export function assertValidSdp(sdp: string): void {
  if (!sdp.includes("v=0")) {
    throw new Error('SDP is missing the version line "v=0". Did you paste the full SDP?');
  }
  if (!sdp.includes("o=")) {
    throw new Error('SDP is missing the origin line "o=". Did you paste the full SDP?');
  }
  if (!/m=(audio|video|application)/.test(sdp)) {
    throw new Error("SDP contains no media (m=) lines.");
  }
}
