"use client";

import { useState, useRef } from "react";

function convertToHtml(text: string): string {
  if (!text.trim()) return "";

  const lines = text.split("\n");
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings (markdown: ### / ## / # or prefix: h3: / h2: / h1:)
    if (/^#{3} (.+)/.test(line) || /^h3\s*[:\-–—]\s*(.+)/i.test(line)) {
      const content = line.replace(/^#{3} /, "").replace(/^h3\s*[:\-]\s*/i, "");
      result.push(`<h3>${formatInline(content)}</h3>`);
      i++;
      continue;
    }
    if (/^#{2} (.+)/.test(line) || /^h2\s*[:\-–—]\s*(.+)/i.test(line)) {
      const content = line.replace(/^#{2} /, "").replace(/^h2\s*[:\-–—]\s*/i, "");
      result.push(`<h2>${formatInline(content)}</h2>`);
      i++;
      continue;
    }
    if (/^# (.+)/.test(line) || /^h1\s*[:\-–—]\s*(.+)/i.test(line)) {
      const content = line.replace(/^# /, "").replace(/^h1\s*[:\-–—]\s*/i, "");
      result.push(`<h1>${formatInline(content)}</h1>`);
      i++;
      continue;
    }

    // Unordered list
    if (/^- (.+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^- (.+)/.test(lines[i])) {
        items.push(`  <li>${formatInline(lines[i].replace(/^- /, ""))}</li>`);
        i++;
      }
      result.push(`<ul>\n${items.join("\n")}\n</ul>`);
      continue;
    }

    // Ordered list
    if (/^\d+\. (.+)/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. (.+)/.test(lines[i])) {
        items.push(
          `  <li>${formatInline(lines[i].replace(/^\d+\. /, ""))}</li>`
        );
        i++;
      }
      result.push(`<ol>\n${items.join("\n")}\n</ol>`);
      continue;
    }

    // Blank line separator
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph: collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,3} /.test(lines[i]) &&
      !/^h[123]\s*[:\-–—]/i.test(lines[i]) &&
      !/^- /.test(lines[i]) &&
      !/^\d+\. /.test(lines[i])
    ) {
      paraLines.push(formatInline(lines[i]));
      i++;
    }
    if (paraLines.length > 0) {
      result.push(`<p>${paraLines.join("<br />")}</p>`);
    }
  }

  return result.join("\n");
}

const BUTTON_STYLE =
  'display:inline-block;padding:10px 20px;background-color:#000000;color:#ffffff;text-decoration:none;border-radius:4px;font-weight:bold;';

function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(
      /\[btn:(.+?)\]\((.+?)\)/g,
      `<div style="text-align:center;margin:16px 0;"><a href="$2" style="${BUTTON_STYLE}">$1</a></div>`
    )
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
}

function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  return walkNode(doc.body).replace(/\n{3,}/g, "\n\n").trim();
}

function walkNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const style = el.getAttribute("style") ?? "";
  const isBold =
    tag === "strong" || tag === "b" ||
    /font-weight\s*:\s*(bold|700|800|900)/i.test(style);
  const isItalic =
    tag === "em" || tag === "i" ||
    /font-style\s*:\s*italic/i.test(style);

  const inner = Array.from(el.childNodes).map(walkNode).join("");

  switch (tag) {
    case "h1": return `# ${inner.trim()}\n\n`;
    case "h2": return `## ${inner.trim()}\n\n`;
    case "h3": return `### ${inner.trim()}\n\n`;
    case "a": {
      const href = el.getAttribute("href") ?? "";
      return `[${inner}](${href})`;
    }
    case "li":  return `- ${inner.trim()}\n`;
    case "ul":
    case "ol":  return `${inner}\n`;
    case "br":  return "\n";
    case "p":
    case "div": return `${inner.trim()}\n\n`;
    default: {
      let result = inner;
      if (isItalic) result = `*${result}*`;
      if (isBold)   result = `**${result}**`;
      return result;
    }
  }
}

