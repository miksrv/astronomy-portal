import React, { useId, useState } from 'react'
import Markdown from 'react-markdown'
import { Button, cn, Icon, TextArea } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import { SegmentedControl } from '@/components/ui'

import { insertLink, MarkdownEdit, prefixLines, wrapSelection } from './utils'

import styles from './styles.module.sass'

interface MarkdownEditorProps {
    name?: string
    value: string
    label?: string
    /** Under the field when there is no error */
    hint?: string
    error?: string
    required?: boolean
    disabled?: boolean
    /** The height of the empty field, in lines; it grows with the text */
    rows?: number
    className?: string
    onChange: (value: string) => void
    onBlur?: () => void
}

type EditorView = 'write' | 'preview'

type Command = 'bold' | 'italic' | 'heading' | 'list' | 'numbered' | 'quote' | 'link'

/**
 * Markdown text with a formatting toolbar (bold, italic, a heading, lists, a quote, a link —
 * also ⌘/Ctrl+B, I, K) and a preview drawn by the same `react-markdown` the site renders the text
 * with, so the editor sees exactly what visitors will. The text itself stays plain Markdown in a
 * kit `TextArea`: nothing to migrate, and the browser's undo keeps working.
 */
export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
    name,
    value,
    label,
    hint,
    error,
    required,
    disabled,
    rows = 8,
    className,
    onChange,
    onBlur
}) => {
    const { t } = useTranslation()
    const id = useId()

    const [view, setView] = useState<EditorView>('write')

    const textarea = () => document.getElementById(id) as HTMLTextAreaElement | null

    const apply = (edit: MarkdownEdit) => {
        const element = textarea()

        if (!element) {
            return
        }

        element.focus()
        element.setSelectionRange(0, element.value.length)

        // Through the browser's editing, so ⌘Z undoes the formatting; the input event it fires
        // reaches `onChange` like typing would
        const inserted = document.execCommand?.('insertText', false, edit.text)

        if (!inserted || element.value !== edit.text) {
            onChange(edit.text)
        }

        requestAnimationFrame(() => textarea()?.setSelectionRange(edit.selectionStart, edit.selectionEnd))
    }

    const run = (command: Command) => {
        const element = textarea()

        if (!element || disabled) {
            return
        }

        const { selectionStart: start, selectionEnd: end } = element
        const text = element.value

        const placeholder = t('components.common.markdown-editor.placeholder', 'текст')

        const edits: Record<Command, () => MarkdownEdit> = {
            bold: () => wrapSelection(text, start, end, '**', placeholder),
            italic: () => wrapSelection(text, start, end, '*', placeholder),
            heading: () => prefixLines(text, start, end, '### '),
            list: () => prefixLines(text, start, end, '- '),
            numbered: () => prefixLines(text, start, end, '1. '),
            quote: () => prefixLines(text, start, end, '> '),
            link: () => insertLink(text, start, end, t('components.common.markdown-editor.link-text', 'текст ссылки'))
        }

        apply(edits[command]())
    }

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) {
            return
        }

        const command = ({ b: 'bold', i: 'italic', k: 'link' } as Record<string, Command>)[event.key.toLowerCase()]

        if (command) {
            event.preventDefault()
            run(command)
        }
    }

    const tools: Array<{ command: Command; label: string; content: React.ReactNode }> = [
        {
            command: 'bold',
            label: t('components.common.markdown-editor.bold', 'Жирный (⌘B)'),
            content: <b>{'B'}</b>
        },
        {
            command: 'italic',
            label: t('components.common.markdown-editor.italic', 'Курсив (⌘I)'),
            content: <i>{'I'}</i>
        },
        {
            command: 'heading',
            label: t('components.common.markdown-editor.heading', 'Подзаголовок'),
            content: 'H'
        },
        {
            command: 'list',
            label: t('components.common.markdown-editor.list', 'Список'),
            content: '•'
        },
        {
            command: 'numbered',
            label: t('components.common.markdown-editor.numbered', 'Нумерованный список'),
            content: '1.'
        },
        {
            command: 'quote',
            label: t('components.common.markdown-editor.quote', 'Цитата'),
            content: '❝'
        },
        {
            command: 'link',
            label: t('components.common.markdown-editor.link', 'Ссылка (⌘K)'),
            content: <Icon name={'Link'} />
        }
    ]

    return (
        <div className={cn(styles.markdownEditor, className)}>
            <div className={styles.header}>
                {label && (
                    <label
                        htmlFor={id}
                        className={cn(styles.label, required && styles.required)}
                    >
                        {label}
                    </label>
                )}
                <SegmentedControl<EditorView>
                    className={styles.views}
                    aria-label={t('components.common.markdown-editor.view', 'Вид')}
                    value={view}
                    options={[
                        { key: 'write', label: t('components.common.markdown-editor.write', 'Текст') },
                        { key: 'preview', label: t('components.common.markdown-editor.preview', 'Просмотр') }
                    ]}
                    onChange={setView}
                />
            </div>

            <div className={cn(styles.box, error && styles.error, view === 'preview' && styles.hidden)}>
                <div
                    className={styles.toolbar}
                    role={'toolbar'}
                    aria-label={t('components.common.markdown-editor.toolbar', 'Форматирование')}
                    aria-controls={id}
                >
                    {tools.map(({ command, label: toolLabel, content }) => (
                        <Button
                            key={command}
                            type={'button'}
                            unstyled={true}
                            className={styles.tool}
                            disabled={disabled}
                            aria-label={toolLabel}
                            tooltip={toolLabel}
                            // Keep the selection in the text while the button is pressed
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => run(command)}
                        >
                            {content}
                        </Button>
                    ))}
                </div>

                <TextArea
                    id={id}
                    name={name}
                    value={value}
                    rows={rows}
                    mode={'ghost'}
                    required={required}
                    disabled={disabled}
                    autoResize={true}
                    className={styles.textArea}
                    aria-invalid={!!error}
                    onChange={(event) => onChange(event.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={onBlur}
                />
            </div>

            {view === 'preview' && (
                <div className={cn(styles.box, styles.preview)}>
                    {value.trim() ? (
                        <Markdown>{value}</Markdown>
                    ) : (
                        <p className={styles.empty}>
                            {t(
                                'components.common.markdown-editor.empty',
                                'Пока пусто — напишите текст во вкладке «Текст»'
                            )}
                        </p>
                    )}
                </div>
            )}

            {error ? (
                <p
                    className={styles.errorText}
                    role={'alert'}
                >
                    {error}
                </p>
            ) : (
                hint && <p className={styles.hint}>{hint}</p>
            )}
        </div>
    )
}
