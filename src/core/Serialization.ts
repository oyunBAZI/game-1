export interface BinaryWriter {
  writeUint8(value: number): void;
  writeInt32(value: number): void;
  writeFloat32(value: number): void;
  writeString(value: string): void;
  bytes(): Uint8Array;
}

export class ByteWriter implements BinaryWriter {
  private data: number[] = [];

  writeUint8(value: number): void {
    this.data.push(value & 0xff);
  }

  writeInt32(value: number): void {
    const view = new DataView(new ArrayBuffer(4));
    view.setInt32(0, value, true);
    for (let index = 0; index < 4; index += 1) this.data.push(view.getUint8(index));
  }

  writeFloat32(value: number): void {
    const view = new DataView(new ArrayBuffer(4));
    view.setFloat32(0, value, true);
    for (let index = 0; index < 4; index += 1) this.data.push(view.getUint8(index));
  }

  writeString(value: string): void {
    const bytes = new TextEncoder().encode(value);
    this.writeInt32(bytes.length);
    for (const byte of bytes) this.writeUint8(byte);
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.data);
  }
}

export class ByteReader {
  private offset = 0;
  private readonly view: DataView;

  constructor(private readonly bytes: Uint8Array) {
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readInt32(): number {
    const value = this.view.getInt32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, true);
    this.offset += 4;
    return value;
  }

  readString(): string {
    const length = this.readInt32();
    const value = this.bytes.slice(this.offset, this.offset + length);
    this.offset += length;
    return new TextDecoder().decode(value);
  }

  remaining(): number {
    return this.bytes.byteLength - this.offset;
  }
}

export function encodeJson(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

export function decodeJson<T>(bytes: Uint8Array): T {
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

export function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}