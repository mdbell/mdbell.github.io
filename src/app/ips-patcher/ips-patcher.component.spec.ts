import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IpsPatcherComponent } from './ips-patcher.component';

describe('IpsPatcherComponent', () => {
  let component: IpsPatcherComponent;
  let fixture: ComponentFixture<IpsPatcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ IpsPatcherComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(IpsPatcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
