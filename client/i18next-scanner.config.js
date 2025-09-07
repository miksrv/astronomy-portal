const fs = require('fs')
const path = require('path')
const typescript = require('typescript')

module.exports = {
    input: [
        '**/*.{js,jsx,ts,tsx}',
        '!**/node_modules/**',
        '!**/dist/**'
    ],
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
                            const file = fs.readFileSync(resPath, 'utf-8')
                            const fileObj = JSON.parse(file)
                            if (isEmpty(fileObj)) {
                                throw new Error(`Translation in path ${resPath} is empty`)
                            }
                            const keys = file.split(',').map((value) => {
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

        const customHandler = (key, opts, path) => {
            if (this.parser.options.keySeparator) {
                if (key.split(this.parser.options.keySeparator).length < 2) {
                    throw new Error(`A group is not defined for the key ${key} in ${path}`)
                }
            }

            if (this.parser.options.checkForEmptyDefaults) {
                if (!opts.defaultValue) {
                    throw new Error(`There is no value for translation with a key ${key}`)
                }
            }

            console.log(file.path)

            this.parser.set(key, opts)
            keyMap.set(key, path)
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
            this.parser.parseFuncFromString(outputText, (key, opts) => customHandler(key, opts, file.path))
        }

        done()
    }
};
