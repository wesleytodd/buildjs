'use strict'
const { suite, test, beforeEach } = require('mocha')
const rimraf = require('rimraf')
const path = require('path')
const assert = require('assert')
const buildjs = require('../')
const HELLO = path.join(__dirname, 'fixtures', 'hello-world')

suite('build js', () => {
  beforeEach((done) => {
    rimraf(path.join(HELLO, 'dist'), done)
  })

  test('should bundle a file', async () => {
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

  test('should resolve relative paths correctly', async () => {
    const filename = await buildjs({
      basedir: HELLO,
      entries: 'hello.js',
      outputdir: 'dist'
    })

    // Test filename
    assert(filename)
    assert(filename.includes('index-'))
    assert(filename.includes('.js'))
  })

  test('should resolve absolute paths correctly', async () => {
    const filename = await buildjs({
      basedir: HELLO,
      entries: path.join(HELLO, 'hello.js'),
      outputdir: path.join(HELLO, 'dist')
    })

    // Test filename
    assert(filename)
    assert(filename.includes('index-'))
    assert(filename.includes('.js'))
  })
})
