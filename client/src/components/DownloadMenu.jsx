import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, FileCode, X } from 'lucide-react';

export default function DownloadMenu({ document, getText, onClose }) {
  const [show, setShow] = useState(true);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShow(false);
        onClose?.();
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  if (!show || !document) return null;

  const title = document.title || 'Untitled Document';
  const content = typeof getText === 'function' ? getText() : '';

  const downloadFile = (filename, textContent, mimeType = 'text/plain') => {
    const blob = new Blob([textContent], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShow(false);
    onClose?.();
  };

  const handleTxt = () => {
    downloadFile(`${title}.txt`, content, 'text/plain');
  };

  const handleMarkdown = () => {
    const mdContent = `# ${title}\n\n${content}`;
    downloadFile(`${title}.md`, mdContent, 'text/markdown');
  };

  const handlePdf = () => {
    // Use browser print-to-PDF approach
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; line-height: 1.8; color: #1a1a2e; }
            h1 { font-size: 24px; margin-bottom: 20px; color: #0f1117; border-bottom: 2px solid #4f8ef7; padding-bottom: 10px; }
            pre { white-space: pre-wrap; word-wrap: break-word; font-size: 14px; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <pre>${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const formats = [
    { label: 'Plain Text', ext: '.txt', icon: FileText, handler: handleTxt },
    { label: 'Markdown', ext: '.md', icon: FileCode, handler: handleMarkdown },
    { label: 'PDF (Print)', ext: '.pdf', icon: FileText, handler: handlePdf },
  ];

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute top-full right-0 mt-1.5 w-48 rounded-xl border shadow-2xl z-50 overflow-hidden"
      style={{
        background: 'rgba(22, 27, 39, 0.95)',
        backdropFilter: 'blur(16px)',
        borderColor: 'rgba(42, 51, 82, 0.6)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5), 0 0 15px rgba(79,142,247,0.1)',
      }}
    >
      <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'rgba(42, 51, 82, 0.4)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Download as</span>
        <button onClick={() => { setShow(false); onClose?.(); }} className="p-0.5 rounded hover:bg-white/5 cursor-pointer">
          <X size={12} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
      {formats.map((f) => {
        const Icon = f.icon;
        return (
          <button
            key={f.ext}
            onClick={f.handler}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-all hover:bg-white/5 cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
          >
            <Icon size={14} style={{ color: 'var(--accent-blue)' }} />
            <span>{f.label}</span>
            <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>{f.ext}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
