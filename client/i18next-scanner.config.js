const fs = require('fs')
const path = require('path')
const eol = require('eol')
const Vinyl = require('vinyl')
const typescript = require('typescript')

// ---------------------------------------------------------------------------
// Snapshot existing EN/RU translations at module-load time so the flush step
// can preserve any value that is already correctly translated (e.g. hand-
// authored plural forms that the scanner cannot derive from a single default
// string in source).
// ---------------------------------------------------------------------------
const EN_TRANSLATION_PATH = path.resolve(__dirname, 'public/locales/en/translation.json')
const RU_TRANSLATION_PATH = path.resolve(__dirname, 'public/locales/ru/translation.json')

/**
 * Recursively flatten a nested object into dot-separated key → value entries.
 * e.g. { a: { b: "hello" } }  →  Map { "a.b" => "hello" }
 */
function flattenObject(obj, prefix, map) {
    map = map || new Map()
    prefix = prefix || ''
    Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key
        const value = obj[key]
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            flattenObject(value, fullKey, map)
        } else {
            map.set(fullKey, value)
        }
    })
    return map
}

function loadSnapshot(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        return flattenObject(JSON.parse(raw))
    } catch (_) {
        // File doesn't exist yet — all keys will be treated as new
        return new Map()
    }
}

const existingEnSnapshot = loadSnapshot(EN_TRANSLATION_PATH)
const existingRuSnapshot = loadSnapshot(RU_TRANSLATION_PATH)

// ---------------------------------------------------------------------------
// Deep-merge helper used in flush: for every leaf in `scanned`, if the
// snapshot had a non-empty string for that key keep the snapshot value
// (e.g. a manually corrected plural form the scanner can't generate on its
// own, since it only ever sees one default string per key in source).
//
// For brand-new keys with no snapshot value:
//  - EN falls back to '' (an empty placeholder waiting for translation)
//  - RU falls back to the freshly scanned value (the source default is
//    already valid Russian, since ru is defaultLng)
// ---------------------------------------------------------------------------
function mergeOutput(scanned, snapshot, fallbackToScanned, prefix) {
    prefix = prefix || ''
    const result = {}
    Object.keys(scanned).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key
        const value = scanned[key]
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = mergeOutput(value, snapshot, fallbackToScanned, fullKey)
        } else {
            const snapshotValue = snapshot.get(fullKey)
            result[key] =
                typeof snapshotValue === 'string' && snapshotValue !== ''
                    ? snapshotValue
                    : fallbackToScanned
                      ? value
                      : ''
        }
    })
    return result
}

