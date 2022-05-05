import { Component, OnInit } from '@angular/core';
import { IPSPatch, IpsPatcherService } from '../ips-patcher.service';
import { FileSaverService } from 'ngx-filesaver';

@Component({
  selector: 'app-ips-patcher',
  templateUrl: './ips-patcher.component.html',
  styleUrls: ['./ips-patcher.component.css']
})
export class IpsPatcherComponent implements OnInit {

  ips? : IPSPatch;
  binary? : ArrayBuffer;
  error! : string;
  fileName! : string;

  constructor(private _patchService : IpsPatcherService, private _fileSaver : FileSaverService) { }

  ngOnInit(): void {
  }

  setIPS(event : any) {

    this.readFile(event, data =>{
      try{
        this.error = "";
        this.ips = this._patchService.parseFromBuffer(data);
      }catch(err){
        this.error = (<Error>err).message;
        this.ips = undefined;
      }
    });
  }

  readFile(event : any, callback : (data : ArrayBuffer) => void){
    let file = event.target.files[0];
    let fr = new FileReader();
    fr.readAsArrayBuffer(file);

    fr.onload = function() {
      callback((<ArrayBuffer>fr.result));
    }
    fr.onerror = () =>{
      console.log("shit");
    }
  }

  getIpsSize() : number{
    let res = 0;
    this.ips?.hunks.forEach(h => res += h.payload.length)
    return res;
  }

  setBinary(event : any){
    this.fileName = event.target.files[0].name;
    this.readFile(event, data => this.binary = data);
  }

  doPatch(){
    if(!this.ips || !this.binary){
      this.error = "Missing File or binary";
      return;
    }
    try{
      let newData = this._patchService.patchBuffer(this.ips, this.binary);
      let blob = new Blob([newData], {type: "application/octet-stream"});
      this._fileSaver.save(blob, "patched_" + this.fileName);
    }catch(err){
      this.error = (<Error>err).message;
    }
  }

}
