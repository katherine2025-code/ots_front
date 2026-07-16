import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-encuestas-editor',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button (click)="volver()">
            <ion-icon name="arrow-back"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Editor de Encuestas</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <div class="ion-text-center">
        <ion-icon name="create-outline" style="font-size: 64px; color: var(--ion-color-primary);"></ion-icon>
        <h2>Editor de Encuestas</h2>
        <p>Aquí podrás crear y editar preguntas de forma visual.</p>
        <ion-button (click)="volver()">Volver</ion-button>
      </div>
    </ion-content>
  `,
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EncuestasEditorPage {
  constructor(private router: Router) {}

  volver() {
    this.router.navigate(['/encuestas']);
  }
}