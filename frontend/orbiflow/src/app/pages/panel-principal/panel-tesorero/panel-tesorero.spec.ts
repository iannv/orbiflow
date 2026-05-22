import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PanelTesorero } from './panel-tesorero';

describe('PanelTesorero', () => {
  let component: PanelTesorero;
  let fixture: ComponentFixture<PanelTesorero>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelTesorero],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelTesorero);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
