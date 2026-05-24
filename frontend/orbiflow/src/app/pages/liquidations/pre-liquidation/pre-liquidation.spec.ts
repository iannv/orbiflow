import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreLiquidation } from './pre-liquidation';

describe('PreLiquidation', () => {
  let component: PreLiquidation;
  let fixture: ComponentFixture<PreLiquidation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreLiquidation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreLiquidation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
