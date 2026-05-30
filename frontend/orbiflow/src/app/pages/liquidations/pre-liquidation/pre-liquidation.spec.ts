import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { PreLiquidationComponent } from './pre-liquidation';

describe('PreLiquidationComponent', () => {
  let component: PreLiquidationComponent;
  let fixture: ComponentFixture<PreLiquidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreLiquidationComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
