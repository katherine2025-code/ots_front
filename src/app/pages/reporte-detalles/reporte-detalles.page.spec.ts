import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReporteDetallesPage } from './reporte-detalles.page';

describe('ReporteDetallesPage', () => {
  let component: ReporteDetallesPage;
  let fixture: ComponentFixture<ReporteDetallesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ReporteDetallesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
