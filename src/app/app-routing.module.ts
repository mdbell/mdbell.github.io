import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { OotCodeGenComponent } from './oot-code-gen/oot-code-gen.component';

const routes: Routes = [
  {
    path: "home",
    redirectTo: "oot"
  },
  {
    path: "oot",
    component: OotCodeGenComponent
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
