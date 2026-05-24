import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PreLiquidationComponent } from './pre-liquidation';

describe('PreLiquidationComponent', () => {
  let component: PreLiquidationComponent;
  let fixture: ComponentFixture<PreLiquidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreLiquidationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreLiquidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
