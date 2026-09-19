import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Tema = 'claro' | 'oscuro';

const CLAVE = 'ots_tema';
const CLASE_OSCURO = 'ion-palette-dark';  // clase de la paleta oscura de Ionic (ver global.scss)

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private tema$ = new BehaviorSubject<Tema>('claro');
  readonly temaActual$ = this.tema$.asObservable();

  // Se llama una vez al arrancar la app. Sin preferencia guardada, se respeta la del sistema.
  iniciar(): void {
    this.aplicar(this.leerGuardado() ?? (this.sistemaPrefiereOscuro() ? 'oscuro' : 'claro'), false);
  }

  get esOscuro(): boolean {
    return this.tema$.value === 'oscuro';
  }

  alternar(): void {
    this.aplicar(this.esOscuro ? 'claro' : 'oscuro', true);
  }

  private aplicar(tema: Tema, guardar: boolean): void {
    const oscuro = tema === 'oscuro';
    document.documentElement.classList.toggle(CLASE_OSCURO, oscuro);
    document.documentElement.style.colorScheme = oscuro ? 'dark' : 'light';
    this.tema$.next(tema);
    if (guardar) {
      try { localStorage.setItem(CLAVE, tema); } catch { /* almacenamiento no disponible */ }
    }
  }

  private leerGuardado(): Tema | null {
    try {
      const valor = localStorage.getItem(CLAVE);
      return valor === 'claro' || valor === 'oscuro' ? valor : null;
    } catch {
      return null;
    }
  }

  private sistemaPrefiereOscuro(): boolean {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  }
}
