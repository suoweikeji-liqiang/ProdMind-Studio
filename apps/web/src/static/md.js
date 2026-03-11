/* Lightweight markdown renderer for ProdMind Studio session timeline.
   Supports: ## headings, **bold**, *italic*, `code`, - lists, numbered lists, blank line gaps.
   No dependencies. */
function renderMarkdown(text) {
  if (!text) return '';
  var reHeading = /^#{1,2}\s/;
  var reBullet  = /^[-*+]\s/;
  var reOrdered = /^\d+\.\s/;
  var lines = String(text).split('\n');
  var out = [];
  var inList = false;

  function closeList() {
    if (inList) { out.push('</ul>'); inList = false; }
  }

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function inlineFormat(s) {
    var t = esc(s);
    t = t.replace(/`([^`]+)`/g,           '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g,     '<strong>$1</strong>');
    t = t.replace(/\*([^*]+)\*/g,         '<em>$1</em>');
    t = t.replace(/__([^_]+)__/g,         '<strong>$1</strong>');
    t = t.replace(/_([^_]+)_/g,           '<em>$1</em>');
    return t;
  }

  for (var i = 0; i < lines.length; i++) {
    var raw = lines[i];
    var line = raw.replace(/\s+$/, '');
    if (reHeading.test(line)) {
      closeList();
      var level = line.indexOf('## ') === 0 ? 3 : 4;
      var hcontent = inlineFormat(line.replace(/^#+\s+/, ''));
      out.push('<h' + level + ' style="margin:10px 0 4px;font-size:' + (level === 3 ? '1rem' : '0.95rem') + ';">' + hcontent + '</h' + level + '>');
    } else if (reBullet.test(line)) {
      if (!inList) { out.push('<ul style="margin:4px 0;padding-left:20px;">'); inList = true; }
      out.push('<li style="margin:2px 0;color:inherit;">' + inlineFormat(line.replace(/^[-*+]\s+/, '')) + '</li>');
    } else if (reOrdered.test(line)) {
      closeList();
      out.push('<p style="margin:2px 0;">' + inlineFormat(line) + '</p>');
    } else if (line === '') {
      closeList();
      out.push('<div style="height:6px;"></div>');
    } else {
      closeList();
      out.push('<p style="margin:4px 0;line-height:1.6;color:inherit;">' + inlineFormat(line) + '</p>');
    }
  }
  closeList();
  return out.join('');
}
