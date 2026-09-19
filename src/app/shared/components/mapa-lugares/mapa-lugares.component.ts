import {
  AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import { LugarVisita } from 'src/app/core/services/lugares.service';

// Centro aproximado de la península de Santa Elena
const CENTRO: L.LatLngExpression = [-2.0, -80.85];
const ZOOM_INICIAL = 9;

@Component({
  selector: 'app-mapa-lugares',
  standalone: true,
  imports: [CommonModule],
  template: `<div #contenedor class="mapa"></div>`,
  styles: [`
    :host { display: block; }
    .mapa { height: 380px; width: 100%; border-radius: 12px; overflow: hidden; z-index: 0; }
  `]
})
export class MapaLugaresComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() lugares: LugarVisita[] = [];
  @ViewChild('contenedor', { static: true }) contenedor!: ElementRef<HTMLDivElement>;

  private mapa?: L.Map;
  private capa = L.layerGroup();
  private observador?: ResizeObserver;
  private firmaDibujada = '';

  constructor(private zone: NgZone) { }

  ngAfterViewInit() {
    // Leaflet escucha mouse, scroll y animaciones: se ejecuta FUERA de Angular para que cada
    // movimiento del mapa no dispare una revisión completa de la página.
    this.zone.runOutsideAngular(() => this.crearMapa());
  }

  private crearMapa() {
    this.mapa = L.map(this.contenedor.nativeElement, { scrollWheelZoom: false }).setView(CENTRO, ZOOM_INICIAL);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(this.mapa);
    this.capa.addTo(this.mapa);
    this.dibujar();

    // El mapa se crea dentro de una página de Ionic: se recalcula el tamaño cuando el contenedor cambia
    this.observador = new ResizeObserver(() => this.mapa?.invalidateSize());
    this.observador.observe(this.contenedor.nativeElement);
    setTimeout(() => this.mapa?.invalidateSize(), 300);
  }

  ngOnChanges() {
    if (this.mapa) this.zone.runOutsideAngular(() => this.dibujar());
  }

  ngOnDestroy() {
    this.observador?.disconnect();
    this.mapa?.remove();
  }

  private dibujar() {
    if (!this.mapa) return;

    // Si los datos no cambiaron no se redibuja (evita trabajo y parpadeos en cada refresco)
    const firma = JSON.stringify((this.lugares || []).map(l => [l.nombre, l.visitas, l.lat, l.lng]));
    if (firma === this.firmaDibujada) return;
    this.firmaDibujada = firma;

    this.capa.clearLayers();

    const puntos = (this.lugares || []).filter(l => l.lat !== null && l.lng !== null && l.visitas > 0);
    if (puntos.length === 0) {
      this.mapa.setView(CENTRO, ZOOM_INICIAL);
      return;
    }

    const maximo = Math.max(...puntos.map(p => p.visitas));
    const limites: L.LatLngTuple[] = [];

    for (const p of puntos) {
      const intensidad = p.visitas / maximo;                 // 0..1
      const color = `hsl(${Math.round(50 - 50 * intensidad)}, 90%, 48%)`;  // amarillo -> rojo
      const posicion: L.LatLngTuple = [p.lat as number, p.lng as number];
      limites.push(posicion);

      L.circleMarker(posicion, {
        radius: 9 + 22 * Math.sqrt(intensidad),
        color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 0.8
      })
        .bindTooltip(`${p.nombre}: ${p.visitas}`, { direction: 'top' })
        .bindPopup(
          `<strong>${this.escapar(p.nombre)}</strong><br>${p.visitas} visita${p.visitas === 1 ? '' : 's'} ` +
          `(${p.porcentaje}% de los turistas encuestados)` + (p.canton ? `<br>Cantón ${this.escapar(p.canton)}` : '')
        )
        .addTo(this.capa);
    }

    this.mapa.fitBounds(L.latLngBounds(limites), { padding: [40, 40], maxZoom: 11 });
  }

  private escapar(texto: string): string {
    return texto.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
  }
}
