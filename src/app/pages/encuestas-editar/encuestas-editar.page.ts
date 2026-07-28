import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-encuestas-editar',
  templateUrl: './encuestas-editar.page.html',
  styleUrls: ['./encuestas-editar.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class EncuestasEditarPage implements OnInit {
  encuestaId: number = 0;
  encuesta: any = {
    id: 1,
    nombre: 'Encuesta Turística - Feriados Nacionales',
    descripcion: 'Encuesta para obtener información de turistas durante feriados',
    tipo: 'turista',
    activa: true,
    preguntas: []
  };

  // ✅ PREGUNTAS REALES - ENCUESTA TURÍSTICA (27 preguntas)
  preguntasTurista: any[] = [
    // SECCIÓN A: PERFIL SOCIODEMOGRÁFICO
    { id: 1, codigo: 'Q1', texto: '¿Qué edad tiene usted?', tipo: 'select', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['18 a 24 años', '25 a 34 años', '35 a 44 años', '45 a 54 años', '55 a 64 años', '65 años o más'] },
    { id: 2, codigo: 'Q2', texto: '¿Con qué género se identifica usted?', tipo: 'select', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Mujer', 'Hombre', 'Otro'] },
    { id: 3, codigo: 'Q3', texto: 'Por favor especifique el país de residencia', tipo: 'text', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true },
    { id: 4, codigo: 'Q4', texto: '¿Cuál es su nivel de educación?', tipo: 'select', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Educación básica', 'Bachillerato', 'Educación universitaria', 'Postgrado', 'Otro'] },
    { id: 5, codigo: 'Q5', texto: '¿Cuál es su ocupación actual?', tipo: 'select', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Empleado/a sector público', 'Empleado/a sector privado', 'Empresario/a', 'Estudiante', 'Desempleado/a', 'Jubilado/a', 'Otro'] },
    { id: 6, codigo: 'Q6', texto: '¿Cuántas personas, incluyéndose usted, viajaron en este grupo?', tipo: 'select', seccion: 'A. PERFIL SOCIODEMOGRÁFICO', obligatoria: true,
      opciones: ['Solo yo', '2 personas', '3 personas', '4 personas', '5 o más personas'] },
    
    // SECCIÓN B: PLANEACIÓN DEL VIAJE
    { id: 7, codigo: 'Q7', texto: '¿Cuál es el motivo principal de su visita?', tipo: 'multiselect', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Ocio / Vacaciones', 'Visita a familiares o amigos', 'Sol y playa', 'Actividades recreativas', 'Gastronomía', 'Compras', 'Negocios', 'Otro'] },
    { id: 8, codigo: 'Q8', texto: '¿Cuántas veces ha visitado este destino?', tipo: 'select', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Nunca', '1 vez', '2-3 veces', '4-5 veces', 'Más de 5 veces'] },
    { id: 9, codigo: 'Q9', texto: '¿Con quién viaja?', tipo: 'select', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Solo/a', 'En pareja', 'Con familia', 'Con amigos/as', 'Tour organizado', 'Otro'] },
    { id: 10, codigo: 'Q10', texto: '¿Qué lugares piensa visitar o visitó durante su viaje en la provincia de Santa Elena?', tipo: 'multiselect', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Montañita', 'Olón', 'Manglaralto', 'Salinas', 'Ayampe', 'Canoa', 'Otro'] },
    { id: 11, codigo: 'Q11', texto: '¿Cuántas noches se hospedó?', tipo: 'select', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['1 noche', '2-3 noches', '4-6 noches', '7 noches o más'] },
    { id: 12, codigo: 'Q12', texto: '¿Cómo buscó información antes del viaje?', tipo: 'multiselect', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Buscadores de Internet', 'Redes sociales', 'Agencias en línea', 'Recomendaciones', 'Sitio web del destino', 'Agentes de viaje', 'No busqué', 'Otro'] },
    { id: 13, codigo: 'Q13', texto: '¿Qué tan fácil fue encontrar información?', tipo: 'select', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Muy fácil', 'Fácil', 'Ni fácil ni difícil', 'Difícil', 'Muy difícil'] },
    { id: 14, codigo: 'Q14', texto: '¿Cómo organizó su viaje?', tipo: 'select', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['Por cuenta propia', 'Paquete turístico', 'Redes sociales', 'Familiares/amigos', 'Agencia de viajes', 'Otro'] },
    { id: 15, codigo: 'Q15', texto: '¿Con cuánta anticipación organizó el viaje?', tipo: 'select', seccion: 'B. PLANEACIÓN DEL VIAJE', obligatoria: true,
      opciones: ['El mismo día', '1-3 días antes', '4-7 días antes', '1-2 semanas antes', '3-4 semanas antes', '1-2 meses antes', 'Más de 2 meses'] },
    
    // SECCIÓN C: ESTRUCTURA DE CONSUMO
    { id: 16, codigo: 'Q16', texto: '¿Qué medio de transporte usó para llegar?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Vehículo propio', 'Autobús interprovincial', 'Vehículo de alquiler', 'Transporte turístico', 'Vehículo familiar', 'Avión', 'Otro'] },
    { id: 17, codigo: 'Q17', texto: '¿Qué transporte usó en el destino?', tipo: 'multiselect', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Vehículo propio', 'Transporte público', 'Uber/aplicaciones', 'Taxi', 'Vehículo alquilado', 'Caminando', 'Bicicleta', 'Otro'] },
    { id: 18, codigo: 'Q18', texto: '¿Cuánto gastó en transporte?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', '0 (Sin gasto)', 'Prefiero no responder'] },
    { id: 19, codigo: 'Q19', texto: '¿Cuánto gastó en alojamiento?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', '0 (Sin gasto)', 'Prefiero no responder'] },
    { id: 20, codigo: 'Q20', texto: '¿Cuánto gastó en alimentación?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', '0 (Sin gasto)', 'Prefiero no responder'] },
    { id: 21, codigo: 'Q21', texto: '¿Cuánto gastó en actividades recreativas?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', '0 (Sin gasto)', 'Prefiero no responder'] },
    { id: 22, codigo: 'Q22', texto: '¿Cuánto gastó en compras personales?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', '0 (Sin gasto)', 'Prefiero no responder'] },
    { id: 23, codigo: 'Q23', texto: '¿Qué tipo de viajero se considera?', tipo: 'select', seccion: 'C. ESTRUCTURA DE CONSUMO', obligatoria: true,
      opciones: ['Viajero de Bajo Presupuesto/Mochilero', 'Viajero de Gama Media', 'Viajero de Gama Alta', 'Viajero de Lujo', 'Prefiero no responder'] },
    
    // SECCIÓN D: SATISFACCIÓN
    { id: 24, codigo: 'Q24', texto: 'Nivel de satisfacción con los atractivos turísticos', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: true,
      opciones: ['1 - Muy insatisfecho', '2 - Insatisfecho', '3 - Ni satisfecho ni insatisfecho', '4 - Satisfecho', '5 - Muy satisfecho'] },
    { id: 25, codigo: 'Q25', texto: '¿Qué probabilidad hay de que recomiende este destino?', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: true,
      opciones: ['1 - Nada probable', '2 - Improbable', '3 - Ni probable ni improbable', '4 - Probable', '5 - Muy probable'] },
    { id: 26, codigo: 'Q26', texto: 'Información turística disponible (oficinas, mapas, señalización, apps)', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 27, codigo: 'Q27', texto: 'Atención y amabilidad de la población local', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 28, codigo: 'Q28', texto: 'Seguridad percibida durante su estancia', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 29, codigo: 'Q29', texto: 'Limpieza y mantenimiento del entorno', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 30, codigo: 'Q30', texto: 'Relación calidad-precio de los servicios recibidos', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 31, codigo: 'Q31', texto: 'Los servicios turísticos utilizados cumplieron con mis necesidades', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 32, codigo: 'Q32', texto: 'Fue fácil encontrar servicios turísticos que necesitaba', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 33, codigo: 'Q33', texto: 'Actividades y atractivos turísticos bastante diversificados', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 34, codigo: 'Q34', texto: 'Se sintió seguridad durante su estadía', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 35, codigo: 'Q35', texto: 'Encontré varias facilidades y equipamientos al servicio del visitante', tipo: 'escala', seccion: 'D. SATISFACCIÓN', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] }
  ];

  // ✅ PREGUNTAS REALES - ESTABLECIMIENTOS DE ALOJAMIENTO (16 preguntas)
  preguntasHotel: any[] = [
    // SECCIÓN A: IDENTIFICACIÓN DEL ESTABLECIMIENTO
    { id: 1, codigo: 'A1', texto: 'Nombre del establecimiento', tipo: 'text', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    { id: 2, codigo: 'A2', texto: 'Dirección exacta', tipo: 'text', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    { id: 3, codigo: 'A3', texto: 'Correo electrónico de contacto', tipo: 'email', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    { id: 4, codigo: 'A4', texto: 'Categoría del establecimiento', tipo: 'select', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true,
      opciones: ['1 estrella', '2 estrellas', '3 estrellas', '4 estrellas', '5 estrellas', 'casa de huéspedes', 'hostal', 'hotel', 'otro'] },
    { id: 5, codigo: 'A5', texto: 'Parroquia donde se ubica', tipo: 'text', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    { id: 6, codigo: 'A6', texto: 'Teléfono de contacto', tipo: 'text', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    { id: 7, codigo: 'A7', texto: 'Número de habitaciones disponibles', tipo: 'number', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    { id: 8, codigo: 'A8', texto: 'Número de plazas (camas) disponibles', tipo: 'number', seccion: 'A. IDENTIFICACIÓN DEL ESTABLECIMIENTO', obligatoria: true },
    
    // SECCIÓN B: DEMANDA TURÍSTICA
    { id: 9, codigo: 'B1', texto: 'Número de personas alojadas antes de comenzar el feriado', tipo: 'number', seccion: 'B. DEMANDA TURÍSTICA', obligatoria: true },
    { id: 10, codigo: 'B2', texto: 'Tipo de tarifa cobrada', tipo: 'select', seccion: 'B. DEMANDA TURÍSTICA', obligatoria: true,
      opciones: ['Por persona', 'Por habitación'] },
    
    // SECCIÓN C: DEMANDA POR FECHA
    { id: 11, codigo: 'C1', texto: 'Check-in Nacionales - Fecha 1', tipo: 'number', seccion: 'C. DEMANDA POR FECHA', obligatoria: true },
    { id: 12, codigo: 'C2', texto: 'Check-in Extranjeros - Fecha 1', tipo: 'number', seccion: 'C. DEMANDA POR FECHA', obligatoria: true },
    { id: 13, codigo: 'C3', texto: 'Pernoctaciones - Fecha 1', tipo: 'number', seccion: 'C. DEMANDA POR FECHA', obligatoria: true },
    { id: 14, codigo: 'C4', texto: 'Habitaciones ocupadas - Fecha 1', tipo: 'number', seccion: 'C. DEMANDA POR FECHA', obligatoria: true },
    { id: 15, codigo: 'C5', texto: 'Tarifa cobrada - Fecha 1', tipo: 'number', seccion: 'C. DEMANDA POR FECHA', obligatoria: true }
  ];

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
        descripcion: 'Encuesta para obtener información de turistas durante feriados',
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

  guardarCambios() {
    alert('Cambios guardados exitosamente');
    this.router.navigate(['/encuestas']);
  }

  cancelar() {
    this.router.navigate(['/encuestas']);
  }

  agregarPregunta() {
    const nuevaPregunta = {
      id: this.encuesta.preguntas.length + 1,
      codigo: `Q${this.encuesta.preguntas.length + 1}`,
      texto: 'Nueva pregunta',
      tipo: 'text',
      seccion: 'Nueva sección',
      obligatoria: false
    };
    this.encuesta.preguntas.push(nuevaPregunta);
  }

    eliminarPregunta(id: number) {
    // ✅ Agregamos ": any" al parámetro p
    this.encuesta.preguntas = this.encuesta.preguntas.filter((p: any) => p.id !== id);
  
  }

  // ✅ Métodos auxiliares para agrupar preguntas por sección
  obtenerSecciones(): string[] {
    if (!this.encuesta?.preguntas) return [];
    const secciones = new Set<string>();
    this.encuesta.preguntas.forEach((p: any) => secciones.add(p.seccion));
    return Array.from(secciones);
  }

  getPreguntasPorSeccion(seccion: string): any[] {
    if (!this.encuesta?.preguntas) return [];
    return this.encuesta.preguntas.filter((p: any) => p.seccion === seccion);
  }
}