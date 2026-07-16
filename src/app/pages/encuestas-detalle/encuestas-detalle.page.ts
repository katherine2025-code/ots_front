import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-encuestas-detalle',
  templateUrl: './encuestas-detalle.page.html',
  styleUrls: ['./encuestas-detalle.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class EncuestasDetallePage implements OnInit {
  encuestaId: number = 0;
  encuesta: any = null;

  //Encuesta_Turistica
  preguntasTurista: any[] = [
    // SECCIÓN A: PERFIL SOCIODEMOGRÁFICO
    { id: 1, codigo: 'P1', texto: '¿Qué edad tiene usted?', tipo: 'Selección', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['18 a 24 años', '25 a 34 años', '35 a 44 años', '45 a 54 años', '55 a 64 años', '65 años o más'] },
    
    { id: 2, codigo: 'P2', texto: '¿Con qué género se identifica usted?', tipo: 'Selección', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Mujer', 'Hombre', 'Otro'] },
    
    { id: 3, codigo: 'P3', texto: 'Por favor especifique el país de residencia', tipo: 'Texto', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true },
    
    { id: 4, codigo: 'P4', texto: '¿Cuál es su nivel de educación?', tipo: 'Selección', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Educación básica', 'Bachillerato', 'Educación universitaria', 'Postgrado', 'Otro'] },
    
    { id: 5, codigo: 'P5', texto: '¿Cuál es su ocupación actual?', tipo: 'Selección', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Empleado/a sector público', 'Empleado/a sector privado', 'Empresario/a', 'Estudiante', 'Desempleado/a', 'Jubilado/a', 'Otro'] },
    
    { id: 6, codigo: 'P6', texto: '¿Cuántas personas, incluyéndose usted, viajaron en este grupo al cantón Salinas en esta ocasión?', tipo: 'Selección', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Solo yo (viajé solo/a)', '2 personas', '3 personas', '4 personas', '5 o más personas'] },
    
    // SECCIÓN B: PLANEACIÓN DEL VIAJE
    { id: 7, codigo: 'P7', texto: '¿Cuál es el motivo principal de su visita?', tipo: 'Selección múltiple', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Ocio / Vacaciones', 'Visita a familiares o amigos', 'Sol y playa', 'Actividades recreativas', 'Gastronomía', 'Compras', 'Negocios', 'Otro'] },
    
    { id: 8, codigo: 'P8', texto: '¿Cuántas veces ha visitado este destino?', tipo: 'Selección', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Nunca', '1 vez', '2-3 veces', '4-5 veces', 'Más de 5 veces'] },
    
    { id: 9, codigo: 'P9', texto: '¿Con quién viaja?', tipo: 'Selección', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Solo/a', 'En pareja', 'Con familia', 'Con amigos/as', 'Tour organizado', 'Otro'] },
    
    { id: 10, codigo: 'P10', texto: '¿Qué lugares piensa visitar o visitó durante su viaje en la provincia de Santa Elena?', tipo: 'Selección múltiple', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Montañita', 'Olón', 'Manglaralto', 'Salinas', 'Ayampe', 'Canoa', 'Otro'] },
    
    { id: 11, codigo: 'P11', texto: '¿Cuántas noches se hospedó?', tipo: 'Selección', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['1 noche', '2-3 noches', '4-6 noches', '7 noches o más'] },
    
    { id: 12, codigo: 'P12', texto: '¿Cómo buscó información antes del viaje?', tipo: 'Selección múltiple', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Buscadores de Internet (Google, Bing, Yahoo)', 'Redes sociales (Facebook, Instagram, TikTok)', 'Agencias en línea (Booking, Expedia, Airbnb)', 'Recomendaciones de amigos o familiares', 'Sitio web del destino', 'Agentes de viaje tradicionales', 'No busqué información', 'Otro'] },
    
    { id: 13, codigo: 'P13', texto: '¿Qué tan fácil fue encontrar información?', tipo: 'Escala', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Muy fácil', 'Fácil', 'Ni fácil ni difícil', 'Difícil', 'Muy difícil'] },
    
    { id: 14, codigo: 'P14', texto: '¿Cómo organizó su viaje?', tipo: 'Selección', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Por cuenta propia (contactando directamente)', 'Por medio de un paquete turístico', 'A través de redes sociales o grupos de viaje', 'Con ayuda de familiares o amigos en el destino', 'Agencia de viajes', 'Otro'] },
    
    { id: 15, codigo: 'P15', texto: '¿Con cuánta anticipación organizó su viaje a Salinas?', tipo: 'Selección', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['El mismo día del viaje', '1 a 3 días antes', '4 a 7 días antes', '1 a 2 semanas antes', '3 a 4 semanas antes', '1 a 2 meses antes', 'Más de 2 meses antes'] },
    
    // SECCIÓN C: ESTRUCTURA DE CONSUMO Y TRANSPORTE
    { id: 16, codigo: 'P16', texto: '¿Qué medio de transporte utilizó para llegar?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Vehículo propio', 'Autobús interprovincial', 'Vehículo de alquiler', 'Transporte turístico contratado', 'Vehículo de un familiar o amigo', 'Avión', 'Otro'] },
    
    { id: 17, codigo: 'P17', texto: '¿Qué medio de transporte utilizó en el destino?', tipo: 'Selección múltiple', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Vehículo propio', 'Transporte público (bus)', 'Uber u otras aplicaciones', 'Taxi', 'Vehículo motorizado alquilado', 'Caminando', 'Bicicleta', 'Otro'] },
    
    { id: 18, codigo: 'P18', texto: '¿Cuánto gastó en transporte?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', '0 (Sin gasto)', 'Prefiero no responder'] },
    
    { id: 19, codigo: 'P19', texto: '¿Cuánto gastó en alojamiento?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', '0 (Sin gasto)', 'Prefiero no responder'] },
    
    { id: 20, codigo: 'P20', texto: '¿Cuánto gastó en alimentación?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', '0 (Sin gasto)', 'Prefiero no responder'] },
    
    { id: 21, codigo: 'P21', texto: '¿Cuánto gastó en actividades recreativas?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', '0 (Sin gasto)', 'Prefiero no responder'] },
    
    { id: 22, codigo: 'P22', texto: '¿Cuánto gastó en compras personales?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', '0 (Sin gasto)', 'Prefiero no responder'] },
    
    { id: 23, codigo: 'P23', texto: '¿Qué tipo de viajero se considera?', tipo: 'Selección', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Viajero de Bajo Presupuesto/Mochilero', 'Viajero de Gama Media', 'Viajero de Gama Alta', 'Viajero de Lujo', 'Prefiero no responder'] },
    
    // SECCIÓN D: SATISFACCIÓN Y EXPERIENCIA
    { id: 24, codigo: 'P24', texto: 'En una escala del 1 al 5, ¿cuál es su nivel de satisfacción con respecto a su experiencia en los atractivos turísticos de Salinas que ha visitado?', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: true,
      opciones: ['1 - Muy insatisfecho', '2 - Insatisfecho', '3 - Ni satisfecho ni insatisfecho', '4 - Satisfecho', '5 - Muy satisfecho', 'N/A'] },
    
    { id: 25, codigo: 'P25', texto: '¿Qué probabilidad hay de que recomiende este destino?', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: true,
      opciones: ['1 - Nada probable', '2 - Improbable', '3 - Ni probable ni improbable', '4 - Probable', '5 - Muy probable'] },
    
    { id: 26, codigo: 'P26', texto: 'Información turística disponible (oficinas, mapas, señalización, apps)', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 27, codigo: 'P27', texto: 'Atención y amabilidad de la población local', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 28, codigo: 'P28', texto: 'Seguridad percibida durante su estancia', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 29, codigo: 'P29', texto: 'Limpieza y mantenimiento del entorno', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 30, codigo: 'P30', texto: 'Relación calidad-precio de los servicios recibidos', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 31, codigo: 'P31', texto: 'Los servicios turísticos utilizados cumplieron con mis necesidades', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 32, codigo: 'P32', texto: 'Fue fácil encontrar servicios turísticos que necesitaba', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 33, codigo: 'P33', texto: 'Actividades y atractivos turísticos bastante diversificados', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 34, codigo: 'P34', texto: 'Se sintió seguridad durante su estadía', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    
    { id: 35, codigo: 'P35', texto: 'Encontré varias facilidades y equipamientos al servicio del visitante', tipo: 'Escala (1-5)', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] }
  ];
  

  // ESTABLECIMIENTOS DE ALOJAMIENTO (14 preguntas + tabla MINTUR)
  preguntasHotel: any[] = [
    { id: 1, codigo: 'A1', texto: 'Nombre del establecimiento', tipo: 'Texto', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 2, codigo: 'A2', texto: 'Dirección exacta del establecimiento', tipo: 'Texto', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 3, codigo: 'A3', texto: 'Correo electrónico de contacto', tipo: 'Email', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 4, codigo: 'A4', texto: 'Categoría del establecimiento (Hotel, Hostal, Casa de huéspedes, Cabañas, Otro)', tipo: 'Selección', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 5, codigo: 'A5', texto: 'Parroquia donde se ubica', tipo: 'Texto', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 6, codigo: 'A6', texto: 'Teléfono de contacto', tipo: 'Texto', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 7, codigo: 'A7', texto: 'Número de habitaciones disponibles', tipo: 'Número', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 8, codigo: 'A8', texto: 'Número de plazas (camas) disponibles', tipo: 'Número', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 9, codigo: 'B1', texto: 'Número de personas alojadas antes de comenzar el feriado', tipo: 'Número', seccion: 'Información sobre Demanda Turística', obligatoria: true },
    { id: 10, codigo: 'B2', texto: 'Tipo de tarifa cobrada (Por persona / Por habitación)', tipo: 'Selección', seccion: 'Información sobre Demanda Turística', obligatoria: true },
    { id: 11, codigo: 'B3', texto: 'Check-in Nacionales - Fecha 1, 2, 3, 4 y 5', tipo: 'Tabla numérica', seccion: 'Demanda Turística por Fecha', obligatoria: true },
    { id: 12, codigo: 'B4', texto: 'Check-in Extranjeros - Fecha 1, 2, 3, 4 y 5', tipo: 'Tabla numérica', seccion: 'Demanda Turística por Fecha', obligatoria: true },
    { id: 13, codigo: 'B5', texto: 'Pernoctaciones y Habitaciones ocupadas por fecha', tipo: 'Tabla numérica', seccion: 'Demanda Turística por Fecha', obligatoria: true },
    { id: 14, codigo: 'B6', texto: 'Tarifa cobrada por fecha', tipo: 'Tabla numérica', seccion: 'Demanda Turística por Fecha', obligatoria: true }
  ];

    // ✅ Métodos auxiliares para agrupar preguntas por sección
  obtenerSecciones(): string[] {
    if (!this.encuesta?.preguntas) return [];
    const secciones = new Set<string>();
    this.encuesta.preguntas.forEach((p: any) => secciones.add(p.seccion));
    return Array.from(secciones);
  }

  obtenerPreguntasPorSeccion(seccion: string): any[] {
    if (!this.encuesta?.preguntas) return [];
    return this.encuesta.preguntas.filter((p: any) => p.seccion === seccion);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.encuestaId = parseInt(this.route.snapshot.paramMap.get('id') || '0');
    
    // Asignar las preguntas reales según el ID
    if (this.encuestaId === 1) {
      this.encuesta = {
        id: 1,
        nombre: 'Encuesta Turística - Feriados Nacionales',
        descripcion: 'Encuesta para obtener información de turistas durante feriados (Perfil sociodemográfico, motivaciones, gasto y satisfacción)',
        tipo: 'turista',
        activa: true,
        preguntas: this.preguntasTurista
      };
    } else if (this.encuestaId === 2) {
      this.encuesta = {
        id: 2,
        nombre: 'Encuesta Establecimientos de Alojamiento - MINTUR',
        descripcion: 'Levantamiento de información en hoteles según Metodología MINTUR',
        tipo: 'hotel',
        activa: true,
        preguntas: this.preguntasHotel
      };
    }
  }

  volver() {
    this.router.navigate(['/encuestas']);
  }
}