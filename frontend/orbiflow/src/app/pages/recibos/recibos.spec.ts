import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Recibos } from './recibos';

describe('Recibos', () => {
  let component: Recibos;
  let fixture: ComponentFixture<Recibos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recibos],
    }).compileComponents();

    fixture = TestBed.createComponent(Recibos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
