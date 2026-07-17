import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  DiffSourceToggleWrapper,
  InsertCodeBlock,
  InsertImage,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  UndoRedo,
  codeBlockPlugin,
  codeMirrorPlugin,
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
import type {
  ImageUploadHandler,
  MDXEditorMethods,
} from '@mdxeditor/editor';
import { useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import '@mdxeditor/editor/style.css';
import styles from './RichText.module.css';

export type RichTextProps = {
  autoFocus?: boolean;
  className?: string;
  defaultValue?: string;
  disabled?: boolean;
  errorMessage?: ReactNode;
  helperText?: ReactNode;
  id?: string;
  /** Optional upload adapter. Without it, images can still be inserted by URL. */
  imageUploadHandler?: ImageUploadHandler;
  /** Visible label. When omitted, provide aria-label. */
  label?: ReactNode;
  maxLength?: number;
  onBlur?: (event: FocusEvent) => void;
  onChange?: (markdown: string) => void;
  onParseError?: (error: string, source: string) => void;
  placeholder?: ReactNode;
  readOnly?: boolean;
  required?: boolean;
  showCharacterCount?: boolean;
  spellCheck?: boolean;
  'aria-label'?: string;
};

function RichTextToolbar() {
  return (
    <DiffSourceToggleWrapper>
      <UndoRedo />
      <BlockTypeSelect />
      <BoldItalicUnderlineToggles />
      <CodeToggle />
      <ListsToggle />
      <CreateLink />
      <InsertImage />
      <InsertTable />
      <InsertThematicBreak />
      <InsertCodeBlock />
    </DiffSourceToggleWrapper>
  );
}

export function RichText({
  'aria-label': ariaLabel,
  autoFocus,
  className,
  defaultValue = '',
  disabled = false,
  errorMessage,
  helperText,
  id,
  imageUploadHandler,
  label,
  maxLength,
  onBlur,
  onChange,
  onParseError,
  placeholder = 'Enter text',
  readOnly = false,
  required = false,
  showCharacterCount = false,
  spellCheck,
}: RichTextProps) {
  const generatedId = useId();
  const editorRef = useRef<MDXEditorMethods>(null);
  const lastAcceptedMarkdown = useRef(defaultValue);
  const [characterCount, setCharacterCount] = useState(defaultValue.length);
  const fieldId = id ?? generatedId;
  const labelId = label ? `${fieldId}-label` : undefined;
  const helperId = helperText ? `${fieldId}-helper` : undefined;
  const errorId = errorMessage ? `${fieldId}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(' ');
  const isReadOnly = disabled || readOnly;
  const fieldClasses = [styles.field, className].filter(Boolean).join(' ');
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({ imageUploadHandler }),
      tablePlugin(),
      codeBlockPlugin({ defaultCodeBlockLanguage: 'text' }),
      codeMirrorPlugin({
        codeBlockLanguages: {
          text: 'Plain text',
          js: 'JavaScript',
          ts: 'TypeScript',
          tsx: 'TypeScript (React)',
          json: 'JSON',
          css: 'CSS',
          markdown: 'Markdown',
        },
      }),
      diffSourcePlugin({ viewMode: 'rich-text' }),
      markdownShortcutPlugin(),
      toolbarPlugin({
        toolbarClassName: styles.toolbar,
        toolbarContents: RichTextToolbar,
      }),
    ],
    [imageUploadHandler],
  );

  function handleChange(markdown: string) {
    if (maxLength !== undefined && markdown.length > maxLength) {
      editorRef.current?.setMarkdown(lastAcceptedMarkdown.current);
      return;
    }

    lastAcceptedMarkdown.current = markdown;
    setCharacterCount(markdown.length);
    onChange?.(markdown);
  }

  return (
    <div className={fieldClasses}>
      {label ? (
        <div className={styles.labelRow}>
          <span className={styles.label} id={labelId}>
            {label}
          </span>
          {required ? <span className={styles.required}>Required</span> : null}
        </div>
      ) : null}

      <div
        aria-describedby={describedBy || undefined}
        aria-disabled={disabled || undefined}
        aria-invalid={errorMessage ? true : undefined}
        aria-label={label ? undefined : ariaLabel}
        aria-labelledby={labelId}
        aria-readonly={isReadOnly || undefined}
        aria-required={required || undefined}
        className={styles.editorFrame}
        id={fieldId}
        role="group"
      >
        <MDXEditor
          autoFocus={autoFocus}
          className={styles.editor}
          contentEditableClassName={styles.contentEditable}
          markdown={defaultValue}
          onBlur={onBlur}
          onChange={handleChange}
          onError={({ error, source }) => onParseError?.(error, source)}
          placeholder={placeholder}
          plugins={plugins}
          readOnly={isReadOnly}
          ref={editorRef}
          spellCheck={spellCheck}
        />
      </div>

      {helperText || showCharacterCount ? (
        <div className={styles.supportRow}>
          {helperText ? (
            <div className={styles.helperText} id={helperId}>
              {helperText}
            </div>
          ) : (
            <span />
          )}
          {showCharacterCount ? (
            <output className={styles.characterCount} htmlFor={fieldId}>
              {characterCount}
              {maxLength === undefined ? null : `/${maxLength}`}
              <span className={styles.srOnly}> Markdown characters</span>
            </output>
          ) : null}
        </div>
      ) : null}
      {errorMessage ? (
        <div className={styles.errorMessage} id={errorId} role="alert">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}
