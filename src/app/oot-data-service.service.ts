import { Injectable } from '@angular/core';

const BASE_ADDRESS = 0x80000000;
const WRITE_CODETYPE = 0x04000000; // 32-bit write

const HEART_MASK = 0xFF000000;

export const MAX_PIECE_OF_HEARTS = 3;
export const MIN_PIECE_OF_HEARTS = 0;

const HEARTS_INDEX = 28;

export interface Region{
  code: string;
  name: string;
  nameExt: string;
  offset: number;
}

export interface CodeBit {
  name : string;
  index: number;
}

function intToString(value : number, padding : number) : string{
  let res = value.toString(16);
  while(res.length < padding) {
    res = "0" + res;
  }
  return res.toUpperCase();
}

@Injectable({
  providedIn: 'root'
})
export class OotDataServiceService {

  regions : Region[] = [
    {
      code: "U",
      name: "NTSC-U",
      nameExt: "North America",
      offset: 0x8107EE44
    },
    {
      code: "J",
      name: "NTSC-J",
      nameExt: "Japan",
      offset: 0x80F8ED24
    },
    {
      code: "P",
      name: "PAL",
      nameExt: "Europe & Australia",
      offset: 0x80F8C754
    }
  ];

  medallions : CodeBit[] = [
    {
      name: "Forest",
      index: 0
    },
    {
      name: "Fire",
      index: 1
    },
    {
      name: "Water",
      index: 2
    },
    {
      name: "Spirit",
      index: 3
    },
    {
      name: "Shadow",
      index: 4
    },
    {
      name: "Light",
      index: 5
    }
  ];

  stones : CodeBit[] = [
    {
      name: "Kokiri's Emerald",
      index: 18
    },
    {
      name: "Goron's Ruby",
      index: 19
    },
    {
      name: "Zora's Sapphire",
      index: 20
    },

  ];

  teleports: CodeBit[] = [
    {
      name: "Minuet of Forest",
      index: 6
    },
    {
      name: "Bolero of Fire",
      index: 7
    },
    {
      name: "Serenade of Water",
      index: 8
    },
    {
      name: "Requiem of Spirit",
      index: 9
    },
    {
      name: "Nocturne of Shadow",
      index: 10
    },
    {
      name: "Prelude of Light",
      index: 11
    },
  ];

  songs: CodeBit[] = [
    {
      name: "Zelda's Lullaby",
      index: 12
    },
    {
      name: "Epona's Song",
      index: 13
    },
    {
      name: "Saria's Song",
      index: 14
    },
    {
      name: "Sun's Song",
      index: 15
    },
    {
      name: "Song of Time",
      index: 16
    },
    {
      name: "Song of Storms",
      index: 17
    }
  ];

  misc: CodeBit[] = [
    {
      name: "Stone of Agony",
      index: 21
    },
    {
      name: "Gerudo's Card",
      index: 22
    },
    {
      name: "Gold Skulluta Counter",
      index: 23
    },

  ];

  currentRegion : Region = this.regions[0];
  bits : number = 0;
  hearts : number = 0;

  constructor() { }

  getRegions(){
    return this.regions;
  }

  getMedallions(){
    return this.medallions;
  }

  getStones(){
    return this.stones;
  }

  getTeleports(){
    return this.teleports;
  }

  getSongs(){
    return this.songs;
  }

  getMisc(){
    return this.misc;
  }

  getBits(){
    return this.bits;
  }

  getCurrentRegion(){
    return this.currentRegion;
  }

  getHeartCount(){
    return this.hearts;
  }

  getCodeString() : string{
    let prefix = this.currentRegion.offset - BASE_ADDRESS + WRITE_CODETYPE;

    return intToString(prefix, 8) + " " + intToString(this.bits, 8);
  }

  setHeartCount(count : number){
    if(count > MAX_PIECE_OF_HEARTS || count < 0){
      return;
    }
    this.hearts = count;
    this.bits &= ~HEART_MASK;
    this.bits |= (count << HEARTS_INDEX);
  }

  flipBit(index: number){
    let mask = 1 << index;
    this.bits = this.bits ^ mask;
  }

  setRegion(region : Region){
    this.currentRegion = region;
  }
}
