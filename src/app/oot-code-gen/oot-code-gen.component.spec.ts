import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OotCodeGenComponent } from './oot-code-gen.component';

describe('OotCodeGenComponent', () => {
  let component: OotCodeGenComponent;
  let fixture: ComponentFixture<OotCodeGenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OotCodeGenComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OotCodeGenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
