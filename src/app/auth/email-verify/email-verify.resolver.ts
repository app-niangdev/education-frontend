import { Injectable } from "@angular/core";
import { Resolve, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { catchError } from "rxjs";
import { EmailVerifyService } from "./email-verify.service";

@Injectable({
  providedIn: "root",
})
export class EmailVerifyResolver {
  constructor(
    private emailVerifyService: EmailVerifyService, // Injectez votre service ici
    private router: Router
  ) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): any {
    const id = parseInt(route.paramMap.get("id")!);
    const email = route.paramMap.get("email")!;
    const hash = route.paramMap.get("hash")!;
    const expires = route.queryParams["expires"];
    const signature = route.queryParams["signature"];

    return this.emailVerifyService
      .verify(id, hash, email, expires, signature)
      .pipe(
        catchError((error) => {
          const errorMessage = error.error.message;
          this.emailVerifyService.setData(errorMessage);
          throw error; // Vous devez également rejeter l'erreur ici pour que le Resolver indique une résolution en échec
        })
      );
  }
}
