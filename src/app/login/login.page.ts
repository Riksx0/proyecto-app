import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonIcon,
  IonSpinner
} from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { EveMarketService } from '../services/eve-market.service';
import { addIcons } from 'ionicons';
import {
  personOutline,
  personAddOutline,
  lockClosedOutline,
  rocketOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  shieldCheckmarkOutline,
  sparklesOutline
} from 'ionicons/icons';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonIcon,
    IonSpinner
  ]
})
export class LoginPage {
  mode: 'login' | 'register' = 'login';

  username: string = '';
  pass: string = '';
  confirmPass: string = '';

  loading: boolean = false;
  errorMsg: string = '';
  successMsg: string = '';

  constructor(
    private authService: AuthService,
    private marketService: EveMarketService,
    private router: Router
  ) {
    addIcons({
      personOutline,
      personAddOutline,
      lockClosedOutline,
      rocketOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      shieldCheckmarkOutline,
      sparklesOutline
    });
  }

  setMode(newMode: 'login' | 'register') {
    this.mode = newMode;
    this.errorMsg = '';
    this.successMsg = '';
    this.pass = '';
    this.confirmPass = '';
  }

  iniciarSesion() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.username.trim()) {
      this.errorMsg = 'Por favor ingresa tu nombre de piloto (usuario).';
      return;
    }

    if (!this.pass.trim()) {
      this.errorMsg = 'Por favor ingresa tu contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login(this.username, this.pass).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.user) {
          this.marketService.loadUserData(res.user.username);
          this.successMsg = `¡Bienvenido Piloto ${res.user.username}! Conectando con New Eden...`;
          setTimeout(() => {
            this.router.navigate(['/']);
          }, 500);
        } else {
          this.errorMsg = res.message || 'No se pudo verificar el piloto.';
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.errorMsg = 'Error al procesar el inicio de sesión.';
      }
    });
  }

  registrar() {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.username.trim()) {
      this.errorMsg = 'Por favor ingresa un nombre de piloto.';
      return;
    }

    if (!this.pass.trim()) {
      this.errorMsg = 'Por favor crea una contraseña.';
      return;
    }

    if (this.pass.length < 4) {
      this.errorMsg = 'La contraseña debe tener al menos 4 caracteres.';
      return;
    }

    if (this.pass !== this.confirmPass) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    this.loading = true;

    this.authService.register(this.username, this.pass).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.successMsg = res.message;
          // Dejar el nombre listo y pasar al modo login
          setTimeout(() => {
            this.setMode('login');
            this.successMsg = '¡Registro completado! Ingresa tu contraseña para entrar.';
          }, 1200);
        } else {
          this.errorMsg = res.message || 'Error al registrar el piloto.';
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.errorMsg = 'Error al registrar piloto.';
      }
    });
  }
}