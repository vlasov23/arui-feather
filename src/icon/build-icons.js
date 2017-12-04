/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* eslint import/no-extraneous-dependencies: [2, {"devDependencies": true}] */
const del = require('del');
const fs = require('fs');
const handlebars = require('handlebars');
const mkdirp = require('mkdirp');
const path = require('path');
const uppercamelcase = require('uppercamelcase');

const REGEXP = new RegExp(/([a-z]*)(_)(.*?)(_)(.*?)(_)([a-z]*)/, 'i');

const COPYRIGHT =
`/* This Source Code Form is subject to the terms of the Mozilla Public
* License, v. 2.0. If a copy of the MPL was not distributed with this
* file, You can obtain one at http://mozilla.org/MPL/2.0/. */\n`;

const isDirectory = source => fs.lstatSync(source).isDirectory();

const getDirectories = source =>
    fs.readdirSync(source).map(name => path.join(source, name)).filter(isDirectory);

// Delete folders
const clean = new Promise((resolve) => {
    const files = getDirectories('./src/icon');
    files.map(file => del.sync(file));
    resolve();
});

// Get Handlebars template
const getTemplate = (filename, data) => {
    let template = handlebars.compile(fs.readFileSync(`./src/icon/${filename}.hbs`, 'utf8'));
    return template(data);
};


class Icon {
    constructor(iconPath) {
        this.fileName = path.basename(iconPath, 'icon');
        this.path = iconPath;
        this.categoryPath = `./src/icon/${this.getCategory()}/${this.getName()}/`;
        this.indexFile = `${this.categoryPath}index.js`;
        this.cssFile = `${this.categoryPath}${this.getName()}.css`;
        this.jsxFile = `${this.categoryPath}${this.getName()}.jsx`;
        this.name = this.getName();
        this.category = this.getCategory();
        this.componentName = `Icon${uppercamelcase(this.getName())}`;
        this.size = this.getSize();
        this.color = this.getColor();
        this.aruiColor = this.getAruiColor();
        this.classes = this.getClasses();
    }

    getClasses() {
        let classes = `.icon_size_${this.getSize()}.icon_name_${this.getName()}`;
        if (!this.getAruiColor()) {
            classes += '.icon_colored';
        } else {
            classes += `.icon_theme_${this.getAruiColor()}`;
        }
        return classes;
    }

    // Category
    getCategory() {
        return path.basename(path.dirname(this.path));
    }

    // Name
    getName() {
        return this.fileName.match(REGEXP)[3];
    }

    // Size
    getSize() {
        return this.fileName.match(REGEXP)[5];
    }

    // Color
    getColor() {
        return this.fileName.match(REGEXP)[7];
    }

    getAruiColor() {
        let color = this.getColor();
        if (color === 'white') return 'alfa-on-color';
        if (color === 'black') return 'alfa-on-white';
        return false;
    }

    // Create folder structure
    createFolder() {
      console.log(this.categoryPath);
        return new Promise((resolve) => {
            mkdirp.sync(this.categoryPath);
            resolve();
        });
    }

    // Copy svg files
    copySVG() {
        fs.copyFile(
            this.path, `${this.categoryPath}${this.fileName}`,
            (err) => { if (err) throw err; }
        );
    }

    // Create index.js
    createIndex() {
        fs.writeFile(
            this.indexFile, getTemplate('index.js', this),
            (err) => { if (err) throw err; }
        );
    }

    // Create jsx files
    createJSX() {
        fs.writeFile(
            this.jsxFile, getTemplate('icon.jsx', this),
            (err) => { if (err) throw err; }
        );
    }

    // Create css file if needed and add background image rule
    addCSS() {
        if (!fs.exists(this.cssFile)) {
            fs.writeFile(
                this.cssFile, COPYRIGHT,
                (err) => { if (err) throw err; }
            );
        }
        fs.appendFile(
            this.cssFile, getTemplate('icon.css', this), 'utf8',
            (err) => { if (err) throw err; }
        );
    }
}

// Pseudo glob
const getIcons = (source, extension) => {
    let results = [];
    if (!fs.existsSync(source)) return false;
    const files = fs.readdirSync(source);
    files.forEach((file) => {
        const filename = path.join(source, file);
        const icon = new Icon(filename);
        if (isDirectory(filename)) {
            results = results.concat(getIcons(filename, extension));
        } else if (filename.indexOf(extension) >= 0) {
            results.push(icon);
        }
    });
    return results;
};

// Folders to add
const categories = [
    'action',
    'banking',
    'brand',
    'category',
    'currency',
    'entity',
    'file',
    'ui',
    'user'
];

// const createReadme = (icons) => {
//     let categoriesArray = [];
//     categories.forEach((category) => {
//         categoriesArray.push(icons
//             .filter(icon => icon.category === category)
//             .map((icon) => {
//                 return {
//                     name: icon.name,
//                     size: icon.size,
//                     category: icon.category,
//                     componentName: icon.componentName
//                 };
//             })
//         );
//     });
//
//     fs.writeFile(
//         './src/icon/README.md', getTemplate('README.md', categoriesArray),
//         (err) => { if (err) throw err; }
//     );
// };

let icons = [];

// Get icons
categories.forEach((folder) => {
    icons.push(...getIcons(`./node_modules/alfa-ui-primitives/icons/${folder}`, '.svg'));
});

clean.then(() => {
    console.log('⏳ Creating icons'); // eslint-disable-line no-console
    // createReadme(icons);
    console.log(icons);
    icons.forEach((icon) => {
        icon.createFolder()
            .then(() => {
                icon.copySVG();
                icon.createIndex();
                icon.createJSX();
                icon.addCSS();
            }).catch((err) => { if (err) throw err; });
    });
}).then(() => {
    console.log(`👌 ${icons.length} icons created`); // eslint-disable-line no-console
}).catch((err) => { if (err) throw err; });