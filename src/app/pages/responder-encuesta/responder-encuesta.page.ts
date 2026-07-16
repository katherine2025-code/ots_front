import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-responder-encuesta',
  templateUrl: './responder-encuesta.page.html',
  styleUrls: ['./responder-encuesta.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ResponderEncuestaPage implements OnInit {
  tipoEncuesta: 'turista' | 'hotel' = 'turista';
  respuestas: any = {};
  preguntas: any[] = [];
  guardando: boolean = false;
  exportando: boolean = false;
  fechaEncuesta: string = new Date().toISOString();

  // PREGUNTAS REALES - ENCUESTA TURÍSTICA (Basado en CSV KoboToolbox)
  preguntasTurista: any[] = [
    { id: 1, codigo: 'edad', texto: '¿Qué edad tiene usted?', tipo: 'select', seccion: 'Perfil Sociodemográfico', obligatoria: true,
      opciones: ['18 a 24 años', '25 a 34 años', '35 a 44 años', '45 a 54 años', '55 a 64 años', '65 años o más'] },
    { id: 2, codigo: 'genero', texto: '¿Con qué género se identifica usted?', tipo: 'select', seccion: 'Perfil Sociodemográfico', obligatoria: true,
      opciones: ['Mujer', 'Hombre', 'Otro'] },
    { id: 3, codigo: 'pais_residencia', texto: 'Por favor especifique el país de residencia', tipo: 'text', seccion: 'Perfil Sociodemográfico', obligatoria: true },
    { id: 4, codigo: 'educacion', texto: '¿Cuál es su nivel de educación?', tipo: 'select', seccion: 'Perfil Sociodemográfico', obligatoria: true,
      opciones: ['Educación Primaria', 'Educación Secundaria', 'Formación técnica o tecnológica', 'Educación universitaria', 'Posgrado (especialización, maestría, doctorado)', 'Prefiero no responder'] },
    { id: 5, codigo: 'ocupacion', texto: '¿Cuál es su ocupación actual?', tipo: 'select', seccion: 'Perfil Sociodemográfico', obligatoria: true,
      opciones: ['Empleado/a en el sector público', 'Empleado/a en el sector privado', 'Emprendedor/a o dueño/a de negocio', 'Trabajador/a independiente o por cuenta propia', 'Estudiante', 'Ama/o de casa o tareas del hogar', 'Jubilado/a o pensionista', 'Desempleado/a en búsqueda de empleo', 'Prefiero no responder'] },
    { id: 6, codigo: 'personas_grupo', texto: '¿Cuántas personas, incluyéndose usted, viajaron en este grupo?', tipo: 'select', seccion: 'Perfil Sociodemográfico', obligatoria: true,
      opciones: ['Solo yo (viajé solo/a)', '2 personas', '3 personas', '4 personas', '5 personas', '6 personas', '7 personas o más'] },
    { id: 7, codigo: 'motivo_visita', texto: '¿Cuál es el motivo principal de su visita?', tipo: 'multiselect', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Ocio / Vacaciones', 'Visita a familiares o amigos', 'Sol y playa', 'Gastronomía', 'Naturaleza y Aventura (aviturismo, senderismo, flora y fauna, etc.)', 'Cultura y Patrimonio (arquitectura, arte, museos, iglesias, etc.)', 'Ciudad (parques, malecones, city tours, etc.)', 'Turismo rural (agroturismo, turismo comunitario, recorridos fluviales, etc.)', 'Turismo deportivo', 'Entretenimiento y vida nocturna', 'Compras', 'Salud o tratamiento médico', 'Estudios o formación', 'Negocios, trabajo o eventos corporativos', 'Asistencia a eventos (culturales, deportivos, religiosos, etc.)', 'Participación en ferias y convenciones', 'Otro'] },
    { id: 8, codigo: 'veces_visitado', texto: '¿Cuántas veces ha visitado este destino?', tipo: 'select', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Nunca', '1 vez', '2-3 veces', '4-5 veces', 'Más de 5 veces'] },
    { id: 9, codigo: 'con_quien_viaja', texto: '¿Con quién viaja?', tipo: 'select', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Solo/a', 'En pareja', 'Con familia (incluye niños/as)', 'Con amigos/as', 'Tour organizado', 'Otro'] },
    { id: 10, codigo: 'lugares_visitados', texto: '¿Qué lugares piensa visitar o visitó durante su viaje en la provincia de Santa Elena?', tipo: 'multiselect', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Montañita', 'Olón', 'Manglaralto', 'Salinas', 'Ayampe', 'Canoa', 'San Pablo', 'Playa Ballenita', 'Chipipe', 'La Chocolatera', 'La Lobería', 'Cerro El Morro', 'San Lorenzo', 'Ayangue', 'San Pedro', 'Otro'] },
    { id: 11, codigo: 'noches_hospedado', texto: '¿Cuántas noches se hospedó?', tipo: 'select', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['0 noches (visita por el día)', '1 noche', '2 noches', '3 noches', '4 a 6 noches', '7 noches o más'] },
    { id: 12, codigo: 'busco_informacion', texto: '¿Cómo buscó información antes del viaje?', tipo: 'multiselect', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Buscadores de Internet: Google Search, YouTube, Bing, Yahoo', 'Redes sociales (Facebook, Instagram, Twitter, Tik Tok, Otro)', 'Agencias en línea: Booking, Expedia, Hotels.com, Airbnb, Otro', 'Recomendaciones personales de amigos o familiares', 'Sitio web del destino', 'Agentes de viaje tradicionales y operadoras de turismo', 'No busqué información', 'Otro medio'] },
    { id: 13, codigo: 'facilidad_informacion', texto: '¿Qué tan fácil fue encontrar información?', tipo: 'select', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Muy fácil', 'Fácil', 'Ni fácil ni difícil', 'Difícil', 'Muy difícil', 'No busqué información'] },
    { id: 14, codigo: 'como_organizo', texto: '¿Cómo organizó su viaje?', tipo: 'select', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['Por cuenta propia (contactando directamente con alojamientos, transporte, etc.)', 'Por medio de un paquete turístico', 'A través de redes sociales o grupos de viaje', 'Con ayuda de familiares o amigos en el destino', 'A través de una agencia de viajes en línea (OTA)', 'A través de una agencia de viajes presencial', 'Otro'] },
    { id: 15, codigo: 'anticipacion', texto: '¿Con cuánta anticipación organizó su viaje a Salinas?', tipo: 'select', seccion: 'Planeación del Viaje', obligatoria: true,
      opciones: ['El mismo día del viaje', '1 a 3 días antes', '4 a 7 días antes', '1 a 2 semanas antes', '3 a 4 semanas antes', '1 a 2 meses antes', 'Más de 2 meses antes'] },
    { id: 16, codigo: 'transporte_llegada', texto: '¿Qué medio de transporte utilizó para llegar?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['Vehículo propio', 'Autobús interprovincial', 'Vehículo de alquiler sin conductor', 'Vehículo de un familiar o amigo', 'Transporte turístico contratado (tour, agencia)', 'Servicio de transporte por app (Uber, InDrive, etc.)', 'Avión (vuelo directo hasta ciudad cercana + traslado terrestre)', 'Otro'] },
    { id: 17, codigo: 'transporte_destino', texto: '¿Qué medio de transporte utilizó en el destino?', tipo: 'multiselect', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['Vehículo propio', 'Transporte público (bus)', 'Uber u otras aplicaciones de transporte privado', 'Taxi amarillo', 'Vehículo motorizado alquilado', 'Caminando', 'Bicicleta', 'Otro'] },
    { id: 18, codigo: 'gasto_transporte', texto: '¿Cuánto gastó en transporte?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['0 (Sin gasto en este concepto)', 'Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Prefiero no responder'] },
    { id: 19, codigo: 'gasto_alojamiento', texto: '¿Cuánto gastó en alojamiento?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['0 (Sin gasto en este concepto)', 'Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', 'Prefiero no responder'] },
    { id: 20, codigo: 'gasto_alimentacion', texto: '¿Cuánto gastó en alimentación?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['0 (Sin gasto en este concepto)', 'Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', 'Prefiero no responder'] },
    { id: 21, codigo: 'gasto_actividades', texto: '¿Cuánto gastó en actividades recreativas?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['0 (Sin gasto en este concepto)', 'Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Prefiero no responder'] },
    { id: 22, codigo: 'gasto_compras', texto: '¿Cuánto gastó en compras personales?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['0 (Sin gasto en este concepto)', 'Menos de $20', 'De $21 a $50', 'De $51 a $100', 'Más de $100', 'Más de $200', 'Prefiero no responder'] },
    { id: 23, codigo: 'tipo_viajero', texto: '¿Qué tipo de viajero se considera?', tipo: 'select', seccion: 'Estructura de Consumo', obligatoria: true,
      opciones: ['Viajero de Bajo Presupuesto/Mochilero: Mi prioridad es el costo más bajo posible, maximizando el ahorro.', 'Viajero de Gama Media: Priorizo el equilibrio entre costo y calidad; no escatimo en lo necesario, pero busco ofertas.', 'Viajero de Gama Alta: Busco calidad, me permito gastos significativos, pero soy consciente de mi presupuesto.', 'Viajero de Lujo: Mi presupuesto es ilimitado y priorizo el confort y la exclusividad.', 'Prefiero no responder'] },
    { id: 24, codigo: 'satisfaccion_atractivos', texto: 'En una escala del 1 al 5, ¿cuál es su nivel de satisfacción con respecto a su experiencia en los atractivos turísticos de Salinas que ha visitado?', tipo: 'escala', seccion: 'Satisfacción', obligatoria: true,
      opciones: ['1 - Muy insatisfecho', '2 - Insatisfecho', '3 - Ni satisfecho ni insatisfecho', '4 - Satisfecho', '5 - Muy satisfecho', 'N/A'] },
    { id: 25, codigo: 'expectativas', texto: '¿Cómo calificaría sus expectativas vs. la realidad experimentada?', tipo: 'select', seccion: 'Satisfacción', obligatoria: true,
      opciones: ['Muy por debajo de lo esperado', 'Algo por debajo de lo esperado', 'Igual a lo esperado', 'Algo por encima de lo esperado', 'Muy por encima de lo esperado'] },
    { id: 26, codigo: 'satisfaccion_informacion', texto: 'Información turística disponible (oficinas, mapas, señalización, apps)', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 27, codigo: 'satisfaccion_atencion', texto: 'Atención y amabilidad de la población local', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 28, codigo: 'satisfaccion_seguridad', texto: 'Seguridad percibida durante su estancia', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 29, codigo: 'satisfaccion_limpieza', texto: 'Limpieza y mantenimiento del entorno', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 30, codigo: 'satisfaccion_calidad_precio', texto: 'Relación calidad-precio de los servicios recibidos', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 31, codigo: 'satisfaccion_servicios', texto: 'Los servicios turísticos utilizados cumplieron con mis necesidades', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 32, codigo: 'satisfaccion_facilidad', texto: 'Fue fácil encontrar servicios turísticos que necesitaba', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 33, codigo: 'satisfaccion_diversidad', texto: 'Actividades y atractivos turísticos bastante diversificados', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 34, codigo: 'satisfaccion_seguridad_estadia', texto: 'Se sintió seguridad durante su estadía', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 35, codigo: 'satisfaccion_equipamientos', texto: 'Encontré varias facilidades y equipamientos al servicio del visitante', tipo: 'escala', seccion: 'Satisfacción', obligatoria: false,
      opciones: ['1', '2', '3', '4', '5', 'N/A'] },
    { id: 36, codigo: 'probabilidad_recomendar', texto: '¿Qué probabilidad hay de que recomiende este destino a amigos o familiares?', tipo: 'escala', seccion: 'Satisfacción', obligatoria: true,
      opciones: ['1 - Nada probable', '2 - Improbable', '3 - Ni probable ni improbable', '4 - Probable', '5 - Muy probable'] }
  ];

  // ✅ PREGUNTAS REALES - ESTABLECIMIENTOS DE ALOJAMIENTO (Basado en CSV MINTUR)
  preguntasHotel: any[] = [
    { id: 1, codigo: 'provincia', texto: 'Provincia', tipo: 'text', seccion: 'Identificación del Establecimiento', obligatoria: true, valorDefault: 'Santa Elena' },
    { id: 2, codigo: 'nombre_establecimiento', texto: 'Nombre del establecimiento', tipo: 'text', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 3, codigo: 'direccion', texto: 'Dirección exacta', tipo: 'text', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 4, codigo: 'email', texto: 'Correo electrónico de contacto', tipo: 'email', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 5, codigo: 'categoria', texto: 'Categoría del establecimiento', tipo: 'select', seccion: 'Identificación del Establecimiento', obligatoria: true,
      opciones: ['1 estrella', '2 estrellas', '3 estrellas', '4 estrellas', '5 estrellas', 'casa de huéspedes', 'hostal', 'hotel', 'otro'] },
    { id: 6, codigo: 'telefono', texto: 'Teléfono de contacto', tipo: 'text', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 7, codigo: 'parroquia', texto: 'Parroquia donde se ubica', tipo: 'select', seccion: 'Identificación del Establecimiento', obligatoria: true,
      opciones: ['Manglaralto', 'Colonche', 'Anconcito', 'Atahualpa', 'Balao', 'Balzar', 'Bolivar', 'Cadeate', 'Chanduy', 'El Ancón', 'José Luis Tamayo', 'Manglaralto', 'Montañita', 'Olón', 'Palmar', 'Pedro Carbo', 'Puná', 'Salinas', 'Santa Elena', 'Simón Bolívar'] },
    { id: 8, codigo: 'num_habitaciones', texto: 'Número de habitaciones disponibles', tipo: 'number', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 9, codigo: 'num_plazas', texto: 'Número de plazas (camas) disponibles', tipo: 'number', seccion: 'Identificación del Establecimiento', obligatoria: true },
    { id: 10, codigo: 'personas_antes_feriado', texto: 'Número de personas alojadas antes de comenzar el feriado', tipo: 'number', seccion: 'Demanda Turística', obligatoria: true },
    { id: 11, codigo: 'tipo_tarifa', texto: 'Tipo de tarifa cobrada', tipo: 'select', seccion: 'Demanda Turística', obligatoria: true,
      opciones: ['Por persona', 'Por habitacion'] },
    { id: 12, codigo: 'fecha1_nacionales', texto: 'Fecha 1 - Check-in Nacionales', tipo: 'number', seccion: 'Demanda por Fecha (Fecha 1)', obligatoria: true },
    { id: 13, codigo: 'fecha1_extranjeros', texto: 'Fecha 1 - Check-in Extranjeros', tipo: 'number', seccion: 'Demanda por Fecha (Fecha 1)', obligatoria: true },
    { id: 14, codigo: 'fecha1_pernoctaciones', texto: 'Fecha 1 - Pernoctaciones', tipo: 'number', seccion: 'Demanda por Fecha (Fecha 1)', obligatoria: true },
    { id: 15, codigo: 'fecha1_habitaciones', texto: 'Fecha 1 - Habitaciones ocupadas', tipo: 'number', seccion: 'Demanda por Fecha (Fecha 1)', obligatoria: true },
    { id: 16, codigo: 'fecha1_tarifa', texto: 'Fecha 1 - Tarifa cobrada', tipo: 'number', seccion: 'Demanda por Fecha (Fecha 1)', obligatoria: true }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    const tipo = this.route.snapshot.paramMap.get('tipo');
    this.tipoEncuesta = (tipo === 'hotel') ? 'hotel' : 'turista';
    this.preguntas = this.tipoEncuesta === 'turista' ? this.preguntasTurista : this.preguntasHotel;
  }

  cambiarTipo(event: any) {
    const valor = event.detail.value as 'turista' | 'hotel';
    this.tipoEncuesta = valor;
    this.preguntas = valor === 'turista' ? this.preguntasTurista : this.preguntasHotel;
    this.respuestas = {};
  }

  obtenerSecciones(): string[] {
    const secciones = new Set<string>();
    this.preguntas.forEach(p => secciones.add(p.seccion));
    return Array.from(secciones);
  }

  getPreguntasPorSeccion(seccion: string): any[] {
    return this.preguntas.filter(p => p.seccion === seccion);
  }

  async guardarRespuestas() {
    // Validar campos obligatorios
    const obligatorias = this.preguntas.filter(p => p.obligatoria);
    const faltantes = obligatorias.filter(p => !this.respuestas[p.codigo]);
    
    if (faltantes.length > 0) {
      alert(` Faltan ${faltantes.length} preguntas obligatorias por responder`);
      return;
    }

    this.guardando = true;
    
    try {
      const registro = {
        fecha: new Date().toISOString(),
        tipo: this.tipoEncuesta,
        respuestas: this.respuestas
      };
      
      const respuestasGuardadas = JSON.parse(localStorage.getItem('respuestas_encuestas') || '[]');
      respuestasGuardadas.push(registro);
      localStorage.setItem('respuestas_encuestas', JSON.stringify(respuestasGuardadas));
      
      alert(' Respuestas guardadas exitosamente');
      this.router.navigate(['/encuestas']);
    } catch (error) {
      console.error('Error al guardar:', error);
      alert(' Error al guardar las respuestas');
    } finally {
      this.guardando = false;
    }
  }

  async exportarCSV() {
    this.exportando = true;
    
    try {
      const headers = ['fecha_encuesta', 'tipo_encuesta', ...this.preguntas.map(p => p.codigo)];
      const row = [
        this.fechaEncuesta,
        this.tipoEncuesta,
        ...this.preguntas.map(p => this.respuestas[p.codigo] || '')
      ];
      
      const csvContent = [headers.join(';'), row.join(';')].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      const nombreArchivo = `encuesta_${this.tipoEncuesta}_${new Date().getTime()}.csv`;
      link.setAttribute('download', nombreArchivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert(`CSV exportado exitosamente: ${nombreArchivo}\n\nAhora puede subir este archivo al módulo ETL`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar CSV');
    } finally {
      this.exportando = false;
    }
  }

  volver() {
    this.router.navigate(['/encuestas']);
  }
}