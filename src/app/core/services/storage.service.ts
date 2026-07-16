import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private prefix = 'ots_';

  set(key: string, value: string): void {
    localStorage.setItem(`${this.prefix}${key}`, value);
  }

  get(key: string): string | null {
    return localStorage.getItem(`${this.prefix}${key}`);
  }

  remove(key: string): void {
    localStorage.removeItem(`${this.prefix}${key}`);
  }

  clear(): void {
    localStorage.clear();
  }
}