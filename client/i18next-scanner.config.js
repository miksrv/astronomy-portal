module.exports = {
    input: [
        "**/*.{js,jsx,ts,tsx}",
        "!**/node_modules/**",
        "!**/dist/**"
    ],
    output: "./public/locales",

    options: {
        plural: true,
        pluralSeparator: '_',
        debug: true,
        removeUnusedKeys: true,
        sort: true,
        lngs: ["ru", "en"],
        defaultLng: "ru",
        defaultNs: "common",
        resource: {
            loadPath: "{{lng}}/{{ns}}.json",
            savePath: "{{lng}}/{{ns}}.json",
            jsonIndent: 4,
            lineEnding: '\n'
        },
        interpolation: {
            prefix: "{{",
            suffix: "}}"
        }
    },

    transform: function customTransform(file, enc, done) {
        const parser = this.parser;
        const content = file.contents.toString("utf8");

        parser.parseFuncFromString(content, { list: ["t"] }, (key, options) => {
            parser.set(key, {
                defaultValue: options.defaultValue || key
            });
        });

        done();
    }
};
