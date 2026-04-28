import { getAllTenants, getTenantById } from "./repository";

export const fetchAllTenants = () => {
  return getAllTenants();
};

export const fetchTenantById = (id: string) => {
  return getTenantById(id);
};
