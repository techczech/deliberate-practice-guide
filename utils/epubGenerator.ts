import * as JSZipPkg from 'jszip';
import * as FileSaverPkg from 'file-saver';
import { GUIDE_CONTENT } from '../data';

let JSZip: any;
let saveAs: any;

try {
  // Handle various module formats (ESM, CJS, CDN wrappers) robustly
  // @ts-ignore
  JSZip = JSZipPkg.default || JSZipPkg;
  // @ts-ignore
  saveAs = FileSaverPkg.saveAs || FileSaverPkg.default?.saveAs || FileSaverPkg.default || FileSaverPkg;
} catch (e) {
  console.error("Module resolution error in epubGenerator:", e);
}

// 1. Robust XML Escaping
const escapeXml = (unsafe: string) => {
  if (!unsafe) return "";
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

// 2. Markdown to XHTML Converter (XML-Safe)
const markdownToXhtml = (markdown: string) => {
  if (!markdown) return "";

  // Step A: Escape ALL content first
  let html = escapeXml(markdown);

  // Step B: Pre-process Block Elements to avoid nesting issues
  
  // Extract Asides to prevent P wrapping DIV
  // We replace them with a placeholder surrounded by newlines to ensure they become their own blocks
  const asideMap = new Map<string, string>();
  html = html.replace(/&lt;aside&gt;([\s\S]*?)&lt;\/aside&gt;/g, (match, content) => {
      const key = `__ASIDE_PLACEHOLDER_${asideMap.size}__`;
      // Convert newlines inside aside to breaks so they format nicely in the div
      const processedContent = content.trim().replace(/\n/g, '<br/>');
      asideMap.set(key, `<div class="aside">${processedContent}</div>`);
      // Force double newlines around placeholder to ensure it gets split into its own block
      return `\n\n${key}\n\n`; 
  });

  // Handle Images (converted to span to be safe inside p, or div if standalone)
  // We'll make them span-based placeholders to be safe anywhere
  html = html.replace(/&lt;img.*?alt=&quot;(.*?)&quot;.*?\/&gt;/g, '<span class="image-placeholder">[Image: $1]</span>');

  // Step C: Inline Formatting
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Blockquotes
  html = html.replace(/^&gt; (.*$)/gm, '<blockquote>$1</blockquote>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Step D: Lists
  // Convert list items
  const lines = html.split('\n');
  let inList = false;
  let processedLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]; // keep whitespace for now? No, trimming is usually safer for regex
    
    // Check for list markers
    const numberMatch = line.match(/^\d+\. (.*)$/);
    const bulletMatch = line.match(/^- (.*)$/);
    
    if (numberMatch || bulletMatch) {
        const content = numberMatch ? numberMatch[1] : (bulletMatch ? bulletMatch[1] : '');
        line = `<li>${content}</li>`;
        
        if (!inList) {
            processedLines.push('<ul>');
            inList = true;
        }
        processedLines.push(line);
    } else {
        if (inList) {
            processedLines.push('</ul>');
            inList = false;
        }
        // If the line is empty, don't push it if we just closed a list, helps cleanup
        if (line.trim() !== '') {
            processedLines.push(line);
        }
    }
  }
  if (inList) processedLines.push('</ul>');
  html = processedLines.join('\n');

  // Step E: Paragraphs
  // Split by double newlines. 
  const blocks = html.split(/\n\n+/);
  html = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      
      // If it's an aside placeholder, return it naked (it will become a div)
      if (asideMap.has(trimmed)) {
          return trimmed;
      }
      
      // If it's a block tag, return naked
      if (trimmed.startsWith('<h') || 
          trimmed.startsWith('<ul>') || 
          trimmed.startsWith('<blockquote>') ||
          trimmed.startsWith('<div')
         ) {
          return trimmed;
      }
      
      return `<p>${trimmed}</p>`;
  }).join('\n');

  // Step F: Restore Asides
  asideMap.forEach((value, key) => {
      html = html.replace(key, value);
  });

  return html;
};

