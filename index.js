// vim: set ft=javascript ts=2 sw=2 expandtab:
'use strict'
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const mkdirp = require('mkdirp')
const browserify = require('browserify')
const uglify = require('uglify-es')
const exorcist = require('exorcist')
const concat = require('concat-stream')
const pump = require('pump')
const Loggerr = require('loggerr')
const cliFormatter = require('loggerr/formatters/cli')

module.exports = function buildJs (options) {
  const opts = options || {}

  // Set defaults
  opts.basedir = opts.basedir || process.cwd()
  opts.outputdir = path.join(opts.basedir, opts.outputdir || 'dist')
  opts.outputFilename = path.relative(opts.basedir, path.join(opts.outputdir, opts.outputFilename || 'index-{{hash}}.js'))
  opts.outputMapFilename = path.relative(opts.basedir, path.join(opts.outputdir, opts.outputMapFilename || 'index-{{hash}}.js.map'))
  opts.outputMapUrl = opts.outputMapUrl || 'index-{{hash}}.js.map'
  opts.debug = opts.debug || false
  opts.watch = opts.watch || false
  opts.minify = opts.minify || false

  // Create loggerr
  const log = opts.logger || new Loggerr({
    formatter: cliFormatter,
    level: opts.debug ? Loggerr.DEBUG : Loggerr.NOTICE
  })

  // Merge browserify bundle options
  const browserifyOpts = Object.assign({
    debug: true, // Always add a source map
    cache: {}, // provide our own cache, WHY???
    packageCache: {}, // provide our own cache, WHY???
    fullPaths: !!opts.debug,
    entries: opts.entries || 'index.js',
    transform: ['babelify', 'envify'],
    basedir: opts.basedir
  }, opts.browserifyOpts)

  const bundle = browserify(browserifyOpts)

  if (opts.require) {
    Object.keys(opts.require).forEach((key) => {
      bundle.require(opts.require[key], { expose: key })
    })
  }

  // Add uglifyify if we are in minify and not debug mode
  if (opts.minify && !opts.debug) {
    bundle.transform('uglifyify', {
      global: true
    })
  }

  // Add watchify
  if (opts.watch) {
    bundle.plugin('watchify')
    bundle.on('update', () => {
      bundler && bundler().catch(log.error)
    })
  }

  // Create the bundler
  const bundler = createBundler(bundle, log, opts)

  // Run the bundler
  return bundler().catch(log.error)
}

function createBundler (bundle, log, opts) {
  return function () {
    return new Promise((resolve, reject) => {
      log.info('starting javascript bundle')

      // Concat streams
      let sourceMapContent
      let bundleContent
      const sourceMapConcatStream = concat((_sourceMapContent) => { sourceMapContent = _sourceMapContent })
      const bundleConcatStream = concat((_bundleContent) => { bundleContent = _bundleContent })

      function onBundleComplete (err) {
        if (err) {
          return reject(err)
        }

        // Run minification
        if (opts.minify) {
          const [minError, code, sourceMap] = minify(bundleContent, sourceMapContent)
          if (minError) {
            return reject(minError)
          }

          // Replace with the new minified content
          bundleContent = code
          sourceMapContent = sourceMap
        }

        // Hash the file contents and update the filenames
        const hash = crypto.createHash('sha256').update(bundleContent).digest('hex')
        const out = path.join(opts.basedir, opts.outputFilename.replace('{{hash}}', hash))
        const map = path.join(opts.basedir, opts.outputMapFilename.replace('{{hash}}', hash))

        // Update source map url
        const outUrl = opts.outputMapUrl.replace('{{hash}}', hash)
        bundleContent = bundleContent.replace(`//# sourceMappingURL=${opts.outputMapUrl}`, `//# sourceMappingURL=${outUrl}`)

        // Write out files
        mkdirp(path.dirname(out), (err) => {
          if (err) {
            return reject(err)
          }

          fs.writeFile(out, bundleContent, (err) => {
            if (err) {
              return reject(err)
            }
            log.notice(`wrote: ${path.relative(opts.basedir, out)}`)

            fs.writeFile(map, sourceMapContent, (err) => {
              if (err) {
                return reject(err)
              }
              log.notice(`wrote: ${path.relative(opts.basedir, map)}`)

              resolve(out)
            })
          })
        })
      }

      // Bundle and extract source map
      pump(bundle.bundle(), exorcist(sourceMapConcatStream, opts.outputMapUrl), bundleConcatStream, onBundleComplete)
    })
  }
}

// Pulled this out just to clean up the above stuff
function minify (code, map) {
  const result = uglify.minify(code, {
    mangle: true,
    compress: true,
    sourceMap: {
      content: map
    }
  })

  if (result.error) {
    return [result.error]
  }

  return [null, result.code, result.map]
}