export default function Converter() {
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [copied, setCopied] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkAsButton, setLinkAsButton] = useState(false);
  const [showGdocsForm, setShowGdocsForm] = useState(false);
  const [gdocsUrl, setGdocsUrl] = useState("");
  const [gdocsLoading, setGdocsLoading] = useState(false);
  const [gdocsError, setGdocsError] = useState("");
  const [showImageForm, setShowImageForm] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  function handleTextChange(value: string) {
    setText(value);
    setHtml(convertToHtml(value));
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const htmlData = e.clipboardData.getData("text/html");
    if (!htmlData) return; // no HTML in clipboard, let default paste happen

    e.preventDefault();

    // Convert pasted HTML to markdown
    const markdown = htmlToMarkdown(htmlData);

    const ta = textareaRef.current;
    const start = ta ? ta.selectionStart : text.length;
    const end = ta ? ta.selectionEnd : text.length;
    const newText = text.slice(0, start) + markdown + text.slice(end);
    handleTextChange(newText);

    setTimeout(() => {
      if (ta) {
        const pos = start + markdown.length;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleCopy() {
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function openLinkForm() {
    const ta = textareaRef.current;
    if (ta) {
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      selectionRef.current = { start, end };
      const selected = text.slice(start, end);
      setLinkText(selected || "");
    }
    setLinkUrl("");
    setShowLinkForm(true);
  }

  async function importFromGdocs() {
    setGdocsLoading(true);
    setGdocsError("");
    try {
      const res = await fetch(`/api/gdocs?url=${encodeURIComponent(gdocsUrl)}`);
      const data = await res.json();
      if (!res.ok) {
        setGdocsError(data.error || "Error desconocido");
      } else {
        handleTextChange(data.text);
        setShowGdocsForm(false);
        setGdocsUrl("");
      }
    } catch {
      setGdocsError("No se pudo conectar con el servidor");
    } finally {
      setGdocsLoading(false);
    }
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    setImageError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setImageError(data.error || "Error al subir la imagen");
      } else {
        setImageUrl(data.url);
      }
    } catch {
      setImageError("No se pudo subir la imagen");
    } finally {
      setImageUploading(false);
    }
  }

  function insertImage() {
    const ta = textareaRef.current;
    const start = ta ? ta.selectionStart : text.length;
    const end = ta ? ta.selectionEnd : text.length;
    const markdown = `![${imageAlt}](${imageUrl})`;
    const newText = text.slice(0, start) + markdown + text.slice(end);
    handleTextChange(newText);
    setShowImageForm(false);
    setImageUrl("");
    setImageAlt("");
    setTimeout(() => {
      if (ta) {
        ta.focus();
        const pos = start + markdown.length;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function insertLink() {
    const { start, end } = selectionRef.current;
    const markdown = linkAsButton
      ? `[btn:${linkText}](${linkUrl})`
      : `[${linkText}](${linkUrl})`;
    const newText = text.slice(0, start) + markdown + text.slice(end);
    handleTextChange(newText);
    setShowLinkForm(false);
    setLinkText("");
    setLinkUrl("");
    setLinkAsButton(false);
    setTimeout(() => {
      const ta = textareaRef.current;
      if (ta) {
        ta.focus();
        const pos = start + markdown.length;
        ta.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-6">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
          Texto a HTML
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Columna 1: Entrada de texto */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Texto
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowGdocsForm((v) => !v); setShowLinkForm(false); }}
                  className="text-xs bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded transition-colors"
                >
                  📄 Google Docs
                </button>
                <button
                  onClick={() => { setShowImageForm((v) => !v); setShowGdocsForm(false); setShowLinkForm(false); }}
                  className="text-xs bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded transition-colors"
                >
                  🖼️ Imagen
                </button>
                <button
                  onClick={() => { openLinkForm(); setShowGdocsForm(false); setShowImageForm(false); }}
                  className="text-xs bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded transition-colors"
                >
                  🔗 Insertar enlace
                </button>
              </div>
            </div>

            {showImageForm && (
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800">
                {/* File upload */}
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-zinc-500">Subir imagen a Supabase</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    disabled={imageUploading}
                    className="text-xs text-zinc-700 dark:text-zinc-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-zinc-100 dark:file:bg-zinc-700 file:text-zinc-700 dark:file:text-zinc-300 hover:file:bg-zinc-200"
                  />
                  {imageUploading && <span className="text-xs text-zinc-400">Subiendo...</span>}
                </label>

                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-600" />
                  o URL externa
                  <div className="flex-1 border-t border-zinc-200 dark:border-zinc-600" />
                </div>

                <input
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
                <input
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="Texto alternativo (alt)"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") insertImage();
                    if (e.key === "Escape") setShowImageForm(false);
                  }}
                />
                {imageError && <p className="text-xs text-red-500">{imageError}</p>}
                {imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={imageAlt} className="max-h-24 rounded object-contain border border-zinc-200 dark:border-zinc-600" />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={insertImage}
                    disabled={!imageUrl || imageUploading}
                    className="flex-1 text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
                  >
                    Insertar
                  </button>
                  <button
                    onClick={() => { setShowImageForm(false); setImageUrl(""); setImageAlt(""); setImageError(""); }}
                    className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {showGdocsForm && (
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800">
                <p className="text-xs text-zinc-500">El documento debe ser público (cualquiera con el enlace).</p>
                <input
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="https://docs.google.com/document/d/..."
                  value={gdocsUrl}
                  onChange={(e) => setGdocsUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") importFromGdocs();
                    if (e.key === "Escape") setShowGdocsForm(false);
                  }}
                />
                {gdocsError && <p className="text-xs text-red-500">{gdocsError}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={importFromGdocs}
                    disabled={!gdocsUrl || gdocsLoading}
                    className="flex-1 text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
                  >
                    {gdocsLoading ? "Importando..." : "Importar"}
                  </button>
                  <button
                    onClick={() => setShowGdocsForm(false)}
                    className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {showLinkForm && (
              <div className="flex flex-col gap-2 p-3 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800">
                <input
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="Texto del enlace"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                />
                <input
                  className="w-full rounded border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-700 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") insertLink();
                    if (e.key === "Escape") setShowLinkForm(false);
                  }}
                />
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={linkAsButton}
                    onChange={(e) => setLinkAsButton(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Mostrar como botón</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={insertLink}
                    disabled={!linkText || !linkUrl}
                    className="flex-1 text-xs bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-700 dark:hover:bg-zinc-300 disabled:opacity-40 transition-colors"
                  >
                    Insertar
                  </button>
                  <button
                    onClick={() => setShowLinkForm(false)}
                    className="text-xs px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-zinc-700 dark:text-zinc-300"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={textareaRef}
              className="h-[480px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder={"# Título\n\nEscribe tu texto aquí...\n\n- Lista item 1\n- Lista item 2\n\nTexto con **negrita** y *cursiva*."}
              value={text}
              onChange={(e) => handleTextChange(e.target.value)}
              onPaste={handlePaste}
            />
            <p className="text-xs text-zinc-500">
              Soporta:{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded"># H1</code>{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">## H2</code>{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">**negrita**</code>{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">*cursiva*</code>{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">- listas</code>{" "}
              <code className="bg-zinc-100 dark:bg-zinc-800 px-1 rounded">[texto](url)</code>
            </p>
          </div>

          {/* Columna 2: Código HTML */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Código HTML
              </label>
              {html && (
                <button
                  className="text-xs bg-zinc-100 dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded transition-colors"
                  onClick={handleCopy}
                >
                  {copied ? "¡Copiado!" : "Copiar"}
                </button>
              )}
            </div>
            <textarea
              className="h-[480px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-950 p-4 text-sm font-mono text-green-400 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="El código HTML aparecerá aquí..."
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
            />
          </div>

          {/* Columna 3: Vista previa renderizada */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Vista previa
            </label>
            <div className="h-[480px] w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-auto">
              {html ? (
                <div
                  className="p-4 text-sm text-zinc-900 dark:text-zinc-100 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_code]:bg-zinc-100 dark:[&_code]:bg-zinc-700 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_img]:max-w-full [&_img]:rounded [&_img]:my-2 [&_a]:text-blue-600 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-zinc-400">
                  La vista previa aparecerá aquí...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
