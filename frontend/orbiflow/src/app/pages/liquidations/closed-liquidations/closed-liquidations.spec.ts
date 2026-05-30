import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ClosedLiquidationsComponent } from './closed-liquidations';

describe('ClosedLiquidationsComponent', () => {
  let component: ClosedLiquidationsComponent;
  let fixture: ComponentFixture<ClosedLiquidationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClosedLiquidationsComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
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
