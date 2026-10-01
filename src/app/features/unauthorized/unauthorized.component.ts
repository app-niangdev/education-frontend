import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { fadeInUp400ms } from '@vex/animations/fade-in-up.animation';
import { AuthService } from 'src/app/auth/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  templateUrl: './unauthorized.component.html',
  styleUrls: ['./unauthorized.component.scss'],
  animations: [fadeInUp400ms],
  standalone: true,
  imports: [MatButtonModule, MatIconModule]
})
export class UnauthorizedComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  goBack() {
    const user = this.authService.getCurrentUserSync();
    const role = user?.role?.toLowerCase() ?? '';

    if (role === 'admin') {
      this.router.navigate(['/index/admin']);
    } else if (role === 'manager') {
      this.router.navigate(['/index/manager']);
    } else {
      this.router.navigate(['/']);
    }
  }
}
