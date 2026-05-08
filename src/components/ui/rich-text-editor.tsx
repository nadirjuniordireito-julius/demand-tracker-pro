import { useEffect } from 'react';
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
  Quote,
  Link as LinkIcon,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Highlighter,
  Table as TableIcon,
  ListChecks,
  Minus,
  Paintbrush,
  Eraser,
  Trash2,
  Plus,
} from 'lucide-react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
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
  height?: string;
}

const FONT_SIZES = [
  { label: 'Pequeno', value: '12px' },
  { label: 'Normal', value: '16px' },
  { label: 'Grande', value: '18px' },
  { label: 'Muito Grande', value: '24px' },
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
  height = '120px',
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: value || '',
    editable: !disabled,
    onUpdate: ({ editor: currentEditor }) => {
      const html = currentEditor.getHTML();
      if (html !== value) {
        onChange(html);
      }
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== (value || '')) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const getFontFamily = () =>
    (editor?.getAttributes('textStyle').fontFamily as string | undefined) || FONT_FAMILIES[0].value;

  const getFontSize = () =>
    (editor?.getAttributes('textStyle').fontSize as string | undefined) || FONT_SIZES[1].value;

  const handleFontFamilyChange = (family: string) => {
    if (!editor) return;
    editor.chain().focus().setMark('textStyle', { fontFamily: family }).run();
  };

  const handleFontSizeChange = (size: string) => {
    if (!editor) return;
    editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
  };

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Informe a URL', previousUrl || '');
    if (url === null) return;
    const normalized = url.trim();
    if (!normalized) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: normalized }).run();
  };

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="border-b bg-muted/50 p-2 flex flex-wrap items-center gap-1">
        {/* Font Family */}
        <Select value={getFontFamily()} onValueChange={handleFontFamilyChange} disabled={disabled || !editor}>
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
        <Select value={getFontSize()} onValueChange={handleFontSizeChange} disabled={disabled || !editor}>
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

        <Button
          type="button"
          variant={editor?.isActive('paragraph') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().setParagraph().run()}
          disabled={disabled || !editor}
          title="Parágrafo"
          aria-label="Parágrafo"
        >
          <Type className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          disabled={disabled || !editor}
          title="Título 1"
          aria-label="Título 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          disabled={disabled || !editor}
          title="Título 2"
          aria-label="Título 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          disabled={disabled || !editor}
          title="Título 3"
          aria-label="Título 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Text Formatting */}
        <Button
          type="button"
          variant={editor?.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          disabled={disabled || !editor}
          title="Negrito (Ctrl+B)"
          aria-label="Negrito (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          disabled={disabled || !editor}
          title="Itálico (Ctrl+I)"
          aria-label="Itálico (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('underline') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          disabled={disabled || !editor}
          title="Sublinhado (Ctrl+U)"
          aria-label="Sublinhado (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('strike') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          disabled={disabled || !editor}
          title="Tachado"
          aria-label="Tachado"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={editor?.isActive('code') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleCode().run()}
          disabled={disabled || !editor}
          title="Código inline"
          aria-label="Código inline"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          disabled={disabled || !editor}
          title="Citação"
          aria-label="Citação"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('link') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={setLink}
          disabled={disabled || !editor}
          title="Inserir/editar link"
          aria-label="Inserir/editar link"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <label className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md border cursor-pointer">
          <Paintbrush className="h-4 w-4" />
          <input
            type="color"
            className="sr-only"
            disabled={disabled || !editor}
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            title="Cor do texto"
            aria-label="Cor do texto"
          />
        </label>
        <label className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md border cursor-pointer">
          <Highlighter className="h-4 w-4" />
          <input
            type="color"
            className="sr-only"
            disabled={disabled || !editor}
            onChange={(e) => editor?.chain().focus().toggleHighlight({ color: e.target.value }).run()}
            title="Cor de destaque"
            aria-label="Cor de destaque"
          />
        </label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().unsetColor().unsetHighlight().run()}
          disabled={disabled || !editor}
          title="Limpar cor e destaque"
          aria-label="Limpar cor e destaque"
        >
          <Eraser className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Alignment */}
        <Button
          type="button"
          variant={editor?.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
          disabled={disabled || !editor}
          title="Alinhar à esquerda"
          aria-label="Alinhar à esquerda"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
          disabled={disabled || !editor}
          title="Centralizar"
          aria-label="Centralizar"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
          disabled={disabled || !editor}
          title="Alinhar à direita"
          aria-label="Alinhar à direita"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
          disabled={disabled || !editor}
          title="Justificar"
          aria-label="Justificar"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Lists */}
        <Button
          type="button"
          variant={editor?.isActive('bulletList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          disabled={disabled || !editor}
          title="Lista com marcadores"
          aria-label="Lista com marcadores"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('orderedList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          disabled={disabled || !editor}
          title="Lista numerada"
          aria-label="Lista numerada"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('taskList') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().toggleTaskList().run()}
          disabled={disabled || !editor}
          title="Checklist"
          aria-label="Checklist"
        >
          <ListChecks className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
          disabled={disabled || !editor}
          title="Linha horizontal"
          aria-label="Linha horizontal"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant={editor?.isActive('table') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          disabled={disabled || !editor}
          title="Inserir tabela"
          aria-label="Inserir tabela"
        >
          <TableIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().addRowAfter().run()}
          disabled={disabled || !editor || !editor.can().addRowAfter()}
          title="Adicionar linha"
          aria-label="Adicionar linha"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().deleteTable().run()}
          disabled={disabled || !editor || !editor.can().deleteTable()}
          title="Remover tabela"
          aria-label="Remover tabela"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo/Redo */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().undo().run()}
          disabled={disabled || !editor || !editor.can().undo()}
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
          onClick={() => editor?.chain().focus().redo().run()}
          disabled={disabled || !editor || !editor.can().redo()}
          title="Refazer (Ctrl+Y)"
          aria-label="Refazer (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          disabled={disabled || !editor}
          title="Limpar formatação"
          aria-label="Limpar formatação"
        >
          <Eraser className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className={cn(
          'overflow-y-auto p-4 block',
          '[&_.ProseMirror]:min-h-[120px] [&_.ProseMirror]:outline-none',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          disabled && 'bg-muted cursor-not-allowed opacity-50'
        )}
        style={{
          minHeight: height,
        }}
      />
      
      <style>{`
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          float: left;
          height: 0;
        }
        .ProseMirror ul, .ProseMirror ol {
          list-style-position: outside;
          padding-left: 1.5rem;
          margin-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .ProseMirror ul {
          list-style-type: disc;
        }
        .ProseMirror ol {
          list-style-type: decimal;
        }
        .ProseMirror li {
          display: list-item;
        }
        .ProseMirror a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .ProseMirror p {
          margin: 0.5rem 0;
        }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 {
          margin: 1rem 0 0.5rem 0;
          font-weight: bold;
        }
        .ProseMirror h1 { font-size: 2em; }
        .ProseMirror h2 { font-size: 1.5em; }
        .ProseMirror h3 { font-size: 1.17em; }
        .ProseMirror blockquote {
          border-left: 3px solid hsl(var(--border));
          padding-left: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin: 0.75rem 0;
        }
        .ProseMirror pre {
          background: hsl(var(--muted));
          border-radius: 0.375rem;
          padding: 0.75rem;
          overflow-x: auto;
        }
        .ProseMirror table {
          border-collapse: collapse;
          width: 100%;
          margin: 0.75rem 0;
        }
        .ProseMirror th, .ProseMirror td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
          vertical-align: top;
        }
        .ProseMirror th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .ProseMirror ul[data-type="taskList"] {
          list-style: none;
          margin-left: 0;
          padding-left: 0.25rem;
        }
        .ProseMirror ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin: 0.25rem 0;
        }
        .ProseMirror ul[data-type="taskList"] li > label {
          margin-top: 0.15rem;
        }
        .ProseMirror ul[data-type="taskList"] li > div {
          flex: 1;
        }
      `}</style>
    </div>
  );
}
