import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidationComponent } from './liquidation';

describe('LiquidationComponent', () => {
  let component: LiquidationComponent;
  let fixture: ComponentFixture<LiquidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiquidationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiquidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
