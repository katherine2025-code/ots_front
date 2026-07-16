import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EncuestasEditorPage } from './encuestas-editor.page';

describe('EncuestasEditorPage', () => {
  let component: EncuestasEditorPage;
  let fixture: ComponentFixture<EncuestasEditorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EncuestasEditorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
