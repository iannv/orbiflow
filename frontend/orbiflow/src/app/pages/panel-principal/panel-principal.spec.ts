import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ActivatedRoute } from '@angular/router';

import { PanelPrincipal } from './panel-principal';

import { ModulosService } from '../../services/modulos-service';
import { AssociateService } from '../../services/associate-service';
import { UserService } from '../../services/user-service';

describe('PanelPrincipal', () => {
  let component: PanelPrincipal;
  let fixture: ComponentFixture<PanelPrincipal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PanelPrincipal],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {}
        },
        {
          provide: ModulosService,
          useValue: {
            getModulos: () => of([])
          }
        },
        {
          provide: AssociateService,
          useValue: {
            getAssociates: () => of([])
          }
        },
        {
          provide: UserService,
          useValue: {
            getUsers: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PanelPrincipal);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});