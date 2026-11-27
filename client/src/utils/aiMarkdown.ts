import DOMPurify from 'dompurify';

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Converts lightweight AI Markdown (paragraphs, inline code, fenced code blocks, bold)
 * into sanitized HTML via DOMPurify.
 */
export function renderSanitizedAiMarkdown(markdown: string): string {
  const blocks = markdown.split(/```([\s\S]*?)```/g);
  const htmlParts: string[] = [];

  for (let i = 0; i < blocks.length; i++) {
    if (i % 2 === 1) {
      const lines = blocks[i].split('\n');
      const lang = lines[0]?.trim() || '';
      const codeBody = lines.slice(1).join('\n');
      htmlParts.push(
        `<pre data-lang="${escapeHtml(lang)}"><code>${escapeHtml(codeBody)}</code></pre>`
      );
    } else {
      const escaped = escapeHtml(blocks[i]);
      const withInline = escaped
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>');
      const paragraphs = withInline
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`);
      htmlParts.push(...paragraphs);
    }
  }

  return DOMPurify.sanitize(htmlParts.join(''), {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['data-lang'],
  });
}

export function extractFirstCodeBlock(markdown: string): string | null {
  const match = markdown.match(/```[^\n]*\n([\s\S]*?)```/);
  return match ? match[1].trimEnd() : null;
}
