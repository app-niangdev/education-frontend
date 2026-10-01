// import { inject, Injectable } from '@angular/core';
// import { CanActivate, Router } from '@angular/router';
// import { Observable, catchError, map, of } from 'rxjs';
// import { AuthService } from 'src/app/auth/services/auth.service';

// @Injectable({
//   providedIn: 'root'
// })
// export class OwnerGuard implements CanActivate {
//   private authService = inject(AuthService);
//   private router = inject(Router);

//   // canActivate(): Observable<boolean> {
//     // return this.authService.getCurrentUser().pipe(
//     //   map((response) => {
//     //     if (response && response.role.name == 'Owner') {
//     //       return true;
//     //     } else {
//     //       this.router.navigate(['/index']);
//     //       return false;
//     //     }
//     //   }),
//     //   catchError(() => {
//     //     this.router.navigate(['/login']);
//     //     return of(false);
//     //   })
//     // );
//   // }
// }
