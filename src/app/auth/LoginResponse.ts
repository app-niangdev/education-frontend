import { User } from "../interfaces_ancien/User";

export interface LoginResponse{
  isAuthenticated: boolean,
	message: string,
	user: User,
	type: string
}
