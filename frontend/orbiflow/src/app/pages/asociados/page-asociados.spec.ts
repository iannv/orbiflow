import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PageAsociados } from './page-asociados';
import { AssociateService } from '../../services/associate-service';
import { UserService } from '../../services/user-service';

describe('PageAsociados', () => {
  let fixture: ComponentFixture<PageAsociados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageAsociados],
      providers: [
        {
          provide: AssociateService,
          useValue: {
            getAssociates: () => of([]),
            getModules: () => of([]),
            createAssociate: () => of({}),
            updateAssociate: () => of({}),
            createAssociateVariant: () => of({}),
            deleteAssociateVariant: () => of(undefined),
          },
        },
        { provide: UserService, useValue: { getUsers: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PageAsociados);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
