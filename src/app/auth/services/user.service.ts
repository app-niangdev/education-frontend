import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User, UserResponse } from 'src/app/interfaces/User';
import { LaravelApiResponse, ResponseMessage } from 'src/app/response-type/Type';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private base_url = environment.apiUrl;
  private http = inject(HttpClient);

  getUsers(
    searchTerm?: string,
    page?: number,
    perPage?: number,
    searchStatus?: string
  ): Observable<UserResponse> {
    let params = new HttpParams();

    if (page) params = params.set('page', page.toString());
    if (perPage) params = params.set('per_page', perPage.toString());
    if (searchTerm) params = params.set('search', searchTerm);
    if (searchStatus) params = params.set('searchStatus', searchStatus);

    return this.http.get<UserResponse>(`${this.base_url}/user/list`, {
      params
    });
  }

  disableUser(id: number): Observable<ResponseMessage> {
    return this.http.get<ResponseMessage>(
      `${this.base_url}/user/disable/${id}`
    );
  }

  addUser(data: User): Observable<ResponseMessage> {
    return this.http.post<ResponseMessage>(`${this.base_url}/user/add`, data);
  }

  updateUser(id: number, data: User): Observable<ResponseMessage> {
    return this.http.put<ResponseMessage>(
      `${this.base_url}/user/update/${id}`,
      data
    );
  }

  updateUserProfile(id: number, data: FormData): Observable<ResponseMessage> {
    return this.http.post<ResponseMessage>(
      `${this.base_url}/user/update/${id}`,
      data
    );
  }

  deleteUser(id: number): Observable<ResponseMessage> {
    return this.http.delete<ResponseMessage>(
      `${this.base_url}/user/delete/${id}`
    );
  }

  /**
   * Réinitialise les accès d'un membre du personnel.
   *
   * `id` est celui du compte utilisateur (`user_id`), pas celui de la fiche
   * métier : un trésorier n°3 et un enseignant n°3 sont deux comptes distincts.
   *
   * Le mot de passe n'est pas modifié ici — l'intéressé reçoit un lien et
   * choisit lui-même le sien. L'ancien reste valable en attendant.
   */
  reinitialiserAcces(id: number): Observable<LaravelApiResponse<null>> {
    return this.http.post<LaravelApiResponse<null>>(
      `${this.base_url.replace(/\/+$/, '')}/users/reinitialiser-acces/${id}`,
      {}
    );
  }

  // getRoles():Observable<RoleResponse>{
  //   return this.http.get<RoleResponse>(`${this.base_url}/roles`);
  // }
}
