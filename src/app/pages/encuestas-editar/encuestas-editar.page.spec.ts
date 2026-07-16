import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EncuestasEditarPage } from './encuestas-editar.page';

describe('EncuestasEditarPage', () => {
  let component: EncuestasEditarPage;
  let fixture: ComponentFixture<EncuestasEditarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EncuestasEditarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
