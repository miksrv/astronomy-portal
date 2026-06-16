import React from 'react'
import { Container, Icon } from 'simple-react-ui-kit'

import { useTranslation } from 'next-i18next/pages'

import styles from './styles.module.sass'

export const EventImportant: React.FC = () => {
    const { t } = useTranslation()

    const importantNotes: string[] = [
        t(
            'pages.stargazing-tickets.important1',
            'Количество мест на выездах ограничено - рекомендуем регистрироваться на астровыезды заранее.'
        ),
        t(
            'pages.stargazing-tickets.important2',
            'Проект метеозависимый - мероприятия могут быть отменены или перенесены из-за непогоды, следите за обновлениями.'
        ),
        t(
            'pages.stargazing-tickets.important3',
            'Добираться до места проведения нужно своим ходом - автобусов у нас, к сожалению, нет.'
        ),
        t(
            'pages.stargazing-tickets.important4',
            'Внимательно изучите другие разделы сайта, если остались вопросы, и обязательно подпишитесь на наш Telegram.'
        )
    ]

    return (
        <Container>
            <div className={styles.importantInner}>
                <div className={styles.importantContent}>
                    <div className={styles.importantHeader}>
                        <Icon name={'ReportError'} />
                        {t('pages.stargazing-tickets.important-title', 'Важно знать')}
                    </div>
                    <ul className={styles.importantList}>
                        {importantNotes.map((note) => (
                            <li key={note}>{note}</li>
                        ))}
                    </ul>
                </div>
                <img
                    className={styles.telescopeImage}
                    src={'/images/telescope-illustration.png'}
                    alt={''}
                    aria-hidden={'true'}
                />
            </div>
        </Container>
    )
}
