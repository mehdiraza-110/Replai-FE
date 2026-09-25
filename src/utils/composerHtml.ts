const ALLOWED_TAGS = new Set(["b", "strong", "i", "em", "u", "p", "div", "br", "ul", "ol", "li", "a"]);
const SAFE_URL_PATTERN = /^(https?:|mailto:)/i;

export function sanitizeComposerHtml(value: string) {
  if (!value || typeof window === "undefined") return "";

  const documentNode = new DOMParser().parseFromString(value, "text/html");
  documentNode.querySelectorAll("script, style, link, meta, iframe, object, embed, img, table").forEach((node) => node.remove());
  documentNode.body.querySelectorAll("*").forEach((node) => {
    const tagName = node.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      node.replaceWith(documentNode.createTextNode(node.textContent || ""));
      return;
    }

    if (tagName === "a") {
      const href = node.getAttribute("href") || "";
      [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));

      if (!SAFE_URL_PATTERN.test(href)) {
        node.replaceWith(documentNode.createTextNode(node.textContent || ""));
        return;
      }

      node.setAttribute("href", href);
      node.setAttribute("rel", "noopener noreferrer");
      node.setAttribute("target", "_blank");
      return;
    }

    [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));
  });

  return documentNode.body.innerHTML.trim();
}

export function isComposerEmpty(value: string) {
  if (!value) return true;

  const text = value
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<\/?(div|p|ul|ol|li|strong|b|em|i|u)>/gi, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return text.length === 0;
}
