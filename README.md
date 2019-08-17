# Build JS

Build up some js :)

## Usage

```
$ npm in @wesleytodd/buildjs
```

Without any options it will build `index.js` to `dist/index-{filehash}.js`:

```javascript
const buildjs = require('@wesleytodd/buildjs')

(async () => {
  await buildjs()
})()
```

### Options

```javascript
// these are the defaults
buildjs({
  basedir: process.cwd(),
  entries: 'index.js',
  outputdir: 'dist',
  outputFilename: 'index-{{hash}}.js',
  outputMapFilename: 'index-{{hash}}.js.map',
  outputMapUrl: 'index-{{hash}}.js.map',
  debug: false,
  watch: false,
  minify: false,
  babelify: true
})
```
