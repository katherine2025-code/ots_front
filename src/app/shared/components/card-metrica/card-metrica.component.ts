import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-card-metrica',
  templateUrl: './card-metrica.component.html',
  styleUrls: ['./card-metrica.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class CardMetricaComponent {
  @Input() titulo: string = '';
  @Input() valor: string | number = '';
  @Input() icono: string = '';
  @Input() color: string = 'primary';
}