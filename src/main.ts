import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { routes } from './app/app.routes';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';

// ==========================================
// IMPORTAR TODOS LOS ICONOS NECESARIOS
// ==========================================
import { addIcons } from 'ionicons';
import { 
  // Iconos ETL y Datos
  cloudUploadOutline,
  timeOutline,
  calendarOutline,
  bugOutline,
  refreshOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline, 
  alertCircleOutline,
  documentTextOutline,
  closeCircleOutline,
  arrowUpCircleOutline,
  informationCircleOutline,
  syncOutline,
  serverOutline,        
  folderOpenOutline,
  trashOutline,
  
  // Iconos de navegación
  gridOutline,
  businessOutline,
  peopleOutline,
  analyticsOutline,
  logOutOutline,
  personCircleOutline,
  peopleCircleOutline,
  settingsOutline,
  personOutline,
  
  // Iconos del LOGIN
  mailOutline,
  lockClosedOutline,
  logInOutline,
  eyeOutline,
  eyeOffOutline,
  
  // Otros iconos de la app
  saveOutline,
  cameraOutline,
  shieldCheckmarkOutline,
  trendingUpOutline,
  downloadOutline,
  filterOutline,
  addCircleOutline,
  personAddOutline,
  checkmarkOutline,
  closeOutline,
  homeOutline,
  optionsOutline,
  bookOutline,
  listOutline
} from 'ionicons/icons';

// ==========================================
// REGISTRAR TODOS LOS ICONOS
// ==========================================
addIcons({
  // ETL y Datos
  cloudUploadOutline,
  timeOutline,
  calendarOutline,
  bugOutline,
  refreshOutline,
  checkmarkCircleOutline,
  checkmarkDoneOutline, 
  alertCircleOutline,
  documentTextOutline,
  closeCircleOutline,
  arrowUpCircleOutline,
  informationCircleOutline,
  syncOutline,
  serverOutline,        
  folderOpenOutline,
  trashOutline,
  
  // Navegación
  gridOutline,
  businessOutline,
  peopleOutline,
  analyticsOutline,
  logOutOutline,
  personCircleOutline,
  peopleCircleOutline,
  settingsOutline,
  personOutline,
  
  // LOGIN
  mailOutline,
  lockClosedOutline,
  logInOutline,
  eyeOutline,
  eyeOffOutline,
  
  // Otros
  saveOutline,
  cameraOutline,
  shieldCheckmarkOutline,
  trendingUpOutline,
  downloadOutline,
  filterOutline,
  addCircleOutline,
  personAddOutline,
  checkmarkOutline,
  closeOutline,
  homeOutline,
  optionsOutline,
  bookOutline,
  listOutline
});

// ==========================================
// INICIALIZACIÓN DE LA APP
// ==========================================
if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideIonicAngular({})
  ]
}).catch(err => console.log(err));