module.exports = {
    input: ['**/*.{js,jsx,ts,tsx}', '!**/node_modules/**', '!**/dist/**'],
    output: './public/locales',

    options: {
        debug: true,
        removeUnusedKeys: true,
        func: {
            list: ['t'],
            extensions: ['.js', '.jsx']
        },
        trans: {
            component: 'Trans',
            extensions: []
        },
        lngs: ['en', 'ru'],
        defaultLng: 'ru',
        nsSeparator: false,
        keySeparator: '.',
        checkForSourceFile: false,
        interpolation: {
            prefix: '{{',
            suffix: '}}'
        },
        resource: {
            loadPath: '{{lng}}/{{ns}}.json',
            savePath: '{{lng}}/{{ns}}.json',
            jsonIndent: 4,
            lineEnding: '\n'
        }
    },

    // ---------------------------------------------------------------------------
    // Custom flush: write both EN and RU with preserved existing translations
    // merged over scanner output. New EN keys get "" (untranslated
    // placeholder); new RU keys fall back to the scanned source default.
    // ---------------------------------------------------------------------------
    flush: function customFlush(done) {
        const parser = this.parser
        const options = parser.options
        const resStore = parser.get({ sort: options.sort })
        const jsonIndent = options.resource.jsonIndent
        const lineEnding = String(options.resource.lineEnding).toLowerCase()

        Object.keys(resStore).forEach((lng) => {
            const namespaces = resStore[lng]
            Object.keys(namespaces).forEach((ns) => {
                let obj = namespaces[ns]

                if (lng === 'en') {
                    obj = mergeOutput(obj, existingEnSnapshot, false)
                } else if (lng === 'ru') {
                    obj = mergeOutput(obj, existingRuSnapshot, true)
                }

                const resPath = parser.formatResourceSavePath(lng, ns)
                let text = JSON.stringify(obj, null, jsonIndent) + '\n'

                if (lineEnding === 'auto') {
                    text = eol.auto(text)
                } else if (lineEnding === '\r\n' || lineEnding === 'crlf') {
                    text = eol.crlf(text)
                } else if (lineEnding === '\n' || lineEnding === 'lf') {
                    text = eol.lf(text)
                } else if (lineEnding === '\r' || lineEnding === 'cr') {
                    text = eol.cr(text)
                } else {
                    text = eol.lf(text)
                }

                let contents
                try {
                    contents = Buffer.from(text)
                } catch (e) {
                    contents = new Buffer(text) // eslint-disable-line no-buffer-constructor
                }

                this.push(
                    new Vinyl({
                        path: resPath,
                        contents
                    })
                )
            })
        })

        done()
    },

    transform: function customTransform(file, enc, done) {
        let hasError = false
        const fileErrorChecks = {}

        const keyMap = new Map()

        if (this.parser.options.checkForSourceFile) {
            const languages = this.parser.options.lngs
            const namespaces = this.parser.options.ns

            languages.forEach((lng) => {
                if (!fileErrorChecks[lng]) {
                    fileErrorChecks[lng] = {}
                }

                namespaces.forEach((ns) => {
                    if (fileErrorChecks[lng][ns]) {
                        return
                    }

                    const resPath = this.parser.formatResourceLoadPath(lng, ns)

                    try {
                        if (fs.existsSync(resPath)) {
                            const fileContent = fs.readFileSync(resPath, 'utf-8')
                            const fileObj = JSON.parse(fileContent)
                            if (!fileObj || Object.keys(fileObj).length === 0) {
                                throw new Error(`Translation in path ${resPath} is empty`)
                            }
                            const keys = fileContent.split(',').map((value) => {
                                return /'([^;]*?)'/.exec(value)[0]
                            })

                            const duplicates = []
                            keys.reduce((acc, current) => {
                                if (acc[current] === undefined) {
                                    acc[current] = ''
                                } else {
                                    duplicates.push(current)
                                }
                                return acc
                            }, {})

                            if (duplicates.length) {
                                throw new Error(
                                    `There are duplicated keys - ${duplicates.concat('')} in ${resPath}`
                                )
                            }
                        } else {
                            throw new Error(`No such a file ${resPath}`)
                        }

                        if (!fileErrorChecks[lng][ns]) {
                            fileErrorChecks[lng][ns] = true
                        }
                    } catch (err) {
                        console.error('ERROR:', err.message)
                        hasError = true
                    }
                })
            })
        }

        if (hasError) {
            return
        }

        const customHandler = (key, opts) => {
            if (this.parser.options.keySeparator) {
                if (key.split(this.parser.options.keySeparator).length < 2) {
                    throw new Error(`A group is not defined for the key ${key} in ${file.path}`)
                }
            }

            if (this.parser.options.checkForEmptyDefaults) {
                if (!opts.defaultValue) {
                    throw new Error(`There is no value for translation with a key ${key}`)
                }
            }

            console.log(file.path)

            this.parser.set(key, opts)
            keyMap.set(key, file.path)
        }

        const { base, ext } = path.parse(file.path)

        if (['.ts', '.tsx'].includes(ext) && !base.includes('.d.ts')) {
            const content = fs.readFileSync(file.path, enc)
            const { outputText } = typescript.transpileModule(content, {
                compilerOptions: {
                    target: 'es2018'
                },
                fileName: path.basename(file.path)
            })

            this.parser.parseTransFromString(outputText)
            this.parser.parseFuncFromString(outputText, (key, opts) => customHandler(key, opts))
        }

        done()
    }
}
