import { createReadStream } from "fs";
import { join } from "path";
import { exec, open, ExifData } from "./index";

const FIXTURE_DIR = join(__dirname, "../test/fixtures");

describe("exiftool2", () => {
  it("should pipe png", done => {
    const exiftool = exec("-fast", "-");

    createReadStream(join(FIXTURE_DIR, "placeholder.png")).pipe(exiftool);

    exiftool.on("exif", exif => {
      expect(exif.length).toEqual(1);
      expect(exif[0].FileType).toEqual("PNG");

      return done();
    });
  });

  it("should pipe jpeg with trailers", done => {
    const exiftool = exec("-");
    const read = createReadStream(join(FIXTURE_DIR, "subway.jpeg"));
    let ended = false;

    exiftool.on("exif", exif => {
      expect(ended).toEqual(true);
      expect(exif.length).toEqual(1);
      expect(exif[0].FileType).toEqual("JPEG");

      return done();
    });

    read.on("end", () => (ended = true));
    read.pipe(exiftool);
  });

  it("should pipe jpeg fast", done => {
    const exiftool = exec("-fast", "-");
    const read = createReadStream(join(FIXTURE_DIR, "subway.jpeg"));
    let ended = false;

    exiftool.on("exif", exif => {
      expect(ended).toEqual(false);
      expect(exif.length).toEqual(1);
      expect(exif[0].FileType).toEqual("JPEG");

      return done();
    });

    read.on("end", () => (ended = true));
    read.pipe(exiftool);
  });

  it("should read from filename", done => {
    const exiftool = exec("-fast", join(FIXTURE_DIR, "placeholder.png"));

    exiftool.on("exif", exif => {
      expect(exif.length).toEqual(1);
      expect(exif[0].FileType).toEqual("PNG");

      return done();
    });
  });

  it("should support short output", done => {
    const exiftool = exec("-S", join(FIXTURE_DIR, "placeholder.png"));

    exiftool.on("exif", exif => {
      expect(exif.length).toEqual(1);
      expect(exif[0].FileType).toEqual("PNG");

      return done();
    });
  });

  it("should group output", done => {
    const exiftool = exec("-g", join(FIXTURE_DIR, "placeholder.png"));

    exiftool.on("exif", exif => {
      expect(exif.length).toEqual(1);
      expect(exif[0].File.FileType).toEqual("PNG");

      return done();
    });
  });

  it("should emit errors", done => {
    const exiftool = exec("this_file_does_not_exist.png");

    exiftool.on("error", error => {
      expect(error.message).toEqual(
        "Error: File not found - this_file_does_not_exist.png"
      );

      return done();
    });
  });

  it("should parse multiple exif data", done => {
    const exiftool = exec("-common", FIXTURE_DIR);

    exiftool.on("exif", (exif: ExifData) => {
      expect(exif.map(x => x.FileName).sort()).toEqual([
        "placeholder.png",
        "subway.jpeg"
      ]);

      return done();
    });
  });

  it("should stay open", () => {
    const exiftool = open();

    const data = Promise.all([
      exiftool.send(join(FIXTURE_DIR, "placeholder.png")),
      exiftool.send(join(FIXTURE_DIR, "subway.jpeg")),
      exiftool.send(join(FIXTURE_DIR, "placeholder.png"))
    ]);

    exiftool.close();

    return data.then(exifs => {
      expect(exifs.length).toEqual(3);
      expect(exifs[0][0].FileType).toEqual("PNG");
      expect(exifs[1][0].FileType).toEqual("JPEG");
      expect(exifs[2][0].FileType).toEqual("PNG");
    });
  });

  it("should stream multiple files", () => {
    const exiftool = open();

    const data = Promise.all([
      exiftool.read(createReadStream(join(FIXTURE_DIR, "placeholder.png"))),
      exiftool.read(createReadStream(join(FIXTURE_DIR, "subway.jpeg"))),
      exiftool.read(createReadStream(join(FIXTURE_DIR, "placeholder.png")))
    ]);

    exiftool.close();

    return data.then(exifs => {
      expect(exifs.length).toEqual(3);
      expect(exifs[0][0].FileType).toEqual("PNG");
      expect(exifs[1][0].FileType).toEqual("JPEG");
      expect(exifs[2][0].FileType).toEqual("PNG");
    });
  });
});
