import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LiquidationsHub } from './liquidations-hub';

describe('LiquidationsHub', () => {
  let component: LiquidationsHub;
  let fixture: ComponentFixture<LiquidationsHub>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LiquidationsHub]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LiquidationsHub);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
