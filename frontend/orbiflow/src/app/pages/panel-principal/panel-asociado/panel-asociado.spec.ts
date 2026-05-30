import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PanelAsociado } from './panel-asociado';

describe('PanelAsociado', () => {
  let component: PanelAsociado;
  let fixture: ComponentFixture<PanelAsociado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelAsociado],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelAsociado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
