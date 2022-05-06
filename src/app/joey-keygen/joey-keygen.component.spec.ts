import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JoeyKeygenComponent } from './joey-keygen.component';

describe('JoeyKeygenComponent', () => {
  let component: JoeyKeygenComponent;
  let fixture: ComponentFixture<JoeyKeygenComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ JoeyKeygenComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(JoeyKeygenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
