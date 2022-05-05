import { TestBed } from '@angular/core/testing';

import { IpsPatcherService } from './ips-patcher.service';

describe('IpsPatcherService', () => {
  let service: IpsPatcherService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IpsPatcherService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
