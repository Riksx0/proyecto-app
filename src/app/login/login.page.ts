import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { trigger, transition, style, animate, query, group } from '@angular/animations';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent],
  animations: [
    trigger('stepAnimation', [
      transition('1 => 2, 2 => 3', [
        query(':enter, :leave', style({ position: 'absolute', width: '80%', left: '10%' }), { optional: true }),
        query(':enter', style({ transform: 'translateX(50%)', opacity: 0 }), { optional: true }),
        group([
          query(':leave', animate('800ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'scale(0.8)', opacity: 0 })), { optional: true }),
          query(':enter', animate('800ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'translateX(0)', opacity: 1 })), { optional: true })
        ])
      ]),
      transition('3 => 2, 2 => 1', [
        query(':enter, :leave', style({ position: 'absolute', width: '80%', left: '10%' }), { optional: true }),
        query(':enter', style({ transform: 'scale(0.8)', opacity: 0 }), { optional: true }),
        group([
          query(':leave', animate('800ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'translateX(50%)', opacity: 0 })), { optional: true }),
          query(':enter', animate('800ms cubic-bezier(0.68, -0.55, 0.265, 1.55)', style({ transform: 'scale(1)', opacity: 1 })), { optional: true })
        ])
      ])
    ])
  ]
})
export class LoginPage {
  /** Modo actual: 'login' o 'register' */
  mode: 'login' | 'register' = 'login';

  /** Paso actual del formulario de registro */
  currentStep: number = 1;

  /** Estado de carga para deshabilitar botones */
  loading: boolean = false;

  /** Mensaje de error para mostrar al usuario */
  errorMsg: string = '';

  /** Datos del formulario */
  userData = {
    email: '', pass: '', cpass: '',
    twitter: '', facebook: '', gplus: '',
    fname: '', lname: '', phone: '', address: ''
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  /** Cambia entre los modos login y registro */
  setMode(m: 'login' | 'register') {
    this.mode = m;
    this.errorMsg = '';
    this.currentStep = 1;
  }

  next() {
    if (this.currentStep < 3) this.currentStep++;
  }

  previous() {
    if (this.currentStep > 1) this.currentStep--;
  }

  /** Inicia sesión contra el backend PHP */
  iniciarSesion() {
    this.errorMsg = '';

    if (!this.userData.email || !this.userData.pass) {
      this.errorMsg = 'Por favor ingresa correo y contraseña.';
      return;
    }

    this.loading = true;

    this.authService.login(this.userData.email, this.userData.pass).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.status === 'success') {
          this.router.navigate(['/']);
        } else {
          this.errorMsg = response.message || 'Credenciales incorrectas.';
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.errorMsg = 'No se pudo conectar al servidor. ¿Está XAMPP activo?';
      }
    });
  }

  /** Registra un nuevo usuario en el backend PHP */
  submit() {
    this.errorMsg = '';

    if (this.userData.pass !== this.userData.cpass) {
      this.errorMsg = 'Las contraseñas no coinciden.';
      return;
    }

    if (!this.userData.email || !this.userData.pass) {
      this.errorMsg = 'El correo y la contraseña son obligatorios.';
      return;
    }

    this.loading = true;

    this.http.post('http://localhost/api/register.php', this.userData).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.status === 'success') {
          alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
          this.setMode('login');
        } else {
          this.errorMsg = response.message || 'Error al registrar usuario.';
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error del servidor:', error);
        this.errorMsg = 'Error al conectar con el servidor PHP. ¿Está XAMPP activo?';
      }
    });
  }
}