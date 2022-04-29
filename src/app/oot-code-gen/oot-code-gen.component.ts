import { Component, OnInit } from '@angular/core';
import { Region, CodeBit, OotDataServiceService, MAX_PIECE_OF_HEARTS, MIN_PIECE_OF_HEARTS} from "../oot-data-service.service"

@Component({
  selector: 'app-oot-code-gen',
  templateUrl: './oot-code-gen.component.html',
  styleUrls: ['./oot-code-gen.component.css']
})
export class OotCodeGenComponent implements OnInit {

  regions : Region[] = [];
  medallions: CodeBit[] = [];
  stones: CodeBit[] = [];
  teleports: CodeBit[] = [];
  songs: CodeBit[] = [];
  misc: CodeBit[] = [];
  code : string = "";
  hearts : number[] = new Array(MAX_PIECE_OF_HEARTS + 1).fill(MIN_PIECE_OF_HEARTS).map((x, i) => x + i);

  constructor(private _dataService : OotDataServiceService) { }

  ngOnInit(): void {
    this.regions = this._dataService.getRegions();
    this.medallions = this._dataService.getMedallions();
    this.stones = this._dataService.getStones();
    this.teleports = this._dataService.getTeleports();
    this.songs = this._dataService.getSongs();
    this.misc = this._dataService.getMisc();
    this.code = this._dataService.getCodeString();
  }

  setHearts(event : any){
    this._dataService.setHeartCount(event.target.value);
    this.code = this._dataService.getCodeString();
  }

  flipBit(index : number){
    this._dataService.flipBit(index);
    this.code = this._dataService.getCodeString();
  }

  setRegion(region : any){
    this._dataService.setRegion(this.regions[region.target.value]);
    this.code = this._dataService.getCodeString();
  }

}