export const generateEPUB = async () => {
  if (!JSZip || !saveAs) {
    console.error("Dependencies not loaded correctly");
    throw new Error("Dependencies missing");
  }
  
  const zip = new JSZip();

  // 1. Mimetype (MUST be first, uncompressed)
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // 2. Container XML
  const containerXml = `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.folder('META-INF')?.file('container.xml', containerXml);

  // 3. OEBPS Folder
  const oebps = zip.folder('OEBPS');

  // CSS
  const css = `
    body { font-family: serif; line-height: 1.6; padding: 0 1em; }
    h1 { color: #111827; margin-top: 2em; text-align: center; }
    h2 { color: #1f2937; margin-top: 1.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
    h3 { color: #374151; margin-top: 1.2em; }
    p { margin-bottom: 1em; text-align: justify; }
    ul { padding-left: 1.5em; margin-bottom: 1em; }
    li { margin-bottom: 0.5em; }
    .aside { 
        background-color: #f3f4f6; 
        border-left: 4px solid #6366f1; 
        padding: 1em; 
        margin: 2em 0;
        font-style: italic;
        color: #4b5563;
        page-break-inside: avoid;
    }
    blockquote { 
        margin: 1.5em 2em; 
        color: #4b5563; 
        border-left: 3px solid #d1d5db; 
        padding-left: 1em; 
        font-style: italic;
    }
    .image-placeholder {
        background: #f9fafb;
        border: 1px dashed #9ca3af;
        padding: 0.2em 0.5em;
        color: #6b7280;
        font-size: 0.9em;
    }
  `;
  oebps?.file('style.css', css);

  // 4. Content Generation
  let manifest = '';
  let spine = '';
  let navPoints = '';
  
  // 4a. Introduction (Home Page Content)
  const introContent = `
    <div style="text-align: center; margin-top: 20%;">
        <h1 style="margin: 0;">Guide to Deliberate Practice</h1>
        <h2 style="margin-top: 0.5em; font-weight: normal; border: none;">A Universal Learning Method</h2>
        <p style="text-align: center; margin-top: 2em; color: #666;">By Dominik Lukeš</p>
    </div>
    
    <h2 style="margin-top: 4em;">About this Guide</h2>
    <p>The key limit to fluent performance is working memory. Deliberate practice is the only way to overcome the limits of working memory.</p>
    
    <h3>Key Concepts</h3>
    <ul>
        <li><strong>Working Memory:</strong> The bottleneck of learning. Understand its limits to break through performance plateaus.</li>
        <li><strong>Mental Schemas:</strong> Build robust mental representations (chunks) to bypass cognitive overload.</li>
        <li><strong>Targeted Practice:</strong> Don't just repeat. Use reflection, feedback loops, and specific design to improve.</li>
    </ul>
  `;

  const introXhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
    <title>Introduction</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
    ${introContent}
</body>
</html>`;

  oebps?.file('intro.xhtml', introXhtml);
  manifest += `<item id="intro" href="intro.xhtml" media-type="application/xhtml+xml"/>\n`;
  spine += `<itemref idref="intro"/>\n`;
  navPoints += `
    <navPoint id="navPoint-0" playOrder="0">
      <navLabel><text>Introduction</text></navLabel>
      <content src="intro.xhtml"/>
    </navPoint>
  `;

  // 4b. Sections
  GUIDE_CONTENT.forEach((section, index) => {
    const fileName = `section-${index}.xhtml`;
    const safeTitle = escapeXml(section.title);
    const safeContent = markdownToXhtml(section.content);
    
    const xhtml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
    <title>${safeTitle}</title>
    <link rel="stylesheet" type="text/css" href="style.css" />
</head>
<body>
    ${safeContent}
</body>
</html>`;
    
    oebps?.file(fileName, xhtml);
    
    const id = `section-${index}`;
    manifest += `<item id="${id}" href="${fileName}" media-type="application/xhtml+xml"/>\n`;
    spine += `<itemref idref="${id}"/>\n`;
    navPoints += `
        <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
            <navLabel><text>${safeTitle}</text></navLabel>
            <content src="${fileName}"/>
        </navPoint>
    `;
  });

  // 5. Package Definition (OPF)
  const contentOpf = `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
        <dc:title>Guide to Deliberate Practice</dc:title>
        <dc:creator opf:role="aut">Dominik Lukeš</dc:creator>
        <dc:language>en</dc:language>
        <dc:identifier id="BookId" opf:scheme="UUID">urn:uuid:deliberate-practice-guide-v1</dc:identifier>
        <dc:description>An interactive guide for the Deliberate Practice learning method.</dc:description>
    </metadata>
    <manifest>
        <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
        <item id="style" href="style.css" media-type="text/css"/>
        ${manifest}
    </manifest>
    <spine toc="ncx">
        ${spine}
    </spine>
</package>`;
  oebps?.file('content.opf', contentOpf);

  // 6. Table of Contents (NCX)
  const tocNcx = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
    <head>
        <meta name="dtb:uid" content="urn:uuid:deliberate-practice-guide-v1"/>
        <meta name="dtb:depth" content="1"/>
        <meta name="dtb:totalPageCount" content="0"/>
        <meta name="dtb:maxPageNumber" content="0"/>
    </head>
    <docTitle><text>Guide to Deliberate Practice</text></docTitle>
    <navMap>
        ${navPoints}
    </navMap>
</ncx>`;
  oebps?.file('toc.ncx', tocNcx);

  // 7. Generate Blob
  const content = await zip.generateAsync({ type: 'blob' });
  
  saveAs(content, 'Deliberate_Practice_Guide.epub');
};