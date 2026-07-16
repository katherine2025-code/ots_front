import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EncuestasNuevasPage } from './encuestas-nuevas.page';

describe('EncuestasNuevasPage', () => {
  let component: EncuestasNuevasPage;
  let fixture: ComponentFixture<EncuestasNuevasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EncuestasNuevasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
