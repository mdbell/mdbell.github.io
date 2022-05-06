import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-joey-keygen',
  templateUrl: './joey-keygen.component.html',
  styleUrls: ['./joey-keygen.component.css']
})
export class JoeyKeygenComponent implements OnInit {

  id1 : string = "00000000";
  id2 : string = "00000000";
  id3 : string = "00000000";
  key : string = "00000000";
  error : string = "";

  constructor() { }

  ngOnInit(): void {
  }

  computeKey() {
    if(!this.id1 || !this.id2 || !this.id3){
      return;
    }
    this.error = "";
    try{
      let id1 = parseHex(this.id1);
      let id2 = parseHex(this.id2);
      let id3 = parseHex(this.id3);
      if(!id1 || !id2 || !id3){
        return;
      }
      let key = genKey(id1, id2, id3);
      this.key = toHex(key);
    }catch(err){
      this.error = (<Error>err).message;
    }
  }

}

function parseHex(str : string) : number{
  if(!/[0-9A-Fa-f]{8}/g.test(str)){
    throw new Error(`'${str}' is not a valid id! They should be 8 characters long, and only contain the numbers 0-9, as well as the letters A-F.`);
  }
  return parseInt(str, 16);
}

function toHex(value : number) : string {
  if(value < 0){
    value = 0xFFFFFFFF + value + 1;
  }
  let str = value.toString(16);
  while (str.length < 8){
    str = "0" + str;
  }
  return str.toUpperCase();
}

function genKey(id1 : number, id2 : number, id3 : number) : number {
  let res = ((id1 ^ 0x4210005) >>> 5 | (id1 ^ 0x4210005) << 0x1b) ^
  ((id2 ^ 0x30041523) >>> 3 | (id2 ^ 0x30041523) << 0x1d) ^
  ((id3 ^ 0x6517bebe) >>> 0xc | (id3 ^ 0x6517bebe) << 0x14);
  for(let i = 0; i < 100; i++){
          res = res >>> 1 |
    (res ^ res >>> 0x1f ^ (res & 0x200000) >> 0x15 ^ (res & 2) >>> 1 ^ res & 1) <<
    0x1f;
  }
  return res;
}
