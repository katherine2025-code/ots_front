import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EtlPage } from './etl.page';

describe('EtlPage', () => {
  let component: EtlPage;
  let fixture: ComponentFixture<EtlPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EtlPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
