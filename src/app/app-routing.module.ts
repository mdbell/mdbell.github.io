import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OotCodeGenComponent } from './oot-code-gen/oot-code-gen.component';
import { IpsPatcherComponent } from "./ips-patcher/ips-patcher.component"
import { JoeyKeygenComponent } from './joey-keygen/joey-keygen.component'

const routes: Routes = [
  {
    path: "home",
    redirectTo: "oot"
  },
  {
    path: "oot",
    component: OotCodeGenComponent
  },
  {
    path: "ips",
    component: IpsPatcherComponent
  },
  {
    path: "joey",
    component: JoeyKeygenComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
