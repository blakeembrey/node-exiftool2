import test = require('blue-tape')
import { createReadStream } from 'fs'
import { join } from 'path'
import { exec, open, execSync } from './index'

const FIXTURE_DIR = join(__dirname, '../test/fixtures')

test('exiftool2', t => {
  t.test('pipe png', t => {
    const exif = exec(['-fast', '-'])

    createReadStream(join(FIXTURE_DIR, 'placeholder.png')).pipe(exif)

    exif.on('exif', (exif) => {
      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, 'PNG')

      t.end()
    })
  })

  t.test('pipe jpeg with trailers', t => {
    const exif = exec(['-'])
    const read = createReadStream(join(FIXTURE_DIR, 'subway.jpeg'))
    let ended = false

    exif.on('exif', (exif) => {
      t.equal(ended, true)
      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, 'JPEG')
      t.end()
    })

    read.on('end', () => ended = true)

    read.pipe(exif)
  })

  t.test('pipe jpeg fast', t => {
    const exif = exec(['-fast', '-'])
    const read = createReadStream(join(FIXTURE_DIR, 'subway.jpeg'))
    let ended = false

    exif.on('exif', (exif) => {
      t.equal(ended, false)
      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, 'JPEG')
      t.end()
    })

    read.on('end', () => ended = true)

    read.pipe(exif)
  })

  t.test('filename', t => {
    const exif = exec(['-fast', join(FIXTURE_DIR, 'placeholder.png')])

    exif.on('exif', (exif) => {
      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, 'PNG')

      t.end()
    })
  })

  t.test('short output', t => {
    const exif = exec(['-S', join(FIXTURE_DIR, 'placeholder.png')])

    exif.on('exif', (exif) => {
      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, 'PNG')

      t.end()
    })
  })

  t.test('group output', t => {
    const exif = exec(['-g', join(FIXTURE_DIR, 'placeholder.png')])

    exif.on('exif', (exif) => {
      t.equal(exif.length, 1)
      t.equal(exif[0].File.FileType, 'PNG')

      t.end()
    })
  })

  t.test('error', t => {
    const exif = exec(['this_file_does_not_exist.png'])

    exif.on('error', (error) => {
      t.equal(error.message, 'File not found: this_file_does_not_exist.png')

      t.end()
    })
  })

  t.test('parse multiple exif data', t => {
    const exif = exec(['-common', FIXTURE_DIR])

    exif.on('exif', (exif) => {
      t.equal(exif.length, 2)
      t.equal(exif[0].FileName, 'placeholder.png')
      t.equal(exif[1].FileName, 'subway.jpeg')

      t.end()
    })
  })

  t.test('stay open', t => {
    const exif = open()
    let len = 0

    exif.send([join(FIXTURE_DIR, 'placeholder.png')])
    exif.send([join(FIXTURE_DIR, 'subway.jpeg')])
    exif.send([join(FIXTURE_DIR, 'placeholder.png')])
    exif.close()

    exif.on('exif', (exif) => {
      len++

      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, len === 2 ? 'JPEG' : 'PNG')

      if (len === 3) {
        t.end()
      }
    })
  })

  t.test('stream multiple files', t => {
    const exif = open()
    let len = 0

    function cb (err: Error, exif: any[]) {
      len++

      t.equal(exif.length, 1)
      t.equal(exif[0].FileType, len === 2 ? 'JPEG' : 'PNG')

      if (len === 3) {
        t.end()
      }
    }

    createReadStream(join(FIXTURE_DIR, 'placeholder.png')).pipe(exif.stream([], cb))
    createReadStream(join(FIXTURE_DIR, 'subway.jpeg')).pipe(exif.stream([], cb))
    createReadStream(join(FIXTURE_DIR, 'placeholder.png')).pipe(exif.stream([], cb))

    exif.close()
  })

  t.test('spawn sync', t => {
    const exif = execSync(['-fast', join(FIXTURE_DIR, 'placeholder.png')])

    t.equal(exif.length, 1)
    t.equal(exif[0].FileType, 'PNG')
    t.end()
  })

  t.test('spawn sync error', t => {
    t.throws(
      () => execSync(['this_file_does_not_exist.png']),
      'File not found: this_file_does_not_exist.png'
    )

    t.end()
  })
})
