import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Undo,
  Redo,
  Type,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const FONT_SIZES = [
  { label: 'Pequeno', value: 'small' },
  { label: 'Normal', value: 'normal' },
  { label: 'Grande', value: 'large' },
  { label: 'Muito Grande', value: 'x-large' },
];

const FONT_FAMILIES = [
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", serif' },
  { label: 'Courier New', value: '"Courier New", monospace' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Digite seu texto aqui...',
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateContent();
  };

  const updateContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (!isComposingRef.current) {
      updateContent();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    updateContent();
  };

  const getFontSize = () => {
    if (!editorRef.current) return 'normal';
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 'normal';
    
    const range = selection.getRangeAt(0);
    const element = range.commonAncestorContainer as HTMLElement;
    const fontSize = window.getComputedStyle(element.nodeType === 3 ? element.parentElement! : element).fontSize;
    
    if (fontSize.includes('12px') || fontSize.includes('small')) return 'small';
    if (fontSize.includes('16px') || fontSize.includes('normal')) return 'normal';
    if (fontSize.includes('18px') || fontSize.includes('large')) return 'large';
    if (fontSize.includes('24px') || fontSize.includes('x-large')) return 'x-large';
    return 'normal';
  };

  const getFontFamily = () => {
    if (!editorRef.current) return FONT_FAMILIES[0].value;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return FONT_FAMILIES[0].value;
    
    const range = selection.getRangeAt(0);
    const element = range.commonAncestorContainer as HTMLElement;
    const fontFamily = window.getComputedStyle(element.nodeType === 3 ? element.parentElement! : element).fontFamily;
    
    return FONT_FAMILIES.find(f => fontFamily.includes(f.value.split(',')[0]))?.value || FONT_FAMILIES[0].value;
  };

  const handleFontSizeChange = (size: string) => {
    const sizeMap: Record<string, string> = {
      small: '12px',
      normal: '16px',
      large: '18px',
      'x-large': '24px',
    };
    execCommand('fontSize', '7');
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.style.fontSize = sizeMap[size];
        try {
          range.surroundContents(span);
        } catch (e) {
          span.appendChild(range.extractContents());
          range.insertNode(span);
        }
        updateContent();
      }
    }
  };

  const handleFontFamilyChange = (family: string) => {
    execCommand('fontName', family);
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap items-center gap-1">
        {/* Font Family */}
        <Select value={getFontFamily()} onValueChange={handleFontFamilyChange} disabled={disabled}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Font Size */}
        <Select value={getFontSize()} onValueChange={handleFontSizeChange} disabled={disabled}>
          <SelectTrigger className="h-8 w-[100px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size.value} value={size.value}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('bold')}
          disabled={disabled}
          title="Negrito (Ctrl+B)"
          aria-label="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('italic')}
          disabled={disabled}
          title="Itálico (Ctrl+I)"
          aria-label="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('underline')}
          disabled={disabled}
          title="Sublinhado (Ctrl+U)"
          aria-label="Sublinhado (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('strikeThrough')}
          disabled={disabled}
          title="Tachado"
          aria-label="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('justifyLeft')}
          disabled={disabled}
          title="Alinhar à esquerda"
          aria-label="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('justifyCenter')}
          disabled={disabled}
          title="Centralizar"
          aria-label="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('justifyRight')}
          disabled={disabled}
          title="Alinhar à direita"
          aria-label="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('justifyFull')}
          disabled={disabled}
          title="Justificar"
          aria-label="Justificar"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('insertUnorderedList')}
          disabled={disabled}
          title="Lista com marcadores"
          aria-label="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('insertOrderedList')}
          disabled={disabled}
          title="Lista numerada"
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('undo')}
          disabled={disabled}
          title="Desfazer (Ctrl+Z)"
          aria-label="Desfazer (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => execCommand('redo')}
          disabled={disabled}
          title="Refazer (Ctrl+Y)"
          aria-label="Refazer (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onCompositionStart={() => { isComposingRef.current = true; }}
        onCompositionEnd={() => { 
          isComposingRef.current = false;
          updateContent();
        }}
        className={cn(
          'min-h-[200px] max-h-[400px] overflow-y-auto p-4 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'prose prose-sm max-w-none dark:prose-invert',
          disabled && 'bg-muted cursor-not-allowed opacity-50'
        )}
        style={{
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
      
      <style>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] ul, [contenteditable] ol {
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        [contenteditable] p {
          margin: 0.5rem 0;
        }
        [contenteditable] h1, [contenteditable] h2, [contenteditable] h3 {
          margin: 1rem 0 0.5rem 0;
          font-weight: bold;
        }
        [contenteditable] h1 { font-size: 2em; }
        [contenteditable] h2 { font-size: 1.5em; }
        [contenteditable] h3 { font-size: 1.17em; }
      `}</style>
    </div>
  );
}
