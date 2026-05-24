import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClosedLiquidations } from './closed-liquidations';

describe('ClosedLiquidations', () => {
  let component: ClosedLiquidations;
  let fixture: ComponentFixture<ClosedLiquidations>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClosedLiquidations]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClosedLiquidations);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
