import { PassThrough } from 'stream'
import { spawn, spawnSync, ChildProcess } from 'child_process'
import { join } from 'path'

/**
 * Tooling constants.
 */
const BIN_PATH = join(__dirname, '../vendor/Image-ExifTool-10.24/exiftool')
const DELIMITER = '\n}]\n'

/**
 * Common spawn options.
 */
const SPAWN_OPTIONS = {
  encoding: 'utf8' as 'utf8'
}

/**
 * Exec interface extends `PassThrough`.
 */
export interface Exec extends PassThrough {
  on (event: 'exif', listener: (exif: any[]) => void): this
  on (event: 'error', listener: (error: Error) => void): this
  on (event: string, listener: Function): this
  send (args: string[]): boolean
  close (): boolean
}

/**
 * Exec interface for `exiftool`.
 */
export class Exec extends PassThrough implements Exec {

  send (args: string[]) {
    return this.write(`-q\n-json\n${args.join('\n')}\n-execute\n`)
  }

  close () {
    return this.send(['-stay_open', 'False'])
  }

}

/**
 * Wrap the stream handler.
 */
function wrap (process: ChildProcess): Exec {
  const stream = new Exec()
  let stdout = ''
  let stderr = ''

  stream.pipe(process.stdin)

  process.stdout.on('data', (chunk: Buffer) => {
    let offset: number

    stdout += chunk

    // tslint:disable-next-line
    while ((offset = stdout.indexOf(DELIMITER)) > -1) {
      const len = offset + DELIMITER.length
      const data = stdout.substr(0, len)

      stdout = stdout.substr(len)

      try {
        stream.emit('exif', JSON.parse(data))
      } catch (err) {
        stream.emit('error', err)
      }
    }
  })

  process.stderr.on('data', (chunk: Buffer) => {
    let offset: number

    stderr += chunk

    // tslint:disable-next-line
    while ((offset = stderr.indexOf('\n')) > -1) {
      const data = stderr.substr(0, offset)

      stderr = stderr.substr(offset + 1)

      if (data.length) {
        stream.emit('error', new Error(data))
      }
    }
  })

  process.on('exit', () => {
    stdout = stderr = ''
  })

  return stream
}

/**
 * Handle `-stay_open` arguments.
 */
export function open () {
  return wrap(spawn(BIN_PATH, ['-stay_open', 'True', '-@', '-'], SPAWN_OPTIONS))
}

/**
 * Execute a command, returning on data.
 */
export function exec (args: string[]) {
  return wrap(spawn(BIN_PATH, ['-q', '-json'].concat(args), SPAWN_OPTIONS))
}

/**
 * Synchronous execution of `exiftool`.
 */
export function execSync (args: string[]) {
  const { stdout, stderr } = spawnSync(BIN_PATH, ['-q', '-json'].concat(args), SPAWN_OPTIONS)
  const stdoutOffset = stdout.indexOf(DELIMITER)
  const stderrOffset = stderr.indexOf('\n')

  if (stderrOffset > -1) {
    throw new Error(stderr.substr(0, stderrOffset))
  }

  if (stdoutOffset > -1) {
    return JSON.parse(stdout.substr(0, stdoutOffset + DELIMITER.length))
  }

  throw new Error('No data from `exiftool`')
}
