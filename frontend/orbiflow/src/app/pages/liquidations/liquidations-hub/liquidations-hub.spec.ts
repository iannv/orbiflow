import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router'; 
import { of } from 'rxjs';

import { LiquidationsHub } from './liquidations-hub';
import { LiquidationService } from '../../../services/liquidation-service';

describe('LiquidationsHub', () => {
  let component: LiquidationsHub;
  let fixture: ComponentFixture<LiquidationsHub>;

  beforeEach(async () => {

    const mockLiquidationService = {
      getPeriods: () => of([]) 
    };

    await TestBed.configureTestingModule({
      imports: [LiquidationsHub],
      providers: [
        provideRouter([]),
        { provide: LiquidationService, useValue: mockLiquidationService } 
      ]
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