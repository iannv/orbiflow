import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PanelAsociado } from './panel-asociado';

describe('PanelAsociado', () => {
  let component: PanelAsociado;
  let fixture: ComponentFixture<PanelAsociado>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelAsociado],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelAsociado);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
