import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { ConfiguracionGeneral } from './configuracion-general';

describe('ConfiguracionGeneral', () => {
  let component: ConfiguracionGeneral;
  let fixture: ComponentFixture<ConfiguracionGeneral>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracionGeneral],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ConfiguracionGeneral);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
