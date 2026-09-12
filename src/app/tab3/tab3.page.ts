import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonInput,
  IonButton,
  IonIcon,
  IonToast
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  moon,
  sunny,
  personOutline,
  mailOutline,
  saveOutline,
  checkmarkCircle
} from 'ionicons/icons';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-tab3',
  templateUrl: 'tab3.page.html',
  styleUrls: ['tab3.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonInput,
    IonButton,
    IonIcon,
    IonToast
  ]
})
export class Tab3Page implements OnInit {
  darkMode = false;
  isSaving = false;

  userData = {
    fname: '',
    lname: '',
    email: ''
  };

  showToast = false;
  toastMessage = '';
  toastColor = 'success';

  constructor(private authService: AuthService) {
    addIcons({
      moon,
      sunny,
      personOutline,
      mailOutline,
      saveOutline,
      checkmarkCircle
    });
  }

  ngOnInit() {
    this.checkDarkModePreference();
    this.loadUserData();
  }

  ionViewWillEnter() {
    this.loadUserData();
  }

  private checkDarkModePreference() {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      this.darkMode = savedTheme === 'true';
    } else {
      // Verificar preferencia del sistema operativo si no se ha guardado preferencia previa
      this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    this.applyDarkMode(this.darkMode);
  }

  toggleDarkMode(event: any) {
    this.darkMode = event.detail.checked;
    localStorage.setItem('darkMode', this.darkMode ? 'true' : 'false');
    this.applyDarkMode(this.darkMode);
  }

  private applyDarkMode(isDark: boolean) {
    document.documentElement.classList.toggle('ion-palette-dark', isDark);
  }

  loadUserData() {
    const user = this.authService.getUser();
    if (user) {
      this.userData = {
        fname: user.fname || '',
        lname: user.lname || '',
        email: user.email || ''
      };
    }
  }

  saveProfile() {
    if (!this.userData.fname.trim() || !this.userData.email.trim()) {
      this.presentToast('El nombre y el correo no pueden estar vacíos.', 'warning');
      return;
    }

    this.isSaving = true;

    try {
      this.authService.updateUserData({
        fname: this.userData.fname.trim(),
        lname: this.userData.lname.trim(),
        email: this.userData.email.trim()
      });

      this.presentToast('¡Datos actualizados correctamente!', 'success');
    } catch (error) {
      this.presentToast('Error al guardar los datos.', 'danger');
    } finally {
      this.isSaving = false;
    }
  }

  private presentToast(message: string, color: string = 'success') {
    this.toastMessage = message;
    this.toastColor = color;
    this.showToast = true;
  }
}
