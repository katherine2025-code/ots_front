import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EncuestasDetallePage } from './encuestas-detalle.page';

describe('EncuestasDetallePage', () => {
  let component: EncuestasDetallePage;
  let fixture: ComponentFixture<EncuestasDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EncuestasDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
