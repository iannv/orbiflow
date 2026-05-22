import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PanelAdmin } from './panel-admin';

describe('PanelAdmin', () => {
  let component: PanelAdmin;
  let fixture: ComponentFixture<PanelAdmin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelAdmin],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PanelAdmin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
