import { useEffect, useMemo, useRef } from 'react';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  type MDXEditorMethods,
  Separator,
  UndoRedo,
  diffSourcePlugin,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
} from '@mdxeditor/editor';
import { resolveMarkdownAssetUrl } from '@/lib/markdown';
import { cn } from '@/lib/utils';

interface DocumentEditorProps {
  markdown: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  uploadImage?: (file: File) => Promise<string>;
}

export function DocumentEditor({ markdown, onChange, placeholder, className, uploadImage }: DocumentEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const lastMarkdownRef = useRef(markdown);

  useEffect(() => {
    if (markdown !== lastMarkdownRef.current) {
      editorRef.current?.setMarkdown(markdown);
      lastMarkdownRef.current = markdown;
    }
  }, [markdown]);

  const plugins = useMemo(
    () => [
      headingsPlugin({ allowedHeadingLevels: [1, 2, 3, 4] }),
      quotePlugin(),
      listsPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      thematicBreakPlugin(),
      tablePlugin(),
      markdownShortcutPlugin(),
      imagePlugin({
        imageUploadHandler: uploadImage ? async (image) => uploadImage(image) : undefined,
        imagePreviewHandler: async (imageSource) => resolveMarkdownAssetUrl(imageSource) ?? imageSource,
      }),
      diffSourcePlugin({ viewMode: 'rich-text' }),
      toolbarPlugin({
        toolbarContents: () => (
          <DiffSourceToggleWrapper options={['rich-text', 'source']}>
            <UndoRedo />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <BoldItalicUnderlineToggles />
            <CodeToggle />
            <Separator />
            <ListsToggle />
            <Separator />
            <CreateLink />
            <InsertTable />
            <InsertThematicBreak />
            <InsertImage />
          </DiffSourceToggleWrapper>
        ),
      }),
    ],
    [uploadImage],
  );

  return (
    <MDXEditor
      ref={editorRef}
      markdown={markdown}
      onChange={(nextMarkdown) => {
        lastMarkdownRef.current = nextMarkdown;
        onChange(nextMarkdown);
      }}
      className={cn('mdx-editor-shell', className)}
      contentEditableClassName="prose prose-sm max-w-none min-h-[220px] px-3 py-2 focus:outline-none"
      placeholder={placeholder}
      plugins={plugins}
    />
  );
}
