import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Liquidation } from './liquidation';

describe('Liquidation', () => {
  let component: Liquidation;
  let fixture: ComponentFixture<Liquidation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Liquidation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Liquidation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
