import { Store } from "./Store";
import { User } from "./User";

export interface Manager{
    id:number|null;
    user_id:number;
    store_id:number;
    user:User;
    store:Store;
}

