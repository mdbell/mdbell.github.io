import { TestBed } from '@angular/core/testing';

import { OotDataServiceService } from './oot-data-service.service';

describe('OotDataServiceService', () => {
  let service: OotDataServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OotDataServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
