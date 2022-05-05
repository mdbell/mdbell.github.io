import { Injectable } from '@angular/core';

const HEADER_TOP = 0x50415443; // PATC
const HEADER_BOTTON = 0x48; //H

const EOF = 0x454f46;

export interface IPSPatch{
  hunks : IPSHunk[];
  truncate : number;
}

export interface IPSHunk{
  offset : number;
  payload : Uint8Array;
}

function readTriInt(view : DataView, offset:number){
  return view.getUint8(offset) << 16 | view.getUint16(offset + 1);
}

@Injectable({
  providedIn: 'root'
})
export class IpsPatcherService {

  parseFromBuffer(data: ArrayBuffer): IPSPatch {
    let res : IPSPatch = {
      hunks: [],
      truncate: -1
    }
    let view = new DataView(data);
    if(view.getUint32(0) != HEADER_TOP || view.getUint8(4) != HEADER_BOTTON){
      throw new Error("Not a patch file!");
    }
    let pos = 5;
    let offset, len, hunk;
    while((offset = readTriInt(view, pos)) != EOF) {
      pos += 3;
      len = view.getUint16(pos, false);
      pos += 2;
      if(len == 0){ //RLE
        len = view.getUint16(pos, false);
        pos += 2;
        let value = view.getUint8(pos);
        pos += 1;
        hunk = new Uint8Array(len).fill(value);
      }else{ // regular section
        hunk = new Uint8Array(data, pos, len);
        pos += len;
      }
      console.log(`${offset} - ${pos} - ${len}`);
      res.hunks.push({
        offset: offset,
        payload: hunk
      });
    }
    pos += 3;
    if(pos < view.byteLength) {
      res.truncate = readTriInt(view, pos);
    }
    return res;
  }

  patchBuffer(patch : IPSPatch, buffer : ArrayBuffer) : ArrayBuffer{
    let res = new ArrayBuffer(patch.truncate == -1 ? buffer.byteLength : patch.truncate);
    let arr = new Uint8Array(res);
    arr.set(new Uint8Array(buffer)); // copy in the data

    patch.hunks.forEach(hunk =>{
      if(hunk.offset >= arr.length) {
        throw new Error(`Offset out of bounds! offset:${hunk.offset} binary length:${arr.length}`);
      }
      let end = hunk.offset + hunk.payload.length;
      if(end >= arr.length){
        throw new Error(`Payload length out of bounds! offset:${hunk.offset} payload len:${hunk.payload.length} binary length:${arr.length}`);
      }
      arr.set(hunk.payload, hunk.offset)
    })

    return res;
  }

  constructor() { }
}
