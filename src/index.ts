import { Writable } from 'stream'
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
 * Exec interface extends `Writable`.
 */
export interface Exec extends Writable {
  on (event: 'exif', listener: (exif: any[]) => void): this
  on (event: 'error', listener: (error: Error) => void): this
  on (event: string, listener: Function): this
  send (args: string[]): boolean
  close (): boolean
}

/**
 * Exec interface for `exiftool`.
 */
export class Exec extends Writable implements Exec {

  process: ChildProcess

  constructor (args: string[]) {
    super()

    this.process = spawn(BIN_PATH, args)

    let stdout = ''
    let stderr = ''
    let parsed = false

    this.process.stdout.on('data', (chunk: Buffer) => {
      let offset: number

      stdout += chunk.toString('utf8')

      // tslint:disable-next-line
      while ((offset = stdout.indexOf(DELIMITER)) > -1) {
        const len = offset + DELIMITER.length
        const data = stdout.substr(0, len)

        parsed = true
        stdout = stdout.substr(len)

        try {
          this.emit('exif', JSON.parse(data))
        } catch (err) {
          this.emit('error', err)
        }
      }
    })

    this.process.stderr.on('data', (chunk: Buffer) => {
      let offset: number

      stderr += chunk.toString('utf8')

      // tslint:disable-next-line
      while ((offset = stderr.indexOf('\n')) > -1) {
        const data = stderr.substr(0, offset)

        parsed = true
        stderr = stderr.substr(offset + 1)

        if (data.length) {
          this.emit('error', new Error(data))
        }
      }
    })

    this.process.stdout.on('end', () => {
      this.end() // Mark the stream as done.
      stdout = stderr = ''
    })

    this.process.stdout.on('error', this.emit.bind(this, 'error'))
    this.process.stderr.on('error', this.emit.bind(this, 'error'))

    this.process.stdin.on('error', (err: Error) => {
      if (!parsed || (err as any).code !== 'EPIPE') {
        this.emit('error', err)
      }
    })

    this.on('finish', () => this.process.stdin.end())
  }

  _write (chunk: Buffer, encoding: string, cb: Function) {
    return this.process.stdin.write(chunk, encoding, () => cb())
  }

  send (args: string[]) {
    return this.write(`-q\n-json\n${args.join('\n')}\n-execute\n`)
  }

  close () {
    return this.send(['-stay_open', 'False'])
  }

}

/**
 * Handle `-stay_open` arguments.
 */
export function open () {
  return new Exec(['-stay_open', 'True', '-@', '-'])
}

/**
 * Execute a command, returning on data.
 */
export function exec (args: string[]) {
  return new Exec(['-q', '-json', ...args])
}

/**
 * Synchronous execution of `exiftool`.
 */
export function execSync (args: string[]) {
  const { stdout, stderr } = spawnSync(BIN_PATH, ['-q', '-json', ...args], SPAWN_OPTIONS)
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
