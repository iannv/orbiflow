import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClosedLiquidationsComponent } from './closed-liquidations';

describe('ClosedLiquidationsComponent', () => {
  let component: ClosedLiquidationsComponent;
  let fixture: ComponentFixture<ClosedLiquidationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClosedLiquidationsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClosedLiquidationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
