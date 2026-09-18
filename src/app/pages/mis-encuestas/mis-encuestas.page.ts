import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/core/services/auth.service';

@Component({
  selector: 'app-mis-encuestas',
  templateUrl: './mis-encuestas.page.html',
  styleUrls: ['./mis-encuestas.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class MisEncuestasPage implements OnInit {
  nombreUsuario = '';

  // TODO (Fase C): estas dos tarjetas hoy apuntan siempre a la versión de
  // preguntas que trae responder-encuesta.page.ts embebida en el código.
  // Cuando el admin pueda editar/publicar versiones del cuestionario desde
  // el backend, este arreglo pasará a venir de una llamada real a
  // GET /api/cuestionarios/activos, y aquí se mostrará el número de
  // versión vigente para que el encuestador sepa cuándo cambió.
  encuestas = [
    {
      tipo: 'turista',
      titulo: 'Encuesta Turística',
      descripcion: 'Perfil, planeación del viaje y satisfacción del visitante.',
      icono: 'people-outline'
    },
    {
      tipo: 'hotel',
      titulo: 'Encuesta de Alojamiento',
      descripcion: 'Ocupación, check-in y tarifas del establecimiento.',
      icono: 'business-outline'
    }
  ];

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.nombreUsuario = user?.nombres || '';
    });
  }

  abrirEncuesta(tipo: string) {
    this.router.navigate(['/responder-encuesta', tipo]);
  }
}
