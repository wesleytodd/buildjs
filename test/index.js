/* eslint-env mocha */
'use strict'
const rimraf = require('rimraf')
const path = require('path')
const assert = require('assert')
const buildjs = require('../')
const HELLO = path.join(__dirname, 'fixtures', 'hello-world')

describe('build js', () => {
  before((done) => {
    rimraf(path.join(HELLO, 'dist'), done)
  })

  it('should bundle a file', async () => {
    const filename = await buildjs({
      basedir: HELLO,
      entries: 'hello.js',
      minify: true
    })

    // Test filename
    assert(filename)
    assert(filename.includes('index-'))
    assert(filename.includes('.js'))
  })
})
