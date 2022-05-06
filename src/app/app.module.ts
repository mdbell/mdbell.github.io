import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { OotCodeGenComponent } from './oot-code-gen/oot-code-gen.component';
import { IpsPatcherComponent } from './ips-patcher/ips-patcher.component';
import { JoeyKeygenComponent } from './joey-keygen/joey-keygen.component';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    FooterComponent,
    OotCodeGenComponent,
    IpsPatcherComponent,
    JoeyKeygenComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
