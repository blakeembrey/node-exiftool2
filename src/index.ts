import { Writable, Readable } from "stream";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import { createWriteStream, unlink } from "fs";
import { tmpdir } from "os";
import { promisify } from "util";

const pUnlink = promisify(unlink);

/**
 * Exif data type.
 */
export type ExifData = ReadonlyArray<Record<string, any>>;

/**
 * Tooling constants.
 */
const BIN_PATH = join(__dirname, "../vendor/Image-ExifTool-11.84/exiftool");
const DELIMITER = "\n}]\n";

/**
 * Exec interface for `exiftool`.
 */
export class Exec extends Writable {
  process: ChildProcess;
  pending: number;

  constructor(args: string[], pending: number) {
    super();

    this.process = spawn(BIN_PATH, args);
    this.pending = pending;

    let stdout = "";
    let stderr = "";

    this.process.stdout?.on("data", (chunk: Buffer) => {
      let offset: number;

      stdout += chunk.toString("utf8");

      while ((offset = stdout.indexOf(DELIMITER)) > -1) {
        const len = offset + DELIMITER.length;
        const data = stdout.substr(0, len);

        stdout = stdout.substr(len);

        try {
          this.pending--;
          this.emit("exif", JSON.parse(data));
        } catch (err) {
          this.emit("error", err);
        }
      }
    });

    this.process.stderr?.on("data", (chunk: Buffer) => {
      let offset: number;

      stderr += chunk.toString("utf8");

      while ((offset = stderr.indexOf("\n")) > -1) {
        const data = stderr.substr(0, offset);

        stderr = stderr.substr(offset + 1);

        if (data.length) {
          this.pending--;
          this.emit("error", new Error(data));
        }
      }
    });

    this.process.stdout?.on("error", this.emit.bind(this, "error"));
    this.process.stderr?.on("error", this.emit.bind(this, "error"));

    this.process.stdin?.on("error", (error: Error) => {
      const code = (error as any).code;

      if (code !== "EPIPE" && code !== "ECONNRESET") {
        this.emit("error", error);
      }
    });
  }

  _write(chunk: Buffer, encoding: string, cb: (error?: Error | null) => void) {
    if (!this.process.stdin || !this.process.stdin.writable) return cb();

    return this.process.stdin.write(chunk, encoding, err => {
      if (err && (err as any).code === "EPIPE") return cb();
      return cb(err);
    });
  }

  _destroy() {
    return this.process.kill("SIGTERM");
  }

  _final() {
    return this.process.stdin?.end();
  }

  command(...args: string[]) {
    for (const arg of args) this.write(`${arg}\n`);
  }

  close() {
    return this.command("-stay_open", "False");
  }

  execute(...args: string[]) {
    return this.command(...args, "-q", "-json", "-execute");
  }

  send(...args: string[]): Promise<ExifData> {
    let remaining = this.pending;
    this.pending++; // Track pending emit.
    this.execute(...args); // Send args to `execute`.

    return new Promise((resolve, reject) => {
      const onexif = (exif: ExifData) => {
        if (remaining-- > 0) return;
        removeListeners();
        return resolve(exif);
      };

      const onerror = (err: Error) => {
        if (remaining-- > 0) return;
        removeListeners();
        return reject(err);
      };

      const removeListeners = () => {
        this.removeListener("exif", onexif);
        this.removeListener("error", onerror);
      };

      this.on("exif", onexif);
      this.on("error", onerror);
    });
  }

  read(readable: Readable, ...args: string[]): Promise<ExifData> {
    const tmpFilename = join(
      tmpdir(),
      `exiftool2_${Math.random()
        .toString(36)
        .substr(2)}`
    );

    const dest = readable.pipe(createWriteStream(tmpFilename));

    const cleanup = () => {
      dest.close(); // Close file stream before unlinking.
      return pUnlink(tmpFilename);
    };

    return this.send(tmpFilename, ...args).then(
      exif => cleanup().then(() => exif),
      err => cleanup().then(() => Promise.reject(err))
    );
  }
}

/**
 * Handle `-stay_open` arguments.
 */
export function open() {
  return new Exec(["-stay_open", "True", "-@", "-"], 0);
}

/**
 * Execute a command, returning on data.
 */
export function exec(...args: string[]) {
  return new Exec(["-q", "-json", ...args], 1);
}
