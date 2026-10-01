import { PaginationMeta } from "../response-type/Type";

export interface Customer{
    id:number;
    name:string;
    address:string;
    phone:string;
    email:string;
    tenant_id:string;
  }

  export type ResponseCustomer = {
    data:Customer[];
    meta:PaginationMeta
  }
